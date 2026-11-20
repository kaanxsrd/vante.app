-- Moves waiting jobs to groundwork's queue in one statement, keeping their ids and attempts.
-- Jobs that were running when the old worker stopped are moved too, as pending: they never
-- finished, and notification delivery is safe to run again (a sent notification is skipped).
-- Finished jobs stay in the old table.
with moved as (
  delete from jobs
  where status in ('pending', 'running')
  returning id, type, payload, attempts, max_attempts, run_at, created_at
)
insert into gw_jobs (id, type, payload, attempts, max_attempts, run_at, created_at)
select id, type, payload, attempts, max_attempts, run_at, created_at
from moved;
