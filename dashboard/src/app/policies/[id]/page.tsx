import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VerdictBadge } from "@/components/verdict-badge";
import { getContract } from "@/lib/api";
import { ContractStatusToggle } from "./status-toggle";

function conditionText(condition: unknown): string {
  if (!condition) return "—";
  const c = typeof condition === "string" ? JSON.parse(condition) : condition;
  const clauses = Array.isArray(c) ? c : [c];
  const opLabel: Record<string, string> = {
    contains: "contains",
    not_contains: "doesn't contain",
    equals: "is",
    lt: "<",
    lte: "≤",
    gt: ">",
    gte: "≥",
  };
  return clauses
    .map((cl: { field: string; op: string; value: string }) => `${cl.field.replace("tool_input.", "")} ${opLabel[cl.op] ?? cl.op} ${cl.value}`)
    .join(" and ");
}

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contract = await getContract(id);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/policies" className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Back to Intent Contracts
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] font-semibold tracking-tight text-foreground">{contract.name}</h1>
            <Badge variant={contract.status === "active" ? "default" : "secondary"} className="font-normal">
              {contract.status}
            </Badge>
          </div>
          <p className="mt-1 text-[13px] text-muted-foreground">Agent: {contract.agent_label ?? "Unassigned"}</p>
        </div>
        <ContractStatusToggle id={contract.id} status={contract.status} />
      </div>

      <Card>
        <CardContent className="pt-6">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Original intent
          </p>
          <p className="mt-2 whitespace-pre-line text-sm text-foreground">{contract.natural_language}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Compiled rules ({contract.rules.length})
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Effect</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contract.rules.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.resource ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{r.resource_action ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{conditionText(r.condition)}</TableCell>
                  <TableCell>
                    <VerdictBadge verdict={r.action} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.reason ?? r.rule_name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
