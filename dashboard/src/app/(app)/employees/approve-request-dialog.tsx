"use client";

import { useState, useTransition } from "react";
import { PlusIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { addToast } from "@/components/ui/toast";
import type { ScopeRequest, Contract } from "@/lib/api";
import { resolveScopeRequestAction, createInlineContractAction } from "./actions";

const NEW_CONTRACT_VALUE = "__create_new__";

/** Minimal shape needed to list a contract in the dropdown — a contract just created inline
 *  doesn't come back with every field a full Contract has (rule counts, status, etc.), so this
 *  is narrower than the Contract type on purpose. */
export type SelectableContract = { id: string; name: string; project_scope: string | null };

function CreateContractInline({
  onCreated,
  onCancel,
}: {
  onCreated: (contract: SelectableContract) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function handleCreate() {
    if (!name.trim()) {
      setError("Give the contract a name first.");
      return;
    }
    if (!text.trim()) {
      setError("Describe what should be allowed, reviewed, or blocked here.");
      return;
    }
    setError(null);
    start(async () => {
      const result = await createInlineContractAction({ name: name.trim(), natural_language: text.trim() });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onCreated({ id: result.contract.id, name: result.contract.name, project_scope: null });
    });
  }

  return (
    <div className="space-y-3 rounded-md border border-border bg-background p-3">
      <div className="space-y-1.5">
        <Label htmlFor="new_contract_name">Contract name</Label>
        <Input
          id="new_contract_name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Read-only access for this project"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new_contract_text">Describe what's allowed, reviewed, or blocked</Label>
        <Textarea
          id="new_contract_text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Allow reading and editing source code. Block access to .env files, credentials, and secrets. Deleting files requires human approval."
          rows={4}
        />
      </div>
      {error && <p className="text-[12px] text-status-block">{error}</p>}
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={handleCreate} disabled={pending}>
          {pending ? "Creating…" : "Create & use this contract"}
        </Button>
      </div>
    </div>
  );
}

/** The actual approve/deny-with-contract logic and UI, separated from the modal that wraps it. */
export function ApproveForm({
  request,
  contracts,
  onApproved,
  onCancel,
}: {
  request: ScopeRequest;
  contracts: Contract[] | SelectableContract[];
  onApproved: () => void;
  onCancel?: () => void;
}) {
  const [contractId, setContractId] = useState<string>("");
  const [creatingNew, setCreatingNew] = useState(false);
  const [extraContracts, setExtraContracts] = useState<SelectableContract[]>([]);
  const [pending, start] = useTransition();
  const needsContract = request.requested_action === "include";
  const allContracts: SelectableContract[] = [...contracts, ...extraContracts];

  function handleSelectChange(value: string) {
    if (value === NEW_CONTRACT_VALUE) {
      setCreatingNew(true);
      return;
    }
    setContractId(value);
  }

  return (
    <div className="space-y-3">
      <p className="text-[12.5px] text-muted-foreground">
        {needsContract
          ? "Including a folder means it becomes governed — pick which Intent Contract's rules apply there, or create a new one just for this folder. It'll be scoped to just this folder, not your whole company."
          : "Excluding a folder only removes governance from it, so no contract is needed."}
      </p>

      {needsContract && (
        <div className="space-y-1.5">
          <div className="text-[12px] font-medium text-foreground">Intent Contract for this folder</div>
          {creatingNew ? (
            <CreateContractInline
              onCancel={() => setCreatingNew(false)}
              onCreated={(contract) => {
                setExtraContracts((prev) => [...prev, contract]);
                setContractId(contract.id);
                setCreatingNew(false);
                addToast({ title: "Contract created", description: `"${contract.name}" is ready to assign.`, type: "success" });
              }}
            />
          ) : (
            <Select value={contractId} onValueChange={handleSelectChange}>
              <SelectTrigger className="w-full">
                <SelectValue>{contractId ? allContracts.find((c) => c.id === contractId)?.name : "Choose a contract…"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {allContracts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.project_scope && <span className="ml-1.5 text-muted-foreground">(currently: {c.project_scope})</span>}
                  </SelectItem>
                ))}
                <SelectItem value={NEW_CONTRACT_VALUE}>
                  <span className="flex items-center gap-1.5">
                    <PlusIcon className="size-3.5" /> Create new contract…
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          )}
          {allContracts.length === 0 && !creatingNew && (
            <p className="text-[12px] text-muted-foreground">
              No active contracts yet — use &quot;Create new contract…&quot; above to make one for this folder.
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        )}
        <Button
          type="button"
          disabled={pending || creatingNew || (needsContract && !contractId)}
          onClick={() =>
            start(async () => {
              const result = await resolveScopeRequestAction(request.id, true, needsContract ? contractId : undefined);
              if (!result.ok) {
                addToast({ title: "Couldn't approve", description: result.error, type: "error" });
                return;
              }
              onApproved();
            })
          }
        >
          {pending ? "Approving…" : "Approve"}
        </Button>
      </div>
    </div>
  );
}

export function ApproveDialog({
  request,
  contracts,
  open,
  onOpenChange,
  onApproved,
}: {
  request: ScopeRequest;
  contracts: Contract[] | SelectableContract[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApproved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve access to {request.project_identifier}</DialogTitle>
        </DialogHeader>
        <ApproveForm request={request} contracts={contracts} onApproved={onApproved} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
