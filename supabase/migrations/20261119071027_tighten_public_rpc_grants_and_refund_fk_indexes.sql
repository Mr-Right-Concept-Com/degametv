REVOKE ALL ON FUNCTION public.authorize_screening_ticket_playback(uuid,text,text,text) FROM anon;
REVOKE ALL ON FUNCTION public.register_release_domain(uuid,text,text,jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.sync_release_domain_root() FROM PUBLIC,anon,authenticated;

CREATE INDEX IF NOT EXISTS payment_refunds_live_ticket_id_idx ON public.payment_refunds(live_ticket_id);
CREATE INDEX IF NOT EXISTS payment_refunds_requested_by_idx ON public.payment_refunds(requested_by);
CREATE INDEX IF NOT EXISTS payment_refunds_ticket_id_idx ON public.payment_refunds(ticket_id);