import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { listTokens, listDecisions } from "@/lib/api";
import { getCurrentOrgId } from "@/lib/current-org";
import { NewTokenDialog } from "./new-token-dialog";
import { Bot } from "lucide-react";

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { welcome } = await searchParams;
  const orgId = await getCurrentOrgId();
  const [tokens, decisions] = await Promise.all([listTokens(orgId), listDecisions(orgId, 200)]);

  const lastActivityByLabel = new Map<string, string>();
  for (const d of decisions) {
    if (d.agent_label && !lastActivityByLabel.has(d.agent_label)) {
      lastActivityByLabel.set(d.agent_label, d.created_at);
    }
  }

  return (
    <div className="space-y-6">
      {welcome && (
        <div className="rounded-lg border border-[color-mix(in_oklch,var(--status-allow),transparent_65%)] bg-[var(--status-allow-bg)] px-4 py-3 text-[13px] text-foreground">
          Company created. Register your first agent below to get a token, then write a policy for it.
        </div>
      )}
      <PageHeader
        title="Agents"
        description="Every agent token issued to this company."
        actions={<NewTokenDialog />}
      />

      <div className="rounded-lg border border-border bg-panel">
        {tokens.length === 0 ? (
          <EmptyState icon={Bot} title="No agents registered yet" description="Register one to get a token." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last activity</TableHead>
                <TableHead className="text-right">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((t) => {
                const lastActivity = lastActivityByLabel.get(t.label);
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium text-foreground">{t.label}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {t.agent_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`size-1.5 rounded-full ${t.revoked_at ? "bg-faint-foreground" : "bg-status-allow"}`}
                        />
                        {t.revoked_at ? "Revoked" : "Active"}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {lastActivity ? timeAgo(lastActivity) : "No activity yet"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {new Date(t.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
