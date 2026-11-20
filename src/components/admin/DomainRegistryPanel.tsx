import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { invokeFn } from "@/lib/invokeFn";

const DomainSchema = z.object({
  id: z.string().uuid(),
  content_id: z.string().uuid(),
  hostname: z.string(),
  domain_kind: z.string(),
  status: z.string(),
  verification_status: z.string(),
  ssl_status: z.string(),
  verified_at: z.string().nullable(),
  ssl_certificate_expires_at: z.string().nullable(),
  verification_error: z.string().nullable(),
});
type Domain = z.infer<typeof DomainSchema>;

export function DomainRegistryPanel() {
  const [rows, setRows] = useState<Domain[]>([]);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    const result = await invokeFn<unknown>("domain-control", { action: "admin_list" });
    if (!result.ok) throw new Error(result.error ?? "Domain registry unavailable");
    const payload = z.object({ domains: z.array(DomainSchema) }).parse(result.data);
    if (currentRequest === requestId.current) setRows(payload.domains);
  }, []);

  useEffect(() => {
    void load().catch((error: unknown) => {
      if (error instanceof Error) window.alert(error.message);
      else window.alert("Domain registry unavailable.");
    });
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  async function suspend(row: Domain) {
    const value = reason[row.id]?.trim();
    if (!value || value.length < 5) {
      window.alert("Enter a suspension reason of at least five characters.");
      return;
    }
    setBusy(row.id);
    try {
      const result = await invokeFn<unknown>("domain-control", {
        action: "admin_suspend",
        domainId: row.id,
        reason: value,
      });
      if (!result.ok) throw new Error(result.error ?? "Domain suspension failed");
      await load();
    } catch (error: unknown) {
      window.alert(error instanceof Error ? error.message : "Domain suspension failed");
    } finally {
      setBusy("");
    }
  }

  async function verify(row: Domain) {
    setBusy(row.id);
    try {
      const result = await invokeFn<unknown>("domain-control", {
        action: "verify_dns",
        domainId: row.id,
      });
      if (!result.ok) throw new Error(result.error ?? "DNS verification failed");
      await load();
    } catch (error: unknown) {
      window.alert(error instanceof Error ? error.message : "DNS verification failed");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold">Production domain registry</h2>
        <p className="text-sm text-muted-foreground">
          Inspect hostname, DNS verification and SSL lifecycle. Domains are not active until the provider confirms certificate issuance.
        </p>
      </header>
      {rows.length === 0 ? (
        <p className="rounded-lg border p-6 text-sm text-muted-foreground">No production domains registered.</p>
      ) : rows.map((row) => (
        <article key={row.id} className="space-y-3 rounded-xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold">{row.hostname}</h3>
              <p className="text-xs text-muted-foreground">{row.domain_kind} · {row.id}</p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs">
              {row.verification_status || row.status} / SSL: {row.ssl_status}
            </span>
          </div>
          {row.verification_error && <p className="text-sm text-destructive">{row.verification_error}</p>}
          {row.ssl_certificate_expires_at && (
            <p className="text-xs text-muted-foreground">
              Certificate expires {new Date(row.ssl_certificate_expires_at).toLocaleString()}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              disabled={!!busy || row.domain_kind !== "custom_domain"}
              className="rounded-md border px-3 py-2 text-sm disabled:opacity-40"
              onClick={() => void verify(row)}
            >
              Recheck DNS / SSL
            </button>
            <input
              className="min-w-56 flex-1 rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Suspension reason"
              value={reason[row.id] ?? ""}
              onChange={(event) => setReason((current) => ({ ...current, [row.id]: event.target.value }))}
            />
            <button
              disabled={!!busy || row.status === "suspended"}
              onClick={() => void suspend(row)}
              className="rounded-md border border-destructive px-3 py-2 text-sm text-destructive"
            >
              Suspend domain
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
