import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ShieldCheck, Upload, Loader2, CheckCircle, Clock, AlertCircle, ScanFace } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const kycSchema = z.object({
  kyc_full_name: z.string().trim().min(3, 'Full legal name required').max(120),
  kyc_id_type: z.enum(['nin', 'passport', 'drivers_license', 'voters_card'], {
    errorMap: () => ({ message: 'Select an ID type' }),
  }),
  kyc_id_url: z.string().url('Upload your government-issued ID'),
  kyc_selfie_url: z.string().url('Upload a selfie holding your ID'),
});

interface Profile {
  kyc_status: string | null;
  kyc_id_type: string | null;
  kyc_id_url: string | null;
  kyc_selfie_url: string | null;
  kyc_full_name: string | null;
  kyc_submitted_at: string | null;
  kyc_verified_at: string | null;
}

interface Props {
  onVerified?: () => void;
  compact?: boolean;
}

export function KYCVerification({ onVerified, compact }: Props) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingId, setUploadingId] = useState(false);
  const [uploadingSelfie, setUploadingSelfie] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    kyc_full_name: '',
    kyc_id_type: '',
    kyc_id_url: '',
    kyc_selfie_url: '',
  });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('kyc_status, kyc_id_type, kyc_id_url, kyc_selfie_url, kyc_full_name, kyc_submitted_at, kyc_verified_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      setProfile(data as Profile);
      setForm({
        kyc_full_name: data.kyc_full_name || '',
        kyc_id_type: data.kyc_id_type || '',
        kyc_id_url: data.kyc_id_url || '',
        kyc_selfie_url: data.kyc_selfie_url || '',
      });
      if (data.kyc_status === 'verified') onVerified?.();
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const upload = async (file: File, kind: 'id' | 'selfie') => {
    if (!user) return;
    const set = kind === 'id' ? setUploadingId : setUploadingSelfie;
    set(true);
    try {
      if (file.size > 10 * 1024 * 1024) { toast.error('Max 10MB'); return; }
      const ext = file.name.split('.').pop();
      const path = `kyc/${user.id}/${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('content-uploads').upload(path, file, { upsert: true });
      if (error) { toast.error('Upload failed'); return; }
      const { data: urlData } = supabase.storage.from('content-uploads').getPublicUrl(path);
      setForm(f => ({ ...f, [kind === 'id' ? 'kyc_id_url' : 'kyc_selfie_url']: urlData.publicUrl }));
      toast.success(`${kind === 'id' ? 'ID' : 'Selfie'} uploaded`);
    } finally { set(false); }
  };

  const submit = async () => {
    if (!user) return;
    const result = kycSchema.safeParse(form);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.errors.forEach(e => { errs[e.path[0] as string] = e.message; });
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);
    // Submit for admin review (NOT auto-verified)
    const { error } = await supabase
      .from('profiles')
      .update({
        ...result.data,
        kyc_status: 'pending',
        kyc_submitted_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);
    if (error) { toast.error('Submission failed: ' + error.message); setSubmitting(false); return; }
    toast.success('Application submitted! Our team will review within 24–48 hours.');
    await load();
    setSubmitting(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  if (profile?.kyc_status === 'verified') {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-green-500" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Identity Verified</p>
            <p className="text-xs text-muted-foreground">Your films are auto-approved for publishing</p>
          </div>
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">KYC ✓</Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={compact ? '' : 'border-primary/30'}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ScanFace className="w-4 h-4 text-primary" />
          Identity Verification (KYC) Required
        </CardTitle>
        <CardDescription className="text-xs">
          For piracy protection and platform security, verify your identity once. After verification, your film uploads are <strong>instantly approved</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {profile?.kyc_status === 'rejected' && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>Previous verification was rejected. Please resubmit with clear photos.</p>
          </div>
        )}

        <div className="space-y-2">
          <Label>Full Legal Name <span className="text-destructive">*</span></Label>
          <Input value={form.kyc_full_name} onChange={e => setForm(f => ({ ...f, kyc_full_name: e.target.value }))} placeholder="As it appears on your ID" />
          {errors.kyc_full_name && <p className="text-xs text-destructive">{errors.kyc_full_name}</p>}
        </div>

        <div className="space-y-2">
          <Label>ID Type <span className="text-destructive">*</span></Label>
          <Select value={form.kyc_id_type} onValueChange={v => setForm(f => ({ ...f, kyc_id_type: v }))}>
            <SelectTrigger><SelectValue placeholder="Select ID" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nin">National ID (NIN)</SelectItem>
              <SelectItem value="passport">International Passport</SelectItem>
              <SelectItem value="drivers_license">Driver's License</SelectItem>
              <SelectItem value="voters_card">Voter's Card</SelectItem>
            </SelectContent>
          </Select>
          {errors.kyc_id_type && <p className="text-xs text-destructive">{errors.kyc_id_type}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">Photo of ID <span className="text-destructive">*</span></Label>
            {form.kyc_id_url ? (
              <img src={form.kyc_id_url} alt="ID" className="w-full h-28 object-cover rounded-lg border" />
            ) : (
              <div className="w-full h-28 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground text-xs">No ID uploaded</div>
            )}
            <label>
              <Button type="button" variant="outline" size="sm" className="w-full" disabled={uploadingId} asChild>
                <span>{uploadingId ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Upload className="w-3 h-3 mr-2" />}{form.kyc_id_url ? 'Replace' : 'Upload ID'}</span>
              </Button>
              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && upload(e.target.files[0], 'id')} />
            </label>
            {errors.kyc_id_url && <p className="text-xs text-destructive">{errors.kyc_id_url}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Selfie with ID <span className="text-destructive">*</span></Label>
            {form.kyc_selfie_url ? (
              <img src={form.kyc_selfie_url} alt="Selfie" className="w-full h-28 object-cover rounded-lg border" />
            ) : (
              <div className="w-full h-28 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground text-xs">No selfie uploaded</div>
            )}
            <label>
              <Button type="button" variant="outline" size="sm" className="w-full" disabled={uploadingSelfie} asChild>
                <span>{uploadingSelfie ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Upload className="w-3 h-3 mr-2" />}{form.kyc_selfie_url ? 'Replace' : 'Upload Selfie'}</span>
              </Button>
              <input type="file" accept="image/*" capture="user" className="hidden" onChange={e => e.target.files?.[0] && upload(e.target.files[0], 'selfie')} />
            </label>
            {errors.kyc_selfie_url && <p className="text-xs text-destructive">{errors.kyc_selfie_url}</p>}
          </div>
        </div>

        <Button onClick={submit} disabled={submitting} className="w-full rounded-full">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
          {submitting ? 'Verifying...' : 'Verify Identity'}
        </Button>
        <p className="text-[10px] text-muted-foreground text-center">
          <Clock className="w-3 h-3 inline mr-1" />Instant verification. Your data is encrypted and used only for compliance.
        </p>
      </CardContent>
    </Card>
  );
}
