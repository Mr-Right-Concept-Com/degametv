import { useEffect, useRef, useState } from 'react';
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
import { invokeFn } from '@/lib/invokeFn';
import { z } from 'zod';

const kycSchema = z.object({
  kyc_full_name: z.string().trim().min(3, 'Full legal name required').max(120),
  kyc_id_type: z.enum(['national_id', 'nin', 'passport', 'drivers_license', 'voters_card', 'residence_permit'], {
    errorMap: () => ({ message: 'Select an ID type' }),
  }),
  kyc_id_url: z.string().min(1, 'Upload your government-issued ID'),
  kyc_selfie_url: z.string().min(1, 'Upload your selfie liveness video'),
});

interface KycRpcClient {
 rpc(name:"submit_identity_verification",args:{p_country_code:string;p_document_type:string;p_full_name:string;p_document_path:string;p_selfie_video_path:string;p_date_of_birth:string|null;p_address_line:string|null;p_address_city:string|null;p_address_region:string|null;p_address_postal_code:string|null}):Promise<{data:unknown;error:{message:string}|null}>;
}
const kycRpc=supabase as unknown as KycRpcClient;
const submissionSchema=z.object({success:z.literal(true),verification_id:z.string().uuid(),status:z.string(),mode:z.string()});
const providerSchema=z.object({status:z.string().optional(),providerConfigured:z.boolean().optional(),creatorActivated:z.boolean().optional()});
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
  const mounted=useRef(false);
  const loadGeneration=useRef(0);
  const [form, setForm] = useState({
    kyc_full_name: '',
    kyc_id_type: '',
    kyc_id_url: '',
    kyc_selfie_url: '', country_code: 'NG', date_of_birth: '', address_line: '', address_city: '', address_region: '', address_postal_code: '',
  });

  const load = async () => {
    const generation=++loadGeneration.current;
    if (!user) { if(mounted.current)setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('kyc_status, kyc_id_type, kyc_id_url, kyc_selfie_url, kyc_full_name, kyc_submitted_at, kyc_verified_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!mounted.current || generation!==loadGeneration.current) return;
    if (error) { toast.error('Identity status could not be loaded.'); setLoading(false); return; }
    if (data) {
      setProfile(data as Profile);
      setForm(current => ({
        ...current,
        kyc_full_name: data.kyc_full_name || '',
        kyc_id_type: data.kyc_id_type || '',
        kyc_id_url: data.kyc_id_url || '',
        kyc_selfie_url: data.kyc_selfie_url || '',
      }));
      if (data.kyc_status === 'verified') onVerified?.();
    }
    if(mounted.current)setLoading(false);
  };

  useEffect(() => { mounted.current=true; void load(); return () => { mounted.current=false; loadGeneration.current+=1; }; }, [user?.id]);

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