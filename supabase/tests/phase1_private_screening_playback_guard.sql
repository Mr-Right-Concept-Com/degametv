-- Legacy watch-code playback must enforce current invitation state for private screenings.
begin;
do $$
declare
  v_definition text;
  v_signature regprocedure := 'public.authorize_legacy_screening_ticket_playback(text,text,text,text,timestamptz)'::regprocedure;
begin
  select pg_get_functiondef(v_signature) into v_definition;
  if position('private_screening_invitation_required' in v_definition)=0
     or position('event_access_invites' in v_definition)=0
     or position('i.status=''accepted''' in v_definition)=0
     or position('i.accepted_at is not null' in v_definition)=0
     or position('i.expires_at>v_now' in v_definition)=0
     or position('i.invited_email' in v_definition)=0
     or position('i.invited_user_id=v_ticket.user_id' in v_definition)=0 then
    raise exception 'Private screening playback invitation guard is incomplete.';
  end if;
  if has_function_privilege('anon',v_signature,'EXECUTE')
     or has_function_privilege('authenticated',v_signature,'EXECUTE')
     or not has_function_privilege('service_role',v_signature,'EXECUTE') then
    raise exception 'Playback authorization RPC execution grants are not service-role-only.';
  end if;
end
$$;
rollback;
