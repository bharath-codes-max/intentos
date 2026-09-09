"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPolicyAction } from "./actions";

const FIELDS = [
  { value: "tool_input.file_path", label: "File path" },
  { value: "tool_input.command", label: "Command" },
  { value: "tool_name", label: "Tool name" },
];

const OPS = [
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "does not contain" },
  { value: "equals", label: "equals" },
];

const ACTIONS = [
  { value: "ALLOW", label: "Allow" },
  { value: "BLOCK", label: "Block" },
  { value: "REVIEW", label: "Require review" },
];

function labelFor(options: { value: string; label: string }[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

export function NewPolicyDialog() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [field, setField] = useState(FIELDS[0].value);
  const [op, setOp] = useState(OPS[0].value);
  const [action, setAction] = useState("BLOCK");
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>New rule</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New policy rule</DialogTitle>
        </DialogHeader>
        <form
          ref={formRef}
          action={(formData) => {
            startTransition(async () => {
              await createPolicyAction(formData);
              formRef.current?.reset();
              setField(FIELDS[0].value);
              setOp(OPS[0].value);
              setAction("BLOCK");
              setOpen(false);
            });
          }}
          className="space-y-4"
        >
          <input type="hidden" name="field" value={field} />
          <input type="hidden" name="op" value={op} />
          <input type="hidden" name="action" value={action} />

          <div className="space-y-1.5">
            <Label htmlFor="rule_name">Rule name</Label>
            <Input id="rule_name" name="rule_name" placeholder="Block .env reads" required />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>If field</Label>
              <Select value={field} onValueChange={(v) => setField(v ?? FIELDS[0].value)}>
                <SelectTrigger className="w-full">
                  <SelectValue>{() => labelFor(FIELDS, field)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {FIELDS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Operator</Label>
              <Select value={op} onValueChange={(v) => setOp(v ?? OPS[0].value)}>
                <SelectTrigger className="w-full">
                  <SelectValue>{() => labelFor(OPS, op)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {OPS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="value">Value</Label>
              <Input id="value" name="value" placeholder=".env" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Then</Label>
              <Select value={action} onValueChange={(v) => setAction(v ?? "BLOCK")}>
                <SelectTrigger className="w-full">
                  <SelectValue>{() => labelFor(ACTIONS, action)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ACTIONS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="priority">Priority (higher wins ties)</Label>
              <Input id="priority" name="priority" type="number" defaultValue={10} />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
