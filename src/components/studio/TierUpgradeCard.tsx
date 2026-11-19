import { useEffect, useState } from 'react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { invokeFn } from '@/lib/invokeFn';
import { Building2, User, Loader2 } from 'lucide-react';

const businessSchema = z.object({
  company_name: z.string().trim().min(2, 'Company name required').max(150),
  cac_number: z.string().trim().min(3).max(80),
  tax_id: z.string().trim().min(6, 'Tax ID required').max(30),
  bank_name: z.string().trim().min(2).max(100),
  bank_account_number: z.string().trim().regex(/^\d{6,34}$/, 'Enter a valid account number'),
  bank_account_name: z.string().trim().min(2).max(150),
  seats: z.number().int().min(1).max(50),
  business_address: z.string().trim().min(5).max(240),
  business_city: z.string().trim().min(2).max(120),
  business_region: z.string().trim().max(120),
  business_postal_code: z.string().trim().max(32),
  registration_country: z.string().regex(/^[A-Z]{2}$/), bank_country: z.string().regex(/^[A-Z]{2}$/),
  rights_declared: z.literal(true, { errorMap: () => ({ message: 'You must declare distribution rights' }) }),
});

type Acct = { tier: string; status: string } | null;

export function TierUpgradeCard() {
  const { user } = useAuth();
  const [acct, setAcct] = useState<Acct>(null);
  const [accountError, setAccountError] = useState(false);
  const [tier, setTier] = useState<'creator' | 'business'>('creator');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ company_name: '', cac_number: '', tax_id: '', bank_name: '', bank_account_number: '', bank_account_name: '', business_address: '', business_city: '', business_region: '', business_postal_code: '', registration_country: 'NG', bank_country: 'NG', seats: 1, rights_declared: false });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = async () => {
    if (!user) return;
    const { data, error } = await supabase.rpc('get_my_studio_account');
    if (error) { setAccountError(true); return; }
    setAccountError(false);
    const account = data?.[0] ?? null;
    setAcct(account ? { tier: account.tier, status: account.status } : null);
    if (account?.tier === 'business') setTier('business');
  };
  useEffect(() => { load(); }, [user?.id]);

  const submit = async () => {
    if (!user) return;
    setErrors({});
    if (acct?.status === 'approved') {
      toast.message('Your studio is already approved. Contact support to change your studio tier.');
      return;
    }
    let businessData: z.infer<typeof businessSchema> | null = null;
    if (tier === 'business') {
      const r = businessSchema.safeParse(f);
      if (!r.success) {
        const e: Record<string, string> = {};
        r.error.issues.forEach(i => { e[String(i.path[0])] = i.message; });
        setErrors(e); return;
      }
      if (!file) { setErrors({ cac_doc: 'Upload your CAC certificate' }); return; }
      if (file.size > 10 * 1024 * 1024) { setErrors({ cac_doc: 'Max 10MB' }); return; }
      businessData = r.data;
    }
    setBusy(true);
    try {
      let businessVerificationId: string | undefined;
      if (tier === 'business' && file && businessData) {
        const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.type) || file.size <= 0 || file.size > 10 * 1024 * 1024) throw new Error('Upload a PDF or clear image under 10 MB.');
        const path = `${user.id}/registration/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, '_')}`;
        const { error: upErr } = await supabase.storage.from('kyb-docs').upload(path, file, {
          contentType: file.type, cacheControl: '0', upsert: false,
        });
        if (upErr) throw upErr;
        const { data: verificationData, error: verificationError } = await supabase.rpc('submit_business_verification' as never, {
          p_legal_business_name: businessData.company_name,
          p_registration_country: businessData.registration_country,
          p_registration_number: businessData.cac_number,
          p_registration_document_path: path,
          p_business_address: businessData.business_address,
          p_business_city: businessData.business_city,
          p_business_region: businessData.business_region || null,
          p_business_postal_code: businessData.business_postal_code || null,
          p_bank_name: businessData.bank_name,
          p_bank_account_number: businessData.bank_account_number,
          p_bank_account_name: businessData.bank_account_name,
          p_bank_country: businessData.bank_country,
          p_tax_identifier: businessData.tax_id,
        } as never);
        if (verificationError) throw verificationError;
        businessVerificationId = (verificationData as { verification_id?: string } | null)?.verification_id;
      }
      const { error } = await supabase.rpc('submit_my_studio_account' as never, {
        p_tier: tier,
      } as never);
      if (error) throw error;
      if (tier === 'business' && businessVerificationId) {
        const providerRun = await invokeFn<{ status?: string; providerConfigured?: boolean; studioActivated?: boolean }>('run-business-provider', { verificationId: businessVerificationId });
        if (providerRun.ok && providerRun.data?.studioActivated) toast.success('Business and bank checks passed. Studio is activated.');
        else toast.success('Business application submitted. Provider checks or manual review are pending.');
      } else {
        toast.success(tier === 'business' ? 'Business verification submitted securely for review.' : 'Creator tier selected — pending review');
      }
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  };

  const field = (k: keyof typeof f, label: string, type = 'text') => (
    <div className="space-y-1">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} type={type} value={String(f[k])}
        onChange={e => setF({ ...f, [k]: type === 'number' ? Number(e.target.value) : e.target.value })} />
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">Studio tier</CardTitle>
          {acct && <Badge variant="secondary">{acct.tier} · {acct.status}</Badge>}
        </div>
        <CardDescription>Creator: 10% platform fee. Business: 7.5% fee, multi-seat team, requires business verification (KYB).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {accountError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">We could not verify your studio status. Your application is safe; please refresh shortly or contact support.</p>}
        <div className="grid grid-cols-2 gap-3">
          {([['creator', 'Creator', User, 'Solo / indie filmmaker'], ['business', 'Business', Building2, 'Studio or company']] as const).map(([v, l, Icon, d]) => (
            <button key={v} type="button" aria-pressed={tier === v} onClick={() => setTier(v)}
              className={`rounded-xl border p-3 text-left transition ${tier === v ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <Icon className="w-5 h-5 text-primary mb-1" />
              <p className="font-semibold text-sm">{l}</p>
              <p className="text-xs text-muted-foreground">{d}</p>
            </button>
          ))}
        </div>

        {tier === 'business' && (
          <div className="grid sm:grid-cols-2 gap-3">
            {field('company_name', 'Registered company name')}
            {field('registration_country', 'Registration country (ISO-2)')}
          {field('cac_number', 'Business registration number')}
            {field('tax_id', 'Tax ID (TIN)')}
            {field('seats', 'Team seats', 'number')}
          {field('business_address', 'Registered business address')}
          {field('business_city', 'City')}
          {field('business_region', 'State / Region')}
          {field('business_postal_code', 'Postal code')}
            {field('bank_country', 'Bank country (ISO-2)')}
          {field('bank_name', 'Corporate bank')}
            {field('bank_account_number', 'Account number')}
            {field('bank_account_name', 'Account name')}
            <div className="space-y-1">
              <Label htmlFor="cac_doc">Business registration certificate (PDF/image)</Label>
              <Input id="cac_doc" type="file" accept=".pdf,image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
              {errors.cac_doc && <p className="text-xs text-destructive">{errors.cac_doc}</p>}
            </div>
            <div className="sm:col-span-2 flex items-start gap-2">
              <Checkbox id="rights" checked={f.rights_declared} onCheckedChange={v => setF({ ...f, rights_declared: v === true })} />
              <Label htmlFor="rights" className="text-sm font-normal leading-snug">I declare my company owns or licenses the distribution rights for all content it premieres.</Label>
            </div>
            {errors.rights_declared && <p className="text-xs text-destructive sm:col-span-2">{errors.rights_declared}</p>}
          </div>
        )}

        <Button onClick={submit} disabled={busy || accountError || acct?.status === 'approved'} className="rounded-full w-full sm:w-auto">
          {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {acct?.status === 'approved' ? 'Studio approved' : acct ? 'Resubmit for review' : 'Submit tier'}
        </Button>
      </CardContent>
    </Card>
  );
}
