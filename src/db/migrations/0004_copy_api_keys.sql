-- Copies every API key into groundwork's table, keeping its id, so api_requests and
-- security_events keep pointing at the same keys. key_hash and previous_key_hash still hold
-- HMAC(API_KEY_PEPPER, key); groundwork verifies those through legacyHash and upgrades each key
-- on first use. Countries live in metadata: groundwork has no country checks, this app does.
insert into gw_api_keys (
  id, name, description, prefix, key_hash, previous_key_hash, previous_key_expires_at,
  scopes, rate_limit, rate_limit_window, daily_quota, allowed_origins, allowed_ips, metadata,
  expires_at, revoked_at, revoked_reason, suspended_until, suspended_reason, rotated_at,
  last_used_at, last_used_ip, created_by, created_at, updated_at
)
select
  id, name, description, prefix, key_hash, previous_key_hash, previous_key_expires_at,
  scopes, rate_limit_per_minute, '1m', daily_quota, allowed_origins, allowed_ips,
  jsonb_build_object('expectedCountries', to_jsonb(expected_countries)),
  expires_at, revoked_at, revoked_reason, suspended_until, suspended_reason, rotated_at,
  last_used_at, last_used_ip, created_by, created_at, updated_at
from api_keys
on conflict (id) do nothing;
