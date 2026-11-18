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
  kyc_id_type: z.enum(['national_id', 'nin', 'passport', 'drivers_license', 'voters_card', 'residence_permit'], {
    errorMap: () => ({ message: 'Select an ID type' }),
  }),
  kyc_id_url: z.string().min(1, 'Upload your government-issued ID'),
  kyc_selfie_url: z.string().min(1, 'Upload your selfie liveness video'),
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
    kyc_selfie_url: '', country_code: 'NG', date_of_birth: '', address_line: '', address_city: '', address_region: '', address_postal_code: '',
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
    if (!user) { toast.error('Sign in before uploading identity documents.'); return; }
    const allowed = kind === 'id' ? ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] : ['video/mp4', 'video/webm', 'video/quicktime'];
    const maxSize = kind === 'id' ? 10 * 1024 * 1024 : 100 * 1024 * 1024;
    if (!allowed.includes(file.type) || file.size <= 0 || file.size > maxSize) {
      toast.error(kind === 'id' ? 'Use a supported ID image or PDF under 10 MB.' : 'Use an MP4, WebM or MOV selfie video under 100 MB.');
      return;
    }
    const setUploading = kind === 'id' ? setUploadingId : setUploadingSelfie;
    setUploading(true);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase() || (file.type === 'application/pdf' ? 'pdf' : 'jpg');
      const path = `${user.id}/kyc/${kind}-${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from('identity-documents').upload(path, file, {
        contentType: file.type, cacheControl: '0', upsert: false,
      });
      if (error) throw error;
      setForm(current => ({ ...current, [kind === 'id' ? 'kyc_id_url' : 'kyc_selfie_url']: path }));
      toast.success(kind === 'id' ? 'Identity document uploaded securely.' : 'Selfie liveness video uploaded securely.');
    } catch {
      toast.error('Upload failed. Your document was not submitted; please retry.');
    } finally {
      setUploading(false);
    }
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
    const { data, error } = await supabase.rpc('submit_identity_verification' as never, {
      p_country_code: form.country_code,
      p_document_type: result.data.kyc_id_type,
      p_full_name: result.data.kyc_full_name,
      p_document_path: result.data.kyc_id_url,
      p_selfie_video_path: result.data.kyc_selfie_url,
      p_date_of_birth: form.date_of_birth || null,
      p_address_line: form.address_line || null,
      p_address_city: form.address_city || null,
      p_address_region: form.address_region || null,
      p_address_postal_code: form.address_postal_code || null,
    } as never);
    if (error || !(data as { success?: boolean } | null)?.success) {
      toast.error(data?.error || 'Submission failed. Your application has not been submitted.');
      setSubmitting(false);
      return;
    }
    toast.success('Application submitted for identity review.');
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
            <p className="font-semibold text-sm">Approved Filmmaker</p>
            <p className="text-xs text-muted-foreground">You can now access the Studio and upload films</p>
          </div>
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">Verified ✓</Badge>
        </CardContent>
      </Card>
    );
  }

  if (profile?.kyc_status === 'pending') {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Application Under Review</p>
            <p className="text-xs text-muted-foreground">Your identity evidence is queued for the configured verification workflow. If no provider is connected, an administrator will review it.</p>
          </div>
          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">Pending</Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={compact ? '' : 'border-primary/30'}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ScanFace className="w-4 h-4 text-primary" />
          Filmmaker Application — Verify Identity
        </CardTitle>
        <CardDescription className="text-xs">
          To become a DeGameTV creator, submit your country-issued identity document and a short selfie video. Liveness and document matching require a configured verification provider; otherwise the application remains pending for manual review. After approval you unlock the Studio to upload and schedule premieres.
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
          <Label>Country of document</Label>
          <Select value={form.country_code} onValueChange={v => setForm(f => ({ ...f, country_code: v, kyc_id_type: '' }))}>
            <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
              {['NG','GH','KE','ZA','UG','TZ','RW','US','GB','CA','IN','AE'].map(code => <SelectItem key={code} value={code}>{({NG:'Nigeria',GH:'Ghana',KE:'Kenya',ZA:'South Africa',UG:'Uganda',TZ:'Tanzania',RW:'Rwanda',US:'United States',GB:'United Kingdom',CA:'Canada',IN:'India',AE:'United Arab Emirates'} as Record<string,string>)[code]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Label>Date of birth</Label><Input type="date" value={form.date_of_birth} onChange={e => setForm(f => ({...f,date_of_birth:e.target.value}))} />
          <Label>Residential address</Label><Input value={form.address_line} onChange={e => setForm(f => ({...f,address_line:e.target.value}))} />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="City" value={form.address_city} onChange={e => setForm(f => ({...f,address_city:e.target.value}))} />
            <Input placeholder="State / Region" value={form.address_region} onChange={e => setForm(f => ({...f,address_region:e.target.value}))} />
          </div>
          <Input placeholder="Postal code" value={form.address_postal_code} onChange={e => setForm(f => ({...f,address_postal_code:e.target.value}))} />
          <Label>Full Legal Name <span className="text-destructive">*</span></Label>
          <Input value={form.kyc_full_name} onChange={e => setForm(f => ({ ...f, kyc_full_name: e.target.value }))} placeholder="As it appears on your ID" />
          {errors.kyc_full_name && <p className="text-xs text-destructive">{errors.kyc_full_name}</p>}
        </div>

        <div className="space-y-2">
          <Label>Country: {form.country_code} — ID Type <span className="text-destructive">*</span></Label>
          <Select value={form.kyc_id_type} onValueChange={v => setForm(f => ({ ...f, kyc_id_type: v }))}>
            <SelectTrigger><SelectValue placeholder="Select ID" /></SelectTrigger>
            <SelectContent>
              {form.country_code === 'NG' && <SelectItem value="nin">National ID (NIN)</SelectItem>}
              <SelectItem value="national_id">National identity card</SelectItem>
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
            <div className="w-full h-28 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground text-xs px-2 text-center">
              {form.kyc_id_url ? 'Identity document uploaded securely' : 'No ID uploaded'}
            </div>
            <label>
              <Button type="button" variant="outline" size="sm" className="w-full" disabled={uploadingId} asChild>
                <span>{uploadingId ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Upload className="w-3 h-3 mr-2" />}{form.kyc_id_url ? 'Replace' : 'Upload ID'}</span>
              </Button>
              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" disabled={uploadingId} onChange={e => e.target.files?.[0] && upload(e.target.files[0], 'id')} />
            </label>
            {errors.kyc_id_url && <p className="text-xs text-destructive">{errors.kyc_id_url}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Selfie liveness video <span className="text-destructive">*</span></Label>
            <div className="w-full h-28 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground text-xs px-2 text-center">
              {form.kyc_selfie_url ? 'Selfie video uploaded securely' : 'No selfie uploaded'}
            </div>
            <label>
              <Button type="button" variant="outline" size="sm" className="w-full" disabled={uploadingSelfie} asChild>
                <span>{uploadingSelfie ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Upload className="w-3 h-3 mr-2" />}{form.kyc_selfie_url ? 'Replace' : 'Upload selfie video'}</span>
              </Button>
              <input type="file" accept="video/mp4,video/webm,video/quicktime" capture="user" className="hidden" disabled={uploadingSelfie} onChange={e => e.target.files?.[0] && upload(e.target.files[0], 'selfie')} />
            </label>
            {errors.kyc_selfie_url && <p className="text-xs text-destructive">{errors.kyc_selfie_url}</p>}
          </div>
        </div>

        <Button onClick={submit} disabled={submitting} className="w-full rounded-full">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
          {submitting ? 'Submitting...' : 'Submit Application'}
        </Button>
        <p className="text-[10px] text-muted-foreground text-center">
          <Clock className="w-3 h-3 inline mr-1" />Your private identity evidence is restricted to verification and compliance review.
        </p>
      </CardContent>
    </Card>
  );
}
