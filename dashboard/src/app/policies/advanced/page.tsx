import Link from "next/link";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VerdictBadge } from "@/components/verdict-badge";
import { listPolicies } from "@/lib/api";
import { getCurrentOrgId } from "@/lib/current-org";
import { NewPolicyDialog } from "../new-policy-dialog";
import { PolicyToggle } from "../policy-toggle";

function describeCondition(condition: { field: string; op: string; value: string } | { field: string; op: string; value: string }[] | string): string {
  const c = typeof condition === "string" ? JSON.parse(condition) : condition;
  const fieldLabel: Record<string, string> = {
    "tool_input.file_path": "file path",
    "tool_input.command": "command",
    tool_name: "tool name",
  };
  const opLabel: Record<string, string> = {
    contains: "contains",
    not_contains: "does not contain",
    equals: "equals",
    lt: "<",
    lte: "<=",
    gt: ">",
    gte: ">=",
  };
  const clauses = Array.isArray(c) ? c : [c];
  return clauses
    .map((cl) => `${fieldLabel[cl.field] ?? cl.field} ${opLabel[cl.op] ?? cl.op} "${cl.value}"`)
    .join(" AND ");
}

export default async function AdvancedPoliciesPage() {
  const policies = await listPolicies(await getCurrentOrgId());
  const manual = policies.filter((p) => p.contract_id == null);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/policies" className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="size-3.5" /> Back to Intent Contracts
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight text-foreground">Advanced: manual rules</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Precise field/operator/value rules, for security engineers who want direct control instead
            of describing intent in English. Rules are checked in priority order — highest wins ties.
          </p>
        </div>
        <NewPolicyDialog />
      </div>

      <Card>
        <CardContent className="pt-6">
          {policies.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No rules yet. Anything not matched defaults to allow.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Then</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((p) => (
                  <TableRow key={p.id} className={p.active ? "" : "opacity-50"}>
                    <TableCell className="font-medium">{p.rule_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.condition ? describeCondition(p.condition) : "—"}
                    </TableCell>
                    <TableCell>
                      <VerdictBadge verdict={p.action} />
                    </TableCell>
                    <TableCell className="tabular-nums text-sm">{p.priority}</TableCell>
                    <TableCell className="text-sm">{p.active ? "Active" : "Disabled"}</TableCell>
                    <TableCell className="text-right">
                      <PolicyToggle id={p.id} active={p.active} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {manual.length === 0 && policies.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              All rules above came from a compiled Intent Contract. New manual rules you add here have
              no contract and appear standalone.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
