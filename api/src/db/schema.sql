create extension if not exists pgcrypto;

create table if not exists orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists agent_tokens (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  token_hash text not null unique,
  agent_type text not null,
  label text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists intent_contracts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  agent_token_id uuid references agent_tokens(id) on delete set null,
  name text not null,
  natural_language text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  created_by text
);

create table if not exists policies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  contract_id uuid references intent_contracts(id) on delete cascade,
  rule_name text not null,
  resource text,
  resource_action text,
  reason text,
  condition text,
  action text not null check (action in ('ALLOW', 'BLOCK', 'REVIEW')),
  priority integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists decisions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  token_id uuid references agent_tokens(id) on delete set null,
  tool_name text not null,
  tool_input jsonb not null,
  decision text not null check (decision in ('allow', 'block', 'review')),
  reason text,
  matched_policy_id uuid references policies(id) on delete set null,
  latency_ms integer,
  approval_status text check (approval_status in ('pending', 'approved', 'denied')),
  reviewer text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table intent_contracts add column if not exists agent_token_id uuid references agent_tokens(id) on delete set null;
alter table policies add column if not exists contract_id uuid references intent_contracts(id) on delete cascade;
alter table policies add column if not exists resource text;
alter table policies add column if not exists resource_action text;
alter table policies add column if not exists reason text;
alter table decisions add column if not exists approval_status text check (approval_status in ('pending', 'approved', 'denied'));
alter table decisions add column if not exists reviewer text;
alter table decisions add column if not exists resolved_at timestamptz;
alter table decisions add column if not exists expires_at timestamptz;

-- Widen approval_status to also allow 'expired' (a pending review whose approval window passed
-- without a human decision — the original PreToolUse hook already timed out and denied by then).
alter table decisions drop constraint if exists decisions_approval_status_check;
alter table decisions add constraint decisions_approval_status_check
  check (approval_status in ('pending', 'approved', 'denied', 'expired'));

create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  agent_token_id uuid references agent_tokens(id) on delete set null,
  provider text not null,
  external_session_id text,
  task_summary text,
  task_source text check (task_source in ('captured_prompt', 'inferred_summary')),
  status text not null default 'running' check (status in ('running', 'completed', 'failed', 'cancelled')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  activity_count integer not null default 0,
  allow_count integer not null default 0,
  review_count integer not null default 0,
  block_count integer not null default 0,
  error_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists activity_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  run_id uuid not null references agent_runs(id) on delete cascade,
  agent_token_id uuid references agent_tokens(id) on delete set null,
  provider text not null,
  external_event_id text,
  sequence_number integer not null,
  event_type text not null,
  category text not null check (category in
    ('FILE', 'COMMAND', 'CODE', 'DATABASE', 'API', 'NETWORK', 'DEPLOYMENT', 'TOOL', 'DATA', 'TEST', 'PACKAGE', 'GIT', 'SECURITY', 'OTHER')),
  tool text,
  action text,
  resource text,
  target text,
  environment text,
  context jsonb,
  decision_id uuid references decisions(id) on delete set null,
  decision text check (decision in ('allow', 'block', 'review')),
  execution_status text not null default 'attempted' check (execution_status in
    ('attempted', 'executed', 'failed', 'denied', 'waiting_approval', 'cancelled')),
  result_summary text,
  error_summary text,
  "timestamp" timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists idx_agent_runs_external_session
  on agent_runs(org_id, provider, external_session_id) where external_session_id is not null;
create index if not exists idx_agent_runs_org_started on agent_runs(org_id, started_at desc);

create unique index if not exists idx_activity_events_external
  on activity_events(org_id, provider, external_event_id) where external_event_id is not null;
create index if not exists idx_activity_events_run on activity_events(run_id, sequence_number);
create index if not exists idx_activity_events_org_timestamp on activity_events(org_id, "timestamp" desc);
create index if not exists idx_activity_events_category on activity_events(org_id, category);
create index if not exists idx_activity_events_decision on activity_events(org_id, decision);

create index if not exists idx_decisions_org_created on decisions(org_id, created_at desc);
create index if not exists idx_policies_org_active on policies(org_id, active);
create index if not exists idx_policies_contract on policies(contract_id);
create index if not exists idx_decisions_pending_review
  on decisions(org_id, approval_status) where approval_status = 'pending';
