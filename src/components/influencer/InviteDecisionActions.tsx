"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { respondToInviteAction } from "@/lib/campaigns/assignmentActions";
import { INITIAL_ASSIGNMENT_ACTION_STATE } from "@/lib/campaigns/assignment-action-state";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {label}
    </Button>
  );
}

export function InviteDecisionActions({ assignmentId }: { assignmentId: string }) {
  const [open, setOpen] = useState<null | "accept" | "decline">(null);
  const [state, formAction] = useActionState(
    respondToInviteAction,
    INITIAL_ASSIGNMENT_ACTION_STATE,
  );

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success) toast.success(state.success);
  }, [state.error, state.success]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => setOpen("accept")}>
          Accept
        </Button>
        <Button type="button" onClick={() => setOpen("decline")} variant="secondary">
          Decline
        </Button>
      </div>

      {state.error ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/60 dark:text-rose-200">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200">{state.success}</p>
      ) : null}

      <Modal
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open === "accept" ? "Accept Campaign?" : "Decline Campaign?"}
        description={
          open === "accept"
            ? "We will prepare your proofs and payment milestones."
            : "You can optionally add a note for the admin."
        }
      >
        <form action={formAction} className="space-y-3" onSubmit={() => setOpen(null)}>
          <input type="hidden" name="assignment_id" value={assignmentId} />
          <input type="hidden" name="decision" value={open ?? "accept"} />

          {open === "decline" ? (
            <Textarea
              name="decline_note"
              label="Decline note"
              helperText="Optional context to help the admin understand your reason."
              rows={3}
              placeholder="Optional note"
            />
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <SubmitButton label={open === "accept" ? "Confirm Accept" : "Confirm Decline"} />
            <Button type="button" variant="secondary" onClick={() => setOpen(null)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
