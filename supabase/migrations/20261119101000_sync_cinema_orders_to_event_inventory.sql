-- Keep the same atomic inventory reservation lifecycle for the canonical
-- live-payment path and the legacy cinema checkout path until all clients
-- have migrated to one shared checkout endpoint.
DROP TRIGGER IF EXISTS guest_payment_order_event_reservation_sync ON public.guest_payment_orders;
CREATE TRIGGER guest_payment_order_event_reservation_sync
AFTER UPDATE OF status ON public.guest_payment_orders
FOR EACH ROW EXECUTE FUNCTION public.sync_event_ticket_reservation_payment();
