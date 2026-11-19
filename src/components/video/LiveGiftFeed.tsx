import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Gift, Heart, Sparkles } from "lucide-react";

type GiftRow = { id: string; contribution_type: string; display_name: string; gift_catalog_key: string | null; message: string | null; amount_minor: number; currency: string; created_at: string };
const amountLabel = (minor: number, currency: string) => {
  try {
    const digits = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits;
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(minor / Math.pow(10, digits));
  } catch { return currency + " " + minor; }
};

export function LiveGiftFeed({ streamId }: { streamId: string }) {
  const [items, setItems] = useState<GiftRow[]>([]);
  useEffect(() => {
    let active = true;
    void supabase.from("event_live_gift_feed")
      .select("id,contribution_type,display_name,gift_catalog_key,message,amount_minor,currency,created_at")
      .eq("live_stream_id", streamId).order("created_at", { ascending: false }).limit(8)
      .then(({ data }) => { if (active && data) setItems(data as GiftRow[]); });
    const channel = supabase.channel("live-gifts:" + streamId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "event_live_gift_feed", filter: "live_stream_id=eq." + streamId }, payload => {
        if (!active) return;
        setItems(current => [payload.new as GiftRow, ...current].slice(0, 8));
      }).subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [streamId]);

  return <Card className="border-border/70">
    <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Gift className="h-4 w-4 text-primary"/>Fan support <Badge variant="secondary">{items.length}</Badge></CardTitle></CardHeader>
    <CardContent className="space-y-2">
      {items.length === 0 ? <p className="text-sm text-muted-foreground">Tips and gifts from viewers will appear here during the event.</p> :
        items.map(item => <div key={item.id} className="flex items-start gap-3 rounded-xl bg-secondary/50 p-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">{item.contribution_type === "gift" ? <Sparkles className="h-4 w-4 text-primary"/> : <Heart className="h-4 w-4 text-primary"/>}</div>
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">{item.display_name}{item.gift_catalog_key ? " sent " + item.gift_catalog_key : " supported the creator"}</p><span className="text-xs font-semibold">{amountLabel(item.amount_minor,item.currency)}</span></div>{item.message && <p className="mt-1 break-words text-xs text-muted-foreground">{item.message}</p>}</div>
        </div>)}
    </CardContent>
  </Card>;
}
