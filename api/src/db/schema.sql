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

-- Project/repository identity — so the same governed action is traceable to a specific
-- repo regardless of which employee's machine or clone path it ran from. Populated by the
-- hook from `git remote get-url origin` / `git rev-parse --show-toplevel`, normalized to
-- host/owner/repo. Nullable: older rows and hosts without a hook-provided project both
-- have no identity, which is a real, visible gap, not backfilled or guessed.
alter table agent_runs add column if not exists metadata jsonb;
alter table decisions add column if not exists project jsonb;
create index if not exists idx_decisions_project_repo
  on decisions using gin (project) where project is not null;

-- Real user/employee identity, separate from the shared admin key and the org-selection
-- cookie. One user belongs to one org (multi-org-per-user is a later scaling concern, not
-- needed for a single-company onboarding flow).
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

-- Browser session, opaque bearer cookie hashed at rest, same pattern as agent_tokens.
-- Revocable (logout / admin-initiated) and expiring, unlike the previous org-only cookie.
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

-- OAuth-2.0-device-authorization-grant-style handshake (RFC 8628 pattern): a CLI/hook
-- installer that cannot receive a browser redirect starts a pending row here, a signed-in
-- human approves it from the dashboard, and the installer polls until it can claim a
-- one-time-delivered agent token. Nothing here is a permanent copy-pasted token — the human
-- never sees or types the credential; the installer receives it directly over TLS.
create table if not exists device_links (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  device_code text not null unique,
  user_code text not null unique,
  agent_type text not null default 'claude-code',
  hostname text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied', 'expired', 'claimed')),
  user_id uuid references users(id) on delete set null,
  agent_token_id uuid references agent_tokens(id) on delete set null,
  pending_raw_token text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  approved_at timestamptz
);

create index if not exists idx_sessions_token on sessions(token_hash) where revoked_at is null;
create index if not exists idx_device_links_device_code on device_links(device_code);
create index if not exists idx_device_links_user_code on device_links(user_code);

-- Admin vs Employee. The org creator (signup) is always 'admin'; everyone who joins via an
-- invite link is 'employee'. Enforced both in the dashboard's routing and on the API routes
-- below — never UI-only.
alter table users add column if not exists role text not null default 'admin' check (role in ('admin', 'employee'));

-- Which signed-in human's device this token belongs to, set once at device-approval time.
-- Lets every governed action be attributed back to a real employee, not just "some token
-- in this org" — the whole point of the multi-employee identity requirement.
alter table agent_tokens add column if not exists owner_user_id uuid references users(id) on delete set null;
alter table agent_tokens add column if not exists owner_email text;

-- Denormalized employee email snapshot on every governed record, same pattern as the
-- existing `project jsonb` snapshot on decisions — written once at check time so historical
-- rows stay attributable even if the user is later removed, and so Decisions/Approvals/
-- Activity never need an extra join just to show "who did this."
alter table decisions add column if not exists employee_email text;
alter table activity_events add column if not exists employee_email text;
alter table agent_runs add column if not exists employee_email text;

create index if not exists idx_decisions_employee on decisions(org_id, employee_email);
create index if not exists idx_activity_events_employee on activity_events(org_id, employee_email);

-- A reusable, admin-generated link (github/slack-style single workspace-invite link, not
-- one-per-person) that lets any number of employees join the same org, each authenticating
-- with their OWN work email — the invite code only identifies which company to join, it is
-- never itself a credential for any specific person.
create table if not exists org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  code text not null unique,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- Per-device project/folder scope. 'all' (default) = unchanged existing behavior, every
-- project on this device is governed by the org's active contracts. 'exclude' = named
-- projects are skipped entirely (default allow, no policy check) — everything else stays
-- governed normally. 'include_only' = named projects are governed normally, but ANY other
-- project on this device is hard-blocked outright — a true allowlist/sandbox mode.
-- scope_projects entries are matched against the incoming action's normalized_repo (or
-- repo_root/cwd fallback for non-git folders) as a substring, same convention as policy
-- conditions elsewhere in this schema.
alter table agent_tokens add column if not exists scope_mode text not null default 'all' check (scope_mode in ('all', 'exclude', 'include_only'));
alter table agent_tokens add column if not exists scope_projects text[] not null default '{}';

-- An employee, from their own device, asks to add a project to their device's scope —
-- doesn't take effect until an admin approves it. Keeps folder-level access decisions in
-- the admin's hands even though only the employee knows their own machine's folder names.
create table if not exists scope_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  agent_token_id uuid not null references agent_tokens(id) on delete cascade,
  requested_by uuid references users(id) on delete set null,
  requested_by_email text not null,
  project_identifier text not null,
  requested_action text not null check (requested_action in ('include', 'exclude')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by_email text
);

create index if not exists idx_scope_requests_org_status on scope_requests(org_id, status);

-- When set, this contract's rules only apply to actions whose project identity matches this
-- text (same substring-match convention as everywhere else) — e.g. "payments-api" or
-- "github.com/acme/payments-api". Null (the default, and every pre-existing contract) means
-- org-wide, exactly the current behavior — this is purely additive, nothing already active
-- changes scope by having this column added.
alter table intent_contracts add column if not exists project_scope text;

create index if not exists idx_org_invites_code on org_invites(code) where revoked_at is null;

-- Revoking an employee already kills their live session and any device tokens immediately
-- (both checked on every request), but without this, the same person could just log back in
-- with their existing password and mint a brand-new session. This is the permanent record
-- that blocks login itself, so "Revoke" actually means revoked.
alter table users add column if not exists revoked_at timestamptz;
