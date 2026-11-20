-- Copies the audit history into groundwork's table, oldest first so ids keep the same order.
-- The old actor was free text: 'system', 'api-key:vnt_…' for API calls, otherwise the admin.
-- An empty metadata object becomes null, which is how groundwork stores "no metadata".
insert into gw_audit_log (
  occurred_at, actor_type, actor_label, action, entity_type, entity_id, summary, metadata, ip
)
select
  created_at,
  case
    when actor = 'system' then 'system'
    when actor like 'api-key:%' then 'api_key'
    else 'user'
  end,
  actor, action, entity_type, entity_id, summary, nullif(metadata, '{}'::jsonb), ip
from audit_logs
order by created_at, id;
