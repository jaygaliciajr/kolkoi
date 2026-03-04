"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { useFormStatus } from "react-dom";

import { Modal } from "@/components/ui/Modal";
import {
  rejectProofAction,
  verifyProofAction,
} from "@/lib/proofs/actions";
import { INITIAL_PROOF_ACTION_STATE } from "@/lib/proofs/action-state";

function ActionButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-all duration-200 ease-in-out hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
    >
      {pending ? "Processing..." : label}
    </button>
  );
}

export function ProofReviewActions({ proofId }: { proofId: string }) {
  const [open, setOpen] = useState<null | "verify" | "reject">(null);
  const [verifyState, verifyAction] = useActionState(
    verifyProofAction,
    INITIAL_PROOF_ACTION_STATE,
  );
  const [rejectState, rejectAction] = useActionState(
    rejectProofAction,
    INITIAL_PROOF_ACTION_STATE,
  );

    useEffect(() => {
    if (verifyState.error) toast.error(verifyState.error);
    if (verifyState.success) toast.success(verifyState.success);
    if (rejectState.error) toast.error(rejectState.error);
    if (rejectState.success) toast.success(rejectState.success);
  }, [verifyState.error, verifyState.success, rejectState.error, rejectState.success]);

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-lg shadow-slate-200/40 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/70 dark:shadow-none md:sticky md:top-4">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Verification Actions</h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">Only campaign managers can verify or reject proofs.</p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setOpen("verify")}
          className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-all duration-200 ease-in-out hover:bg-emerald-700"
        >
          Verify
        </button>
        <button
          type="button"
          onClick={() => setOpen("reject")}
          className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-medium text-white transition-all duration-200 ease-in-out hover:bg-rose-700"
        >
          Reject
        </button>
      </div>

      {verifyState.error ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/60 dark:text-rose-200">{verifyState.error}</p>
      ) : null}
      {verifyState.success ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200">{verifyState.success}</p>
      ) : null}
      {rejectState.error ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/60 dark:text-rose-200">{rejectState.error}</p>
      ) : null}
      {rejectState.success ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200">{rejectState.success}</p>
      ) : null}

      <Modal
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open === "verify" ? "Verify this proof?" : "Reject this proof?"}
        description={
          open === "verify"
            ? "Verification can trigger ready payment milestones for verified labels."
            : "Provide an optional reason so the influencer can resubmit correctly."
        }
      >
        {open === "verify" ? (
          <form action={verifyAction} className="flex items-center gap-2" onSubmit={() => setOpen(null)}>
            <input type="hidden" name="proof_id" value={proofId} />
            <ActionButton label="Confirm Verify" />
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 transition-all duration-200 ease-in-out hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          </form>
        ) : (
          <form action={rejectAction} className="space-y-3" onSubmit={() => setOpen(null)}>
            <input type="hidden" name="proof_id" value={proofId} />
            <textarea
              name="reject_reason"
              rows={3}
              placeholder="Optional reject reason"
              className="w-full rounded-xl border border-slate-300 bg-white/85 px-3 py-2 text-sm text-slate-800 outline-none ring-slate-300 transition-all duration-200 ease-in-out focus:ring dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            <div className="flex items-center gap-2">
              <ActionButton label="Confirm Reject" />
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 transition-all duration-200 ease-in-out hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
