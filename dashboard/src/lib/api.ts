import "server-only";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}". Set it in your deployment's environment configuration (in Vercel: Project Settings → Environment Variables) and redeploy.`
    );
  }
  return value;
}

const BASE_URL = requireEnv("API_BASE_URL");
const ADMIN_KEY = requireEnv("ADMIN_API_KEY");
export const DEFAULT_ORG_ID = requireEnv("DEFAULT_ORG_ID");

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "x-admin-key": ADMIN_KEY,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Intentos API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export interface Policy {
  id: string;
  rule_name: string;
  condition: { field: string; op: string; value: string } | { field: string; op: string; value: string }[] | string | null;
  action: "ALLOW" | "BLOCK" | "REVIEW";
  priority: number;
  active: boolean;
  created_at: string;
  contract_id?: string | null;
  resource?: string | null;
  resource_action?: string | null;
  reason?: string | null;
}

export interface Decision {
  id: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
  decision: "allow" | "block" | "review";
  reason: string;
  latency_ms: number;
  created_at: string;
  agent_label: string | null;
  agent_type: string | null;
  matched_rule: string | null;
  approval_status: "pending" | "approved" | "denied" | null;
  reviewer: string | null;
  resolved_at: string | null;
  run_id?: string | null;
}

export type Condition = { field: string; op: string; value: string };

export interface CompiledRule {
  id: string;
  resource: string;
  resource_action: string;
  effect: "ALLOW" | "BLOCK" | "REVIEW";
  reason: string;
  condition: Condition | Condition[] | null;
}

export interface CompileResult {
  domain: string;
  summary: string;
  rules: CompiledRule[];
  source: "openai" | "fallback";
  note?: string;
}

export interface Contract {
  id: string;
  name: string;
  natural_language: string;
  status: "draft" | "active" | "archived";
  created_at: string;
  agent_label: string | null;
  agent_type: string | null;
  rule_count: string;
  allow_count: string;
  review_count: string;
  block_count: string;
}

export interface ContractDetail extends Contract {
  rules: Policy[];
}

export interface PendingApproval {
  id: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
  reason: string;
  created_at: string;
  agent_label: string | null;
  agent_type: string | null;
  matched_rule: string | null;
}

export interface ResolvedApproval {
  id: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
  reason: string;
  approval_status: "approved" | "denied";
  reviewer: string;
  resolved_at: string;
  agent_label: string | null;
}

export interface DecisionSummary {
  allow: string;
  block: string;
  review: string;
  total: string;
}

export interface AgentToken {
  id: string;
  agent_type: string;
  label: string;
  created_at: string;
  revoked_at: string | null;
}

export interface Org {
  id: string;
  name: string;
  created_at: string;
}

export function listOrgs() {
  return api<Org[]>("/v1/orgs");
}

export function createOrg(name: string) {
  return api<Org>("/v1/orgs", { method: "POST", body: JSON.stringify({ name }) });
}

export function listPolicies(orgId: string) {
  return api<Policy[]>(`/v1/policies?org_id=${orgId}`);
}

export function createPolicy(input: {
  org_id: string;
  rule_name: string;
  condition: { field: string; op: string; value: string };
  action: "ALLOW" | "BLOCK" | "REVIEW";
  priority: number;
}) {
  return api<Policy>("/v1/policies", { method: "POST", body: JSON.stringify(input) });
}

export function setPolicyActive(id: string, active: boolean) {
  return api<{ id: string; active: boolean }>(`/v1/policies/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ active }),
  });
}

export function listDecisions(orgId: string, limit = 50) {
  return api<Decision[]>(`/v1/decisions?org_id=${orgId}&limit=${limit}`);
}

export function decisionSummary(orgId: string) {
  return api<DecisionSummary>(`/v1/decisions/summary?org_id=${orgId}`);
}

export function listTokens(orgId: string) {
  return api<AgentToken[]>(`/v1/tokens?org_id=${orgId}`);
}

export function createToken(input: { org_id: string; agent_type: string; label: string }) {
  return api<AgentToken & { token: string }>("/v1/tokens", { method: "POST", body: JSON.stringify(input) });
}

export function compileIntent(input: { text: string; agent_type?: string }) {
  return api<CompileResult>("/v1/compile-intent", { method: "POST", body: JSON.stringify(input) });
}

export function createContract(input: {
  org_id: string;
  agent_token_id?: string;
  name: string;
  natural_language: string;
  rules: {
    resource: string;
    resource_action: string;
    effect: "ALLOW" | "BLOCK" | "REVIEW";
    reason: string;
    condition: Condition | Condition[] | null;
  }[];
}) {
  return api<{ id: string; name: string; status: string }>("/v1/contracts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listContracts(orgId: string) {
  return api<Contract[]>(`/v1/contracts?org_id=${orgId}`);
}

export function getContract(id: string) {
  return api<ContractDetail>(`/v1/contracts/${id}`);
}

export function setContractStatus(id: string, status: "active" | "archived") {
  return api<{ id: string; status: string }>(`/v1/contracts/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function listApprovals(orgId: string) {
  return api<PendingApproval[]>(`/v1/approvals?org_id=${orgId}`);
}

export function listResolvedApprovals(orgId: string, limit = 20) {
  return api<ResolvedApproval[]>(`/v1/approvals/resolved?org_id=${orgId}&limit=${limit}`);
}

export function resolveApproval(id: string, approved: boolean, reviewer: string) {
  return api<{ id: string; approval_status: string }>(`/v1/approvals/${id}/resolve`, {
    method: "POST",
    body: JSON.stringify({ approved, reviewer }),
  });
}

export interface AgentRun {
  id: string;
  provider: string;
  external_session_id: string | null;
  task_summary: string | null;
  task_source: "captured_prompt" | "inferred_summary" | null;
  status: "running" | "completed" | "failed" | "cancelled";
  started_at: string;
  ended_at: string | null;
  activity_count: number;
  allow_count: number;
  review_count: number;
  block_count: number;
  error_count: number;
  agent_label: string | null;
}

export interface ActivityEvent {
  id: string;
  run_id: string;
  sequence_number: number;
  event_type: string;
  category: string;
  tool: string | null;
  action: string | null;
  resource: string | null;
  target: string | null;
  environment: string | null;
  context?: Record<string, unknown>;
  decision: "allow" | "block" | "review" | null;
  decision_id?: string | null;
  decision_reason?: string | null;
  matched_rule?: string | null;
  execution_status: "attempted" | "executed" | "failed" | "denied" | "waiting_approval" | "cancelled";
  result_summary: string | null;
  error_summary: string | null;
  timestamp: string;
  task_summary?: string | null;
  agent_label?: string | null;
}

export interface RunDetail extends AgentRun {
  events: ActivityEvent[];
}

export function listRuns(orgId: string) {
  return api<AgentRun[]>(`/v1/runs?org_id=${orgId}`);
}

export function getRun(id: string) {
  return api<RunDetail>(`/v1/runs/${id}`);
}

export function listActivity(orgId: string, filters?: { run_id?: string; category?: string; decision?: string; limit?: number }) {
  const params = new URLSearchParams({ org_id: orgId });
  if (filters?.run_id) params.set("run_id", filters.run_id);
  if (filters?.category) params.set("category", filters.category);
  if (filters?.decision) params.set("decision", filters.decision);
  if (filters?.limit) params.set("limit", String(filters.limit));
  return api<ActivityEvent[]>(`/v1/activity?${params.toString()}`);
}
