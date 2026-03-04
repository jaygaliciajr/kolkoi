"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { markMilestonePaidAction } from "@/lib/payments/actions";
import { INITIAL_MARK_PAID_ACTION_STATE } from "@/lib/payments/action-state";

type Milestone = {
  id: string;
  label: string;
  amount: number;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Confirm Paid
    </Button>
  );
}

export function MarkMilestonePaidForm({
  assignmentId,
  milestone,
}: {
  assignmentId: string;
  milestone: Milestone;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(
    markMilestonePaidAction,
    INITIAL_MARK_PAID_ACTION_STATE,
  );

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success) toast.success(state.success);
  }, [state.error, state.success]);

  return (
    <div className="space-y-2">
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        Mark as Paid
      </Button>

      {state.error ? (
        <p className="rounded-xl bg-rose-50 px-2 py-1 text-xs text-rose-700 dark:bg-rose-950/60 dark:text-rose-200">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="rounded-xl bg-emerald-50 px-2 py-1 text-xs text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200">{state.success}</p>
      ) : null}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Mark Milestone as Paid"
        description={`Milestone: ${milestone.label}`}
      >
        <form action={formAction} className="space-y-3" onSubmit={() => setOpen(false)}>
          <input type="hidden" name="assignment_id" value={assignmentId} />
          <input type="hidden" name="milestone_id" value={milestone.id} />

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Method</span>
            <select
              id={`method-${milestone.id}`}
              name="method"
              defaultValue="GCash"
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white/85 px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="GCash">GCash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <Input
            id={`reference-${milestone.id}`}
            name="reference_no"
            label="Reference No"
            helperText="Optional payment reference."
            placeholder="Optional"
          />

          <Input
            id={`amount-${milestone.id}`}
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={milestone.amount.toFixed(2)}
            label="Amount"
            required
            helperText="Must be greater than zero."
            validate={(value) => (Number(value) > 0 ? null : "Amount must be greater than zero.")}
          />

          <Textarea
            id={`notes-${milestone.id}`}
            name="notes"
            label="Notes"
            helperText="Optional payout note."
            rows={3}
            placeholder="Optional"
          />

          <div className="flex items-center gap-2">
            <SubmitButton />
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
