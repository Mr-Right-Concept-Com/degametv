revoke all on public.audit_logs,public.payments,public.tickets,public.screening_tickets,public.user_roles from anon;
revoke insert,update,delete,truncate,references,trigger on public.audit_logs,public.payments,public.tickets,public.screening_tickets from authenticated;
grant select on public.audit_logs,public.payments,public.tickets,public.screening_tickets to authenticated;
