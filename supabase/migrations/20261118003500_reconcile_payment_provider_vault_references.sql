update public.payment_provider_configs p
set test_secret_ref=s.id,updated_at=now()
from vault.secrets s
where s.name='degame-'||p.provider||'-test-secret'
and p.test_secret_ref is null;