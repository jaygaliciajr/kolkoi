"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { useFormStatus } from "react-dom";

import { Modal } from "@/components/ui/Modal";
import {
  approveSubmissionAction,
  requestRevisionAction,
} from "@/lib/submissions/actions";
import { INITIAL_SUBMISSION_REVIEW_ACTION_STATE } from "@/lib/submissions/action-state";

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

export function SubmissionReviewActions({ submissionId }: { submissionId: string }) {
  const [open, setOpen] = useState<null | "approve" | "revision">(null);
  const [approveState, approveFormAction] = useActionState(
    approveSubmissionAction,
    INITIAL_SUBMISSION_REVIEW_ACTION_STATE,
  );
  const [revisionState, revisionFormAction] = useActionState(
    requestRevisionAction,
    INITIAL_SUBMISSION_REVIEW_ACTION_STATE,
  );

    useEffect(() => {
    if (approveState.error) toast.error(approveState.error);
    if (approveState.success) toast.success(approveState.success);
    if (revisionState.error) toast.error(revisionState.error);
    if (revisionState.success) toast.success(revisionState.success);
  }, [approveState.error, approveState.success, revisionState.error, revisionState.success]);

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-lg shadow-slate-200/40 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/70 dark:shadow-none md:sticky md:top-4">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Review Actions</h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">Confirm before applying a review decision.</p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setOpen("approve")}
          className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-all duration-200 ease-in-out hover:bg-emerald-700"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => setOpen("revision")}
          className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-medium text-white transition-all duration-200 ease-in-out hover:bg-amber-600"
        >
          Request Revision
        </button>
      </div>

      {approveState.error ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/60 dark:text-rose-200">{approveState.error}</p>
      ) : null}
      {approveState.success ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200">
          {approveState.success}
        </p>
      ) : null}
      {revisionState.error ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/60 dark:text-rose-200">{revisionState.error}</p>
      ) : null}
      {revisionState.success ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200">
          {revisionState.success}
        </p>
      ) : null}

      <Modal
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open === "approve" ? "Approve this submission?" : "Request revision?"}
        description={
          open === "approve"
            ? "This marks the submission approved and can unlock approved milestones."
            : "This marks the submission needs_revision and notifies the influencer by comment."
        }
      >
        {open === "approve" ? (
          <form
            action={approveFormAction}
            className="flex items-center gap-2"
            onSubmit={() => setOpen(null)}
          >
            <input type="hidden" name="submission_id" value={submissionId} />
            <ActionButton label="Confirm Approve" />
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 transition-all duration-200 ease-in-out hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          </form>
        ) : (
          <form
            action={revisionFormAction}
            className="flex items-center gap-2"
            onSubmit={() => setOpen(null)}
          >
            <input type="hidden" name="submission_id" value={submissionId} />
            <ActionButton label="Confirm Revision" />
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 transition-all duration-200 ease-in-out hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}
