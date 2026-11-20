import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { invokeFn } from "@/lib/invokeFn";
import { Building2, User, Loader2 } from "lucide-react";

const businessSchema = z.object({
  company_name: z.string().trim().min(2, "Company name required").max(150),
  cac_number: z.string().trim().min(3).max(80),
  tax_id: z.string().trim().min(6).max(30),
  bank_name: z.string().trim().min(2).max(100),
  bank_account_number: z.string().trim().regex(/^\d{6,34}$/, "Enter a valid account number"),
  bank_account_name: z.string().trim().min(2).max(150),
  business_address: z.string().trim().min(5).max(240),
  business_city: z.string().trim().min(2).max(120),
  business_region: z.string().trim().max(120),
  business_postal_code: z.string().trim().max(32),
  registration_country: z.string().regex(/^[A-Z]{2}$/),
  bank_country: z.string().regex(/^[A-Z]{2}$/),
  rights_declared: z.literal(true, { errorMap: () => ({ message: "You must declare distribution rights" }) }),
});
type BusinessData = z.infer<typeof businessSchema>;
type Acct = { tier: string; status: string } | null;
type RpcResult = { data: unknown; error: { message: string } | null };
interface StudioRpcClient {
  rpc(name: "get_my_studio_account"): Promise<RpcResult>;
  rpc(name: "submit_my_studio_account", args: { p_tier: "creator" | "business" }): Promise<RpcResult>;
  rpc(name: "submit_business_verification", args: {
    p_legal_business_name: string; p_registration_country: string; p_registration_number: string;
    p_registration_document_path: string; p_business_address: string; p_business_city: string;
    p_business_region: string | null; p_business_postal_code: string | null; p_bank_name: string;
    p_bank_account_number: string; p_bank_account_name: string; p_bank_country: string; p_tax_identifier: string;
  }): Promise<RpcResult>;
}
const studioRpc = supabase as unknown as StudioRpcClient;
const accountResponseSchema = z.array(z.object({ tier: z.string(), status: z.string() })).max(1);
const verificationResponseSchema = z.object({ success: z.literal(true), verification_id: z.string().uuid(), status: z.string(), mode: z.string() });
const submissionResponseSchema = z.array(z.object({ tier: z.string(), status: z.string() })).min(1).max(1);
const providerResponseSchema = z.object({ status: z.string().optional(), providerConfigured: z.boolean().optional(), studioActivated: z.boolean().optional() });

