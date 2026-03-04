"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  addSubmissionCommentAction,
} from "@/lib/submissions/actions";
import { INITIAL_SUBMISSION_ACTION_STATE } from "@/lib/submissions/action-state";

type CommentItem = {
  id: string;
  user_id: string | null;
  body: string | null;
  created_at: string | null;
};

function CommentSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Posting..." : "Post Comment"}
    </button>
  );
}

export function SubmissionComments({
  submissionId,
  comments,
}: {
  submissionId: string;
  comments: CommentItem[];
}) {
  const [state, formAction] = useActionState(
    addSubmissionCommentAction,
    INITIAL_SUBMISSION_ACTION_STATE,
  );

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Comments</h2>

      <div className="space-y-2">
        {comments.length === 0 ? (
          <p className="text-sm text-slate-500">No comments yet.</p>
        ) : (
          comments.map((comment) => (
            <article key={comment.id} className="rounded-md border border-slate-200 p-3 text-sm">
              <p className="text-slate-800">{comment.body ?? ""}</p>
              <p className="mt-1 text-xs text-slate-500">
                {comment.user_id ?? "Unknown"} |{" "}
                {comment.created_at ? new Date(comment.created_at).toLocaleString() : "-"}
              </p>
            </article>
          ))
        )}
      </div>

      <form action={formAction} className="space-y-2">
        <input type="hidden" name="submission_id" value={submissionId} />
        <textarea
          name="comment"
          rows={3}
          placeholder="Add a comment"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
        />
        <CommentSubmitButton />
      </form>

      {state.error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.success}
        </p>
      ) : null}
    </section>
  );
}
