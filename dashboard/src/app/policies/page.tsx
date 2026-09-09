import Link from "next/link";
import { GearIcon, FileTextIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/empty-state";
import { listContracts } from "@/lib/api";
import { getCurrentOrgId } from "@/lib/current-org";

export default async function PoliciesPage() {
  const contracts = await listContracts(await getCurrentOrgId());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Intent Contracts"
        description="Describe what an agent may do in plain English — Intentos compiles it into enforceable rules and enforces them deterministically, every time."
        actions={
          <>
            <Link href="/policies/advanced">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <GearIcon className="size-3.5" /> Advanced
              </Button>
            </Link>
            <Link href="/policies/new">
              <Button size="sm">Create Intent Contract</Button>
            </Link>
          </>
        }
      />

      <div className="rounded-lg border border-border bg-panel">
        {contracts.length === 0 ? (
          <EmptyState
            icon={FileTextIcon}
            title="No Intent Contracts yet"
            description="Describe an agent's intent in plain English to create your first one."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Intent Contract</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rules</TableHead>
                <TableHead className="text-right">Last updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((c) => (
                <TableRow key={c.id} className={c.status === "archived" ? "opacity-50" : ""}>
                  <TableCell>
                    <Link href={`/policies/${c.id}`} className="font-medium text-foreground hover:underline">
                      {c.name}
                    </Link>
                    <p className="mt-0.5 max-w-md truncate text-[12px] text-muted-foreground">
                      {c.natural_language}
                    </p>
                  </TableCell>
                  <TableCell className="text-foreground">{c.agent_label ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === "active" ? "default" : "secondary"} className="font-normal">
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[12px]">
                    <span className="text-status-allow">{c.allow_count} allow</span>
                    <span className="text-faint-foreground"> · </span>
                    <span className="text-status-review">{c.review_count} review</span>
                    <span className="text-faint-foreground"> · </span>
                    <span className="text-status-block">{c.block_count} block</span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