export function TierUpgradeCard() {
  const { user } = useAuth();
  const [acct, setAcct] = useState<Acct>(null);
  const [accountError, setAccountError] = useState(false);
  const [tier, setTier] = useState<"creator" | "business">("creator");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ company_name: "", cac_number: "", tax_id: "", bank_name: "", bank_account_number: "", bank_account_name: "", business_address: "", business_city: "", business_region: "", business_postal_code: "", registration_country: "NG", bank_country: "NG", rights_declared: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const mounted = useRef(false);
  const loadGeneration = useRef(0);

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    if (!user) {
      if (mounted.current) { setAcct(null); setAccountError(false); setLoadingState(false); }
      return;
    }
    try {
      const { data, error } = await studioRpc.rpc("get_my_studio_account");
      if (!mounted.current || generation !== loadGeneration.current) return;
      const parsed = accountResponseSchema.safeParse(data);
      if (error || !parsed.success) { setAccountError(true); return; }
      setAccountError(false);
      const account = parsed.data[0] ?? null;
      setAcct(account);
      if (account?.tier === "business") setTier("business");
    } catch {
      if (mounted.current && generation === loadGeneration.current) setAccountError(true);
    } finally {
      if (mounted.current && generation === loadGeneration.current) setLoadingState(false);
    }
  }, [user]);
  const [accountLoading, setLoadingState] = useState(true);
  useEffect(() => {
    mounted.current = true;
    setLoadingState(true);
    void load();
    return () => { mounted.current = false; loadGeneration.current += 1; };
  }, [load]);

  const submit = async () => {
    if (!user || busy) return;
    setErrors({});
    if (acct?.status === "approved") {
      toast.message("Your studio is already approved. Contact support to change your studio tier.");
      return;
    }
    let businessData: BusinessData | null = null;
    if (tier === "business") {
      const parsed = businessSchema.safeParse(f);
      if (!parsed.success) {
        const nextErrors: Record<string, string> = {};
        parsed.error.issues.forEach(issue => { nextErrors[String(issue.path[0])] = issue.message; });
        setErrors(nextErrors);
        return;
      }
      if (!file) { setErrors({ cac_doc: "Upload your CAC certificate" }); return; }
      if (file.size <= 0 || file.size > 10 * 1024 * 1024) { setErrors({ cac_doc: "File must be under 10MB" }); return; }
      businessData = parsed.data;
    }
    setBusy(true);
    let uploadedPath: string | null = null;
    try {
      let businessVerificationId: string | undefined;
      if (tier === "business" && file && businessData) {
        const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
        if (!allowed.includes(file.type) || file.size <= 0 || file.size > 10 * 1024 * 1024) throw new Error("Upload a PDF or clear image under 10 MB.");
        uploadedPath = `${user.id}/registration/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const { error: uploadError } = await supabase.storage.from("kyb-docs").upload(uploadedPath, file, { contentType: file.type, cacheControl: "0", upsert: false });
        if (uploadError) throw uploadError;
        const { data: verificationData, error: verificationError } = await studioRpc.rpc("submit_business_verification", {
          p_legal_business_name: businessData.company_name,
          p_registration_country: businessData.registration_country,
          p_registration_number: businessData.cac_number,
          p_registration_document_path: uploadedPath,
          p_business_address: businessData.business_address,
          p_business_city: businessData.business_city,
          p_business_region: businessData.business_region || null,
          p_business_postal_code: businessData.business_postal_code || null,
          p_bank_name: businessData.bank_name,
          p_bank_account_number: businessData.bank_account_number,
          p_bank_account_name: businessData.bank_account_name,
          p_bank_country: businessData.bank_country,
          p_tax_identifier: businessData.tax_id,
        });
        const verification = verificationResponseSchema.safeParse(verificationData);
        if (verificationError || !verification.success) throw new Error(verificationError?.message || "Business verification returned an invalid response.");
        businessVerificationId = verification.data.verification_id;
        uploadedPath = null;
      }
      const { data: submissionData, error: submissionError } = await studioRpc.rpc("submit_my_studio_account", { p_tier: tier });
      const submission = submissionResponseSchema.safeParse(submissionData);
      if (submissionError || !submission.success) throw new Error(submissionError?.message || "Studio application returned an invalid response.");
      if (tier === "business" && businessVerificationId) {
        const providerRun = await invokeFn<unknown>("run-business-provider", { verificationId: businessVerificationId });
        const providerResult = providerResponseSchema.safeParse(providerRun.data);
        if (providerRun.ok && providerResult.success && providerResult.data.studioActivated) toast.success("Business and bank checks passed. Studio is activated.");
        else toast.success("Business application submitted. Provider checks or manual review are pending.");
      } else {
        toast.success(tier === "business" ? "Business verification submitted securely for review." : "Creator tier selected — pending review");
      }
      void load();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Studio application could not be submitted.";
      toast.error(message);
      if (uploadedPath) {
        const { error: cleanupError } = await supabase.storage.from("kyb-docs").remove([uploadedPath]);
        if (cleanupError) toast.error("The failed application upload could not be cleaned up. Contact support.");
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const field = (key: keyof typeof f, label: string, type = "text") => (
    <div className="space-y-1">
      <Label htmlFor={key}>{label}</Label>
      <Input id={key} type={type} value={String(f[key])} onChange={event => setF(current => ({ ...current, [key]: type === "number" ? Number(event.target.value) : event.target.value }))} />
      {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2"><CardTitle className="text-lg">Studio tier</CardTitle>{acct && <Badge variant="secondary">{acct.tier} · {acct.status}</Badge>}</div>
        <CardDescription>Creator: 10% platform fee. Business: 7.5% fee, multi-seat team, requires business verification (KYB).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {accountError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">We could not verify your studio status. Your application is safe; please refresh shortly or contact support.</p>}
        {accountLoading && <p className="text-xs text-muted-foreground">Checking studio status…</p>}
        <div className="grid grid-cols-2 gap-3">
          {([["creator", "Creator", User, "Solo / indie filmmaker"], ["business", "Business", Building2, "Studio or company"]] as const).map(([value, label, Icon, description]) => (
            <button key={value} type="button" aria-pressed={tier === value} onClick={() => setTier(value)} className={`rounded-xl border p-3 text-left transition ${tier === value ? "border-primary bg-primary/5" : "border-border"}`}>
              <Icon className="w-5 h-5 text-primary mb-1" /><p className="font-semibold text-sm">{label}</p><p className="text-xs text-muted-foreground">{description}</p>
            </button>
          ))}
        </div>
        {tier === "business" && <div className="grid sm:grid-cols-2 gap-3">
          {field("company_name", "Registered company name")}{field("registration_country", "Registration country (ISO-2)")}{field("cac_number", "Business registration number")}{field("tax_id", "Tax ID (TIN)")}{field("business_address", "Registered business address")}{field("business_city", "City")}{field("business_region", "State / Region")}{field("business_postal_code", "Postal code")}{field("bank_country", "Bank country (ISO-2)")}{field("bank_name", "Corporate bank")}{field("bank_account_number", "Account number")}{field("bank_account_name", "Account name")}
          <div className="space-y-1"><Label htmlFor="cac_doc">Business registration certificate (PDF/image)</Label><Input id="cac_doc" type="file" accept=".pdf,image/*" onChange={event => setFile(event.target.files?.[0] || null)} />{errors.cac_doc && <p className="text-xs text-destructive">{errors.cac_doc}</p>}</div>
          <div className="sm:col-span-2 flex items-start gap-2"><Checkbox id="rights" checked={f.rights_declared} onCheckedChange={checked => setF(current => ({ ...current, rights_declared: checked === true }))} /><Label htmlFor="rights" className="text-sm font-normal leading-snug">I declare my company owns or licenses the distribution rights for all content it premieres.</Label></div>
          {errors.rights_declared && <p className="text-xs text-destructive sm:col-span-2">{errors.rights_declared}</p>}
        </div>}
        <Button onClick={() => void submit()} disabled={busy || accountLoading || accountError || acct?.status === "approved"} className="rounded-full w-full sm:w-auto">{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{acct?.status === "approved" ? "Studio approved" : acct ? "Resubmit for review" : "Submit tier"}</Button>
      </CardContent>
    </Card>
  );
}