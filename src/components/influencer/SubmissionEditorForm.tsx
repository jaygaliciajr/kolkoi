"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  createSubmissionAction,
  updateSubmissionAction,
} from "@/lib/submissions/actions";
import {
  INITIAL_SUBMISSION_ACTION_STATE,
  type SubmissionActionState,
} from "@/lib/submissions/action-state";

type MediaItem = {
  path: string;
  signedUrl: string;
};

type HistoryItem = {
  id: string;
  version: number;
  status: string | null;
  updated_at: string | null;
};

function isImage(path: string) {
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(path);
}

function isVideo(path: string) {
  return /\.(mp4|mov|avi|mkv|webm|m4v)$/i.test(path);
}

function SubmitButton({
  label,
  intent,
}: {
  label: string;
  intent: "draft" | "submit";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="intent"
      value={intent}
      disabled={pending}
      className={
        intent === "submit"
          ? "rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          : "rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {pending ? "Saving..." : label}
    </button>
  );
}

export function SubmissionEditorForm({
  mode,
  assignmentId,
  deliverableId,
  submissionId,
  defaultCaption,
  defaultNotes,
  existingMedia,
  versionHistory,
  allowDraft = true,
}: {
  mode: "create" | "edit";
  assignmentId: string;
  deliverableId: string;
  submissionId?: string;
  defaultCaption?: string | null;
  defaultNotes?: string | null;
  existingMedia: MediaItem[];
  versionHistory: HistoryItem[];
  allowDraft?: boolean;
}) {
  const action = mode === "create" ? createSubmissionAction : updateSubmissionAction;
  const [state, formAction] = useActionState<SubmissionActionState, FormData>(
    action,
    INITIAL_SUBMISSION_ACTION_STATE,
  );

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">
        {mode === "create" ? "Create Draft Submission" : "Edit Submission"}
      </h2>

      <form action={formAction} className="space-y-4">
        {mode === "create" ? (
          <>
            <input type="hidden" name="assignment_id" value={assignmentId} />
            <input type="hidden" name="deliverable_id" value={deliverableId} />
          </>
        ) : (
          <input type="hidden" name="submission_id" value={submissionId} />
        )}

        <div className="space-y-1">
          <label htmlFor="caption" className="text-sm font-medium text-slate-800">
            Caption
          </label>
          <textarea
            id="caption"
            name="caption"
            rows={5}
            defaultValue={defaultCaption ?? ""}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
            placeholder="Write your caption"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="media" className="text-sm font-medium text-slate-800">
            Upload Media
          </label>
          <input
            id="media"
            name="media"
            type="file"
            multiple
            accept="image/*,video/*"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-slate-700"
          />
          <p className="text-xs text-slate-500">You can upload multiple images or videos.</p>
        </div>

        {existingMedia.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-800">Current Media</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {existingMedia.map((item) => (
                <div key={item.path} className="overflow-hidden rounded-md border border-slate-200">
                  {isImage(item.path) ? (
                    <div
                      className="h-36 w-full bg-slate-100 bg-cover bg-center"
                      style={{ backgroundImage: `url(${item.signedUrl})` }}
                      role="img"
                      aria-label={item.path}
                    />
                  ) : isVideo(item.path) ? (
                    <video src={item.signedUrl} controls className="h-36 w-full bg-black object-contain" />
                  ) : (
                    <div className="p-3 text-xs text-slate-600">Preview unavailable for this file.</div>
                  )}
                  <a
                    href={item.signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block border-t border-slate-200 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    Open file
                  </a>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-1">
          <label htmlFor="notes" className="text-sm font-medium text-slate-800">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={defaultNotes ?? ""}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
            placeholder="Optional notes"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {allowDraft ? <SubmitButton label="Save Draft" intent="draft" /> : null}
          <SubmitButton label="Submit for Approval" intent="submit" />
        </div>
      </form>

      {state.error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.success}
        </p>
      ) : null}

      {versionHistory.length > 0 ? (
        <section className="space-y-2 rounded-md border border-slate-200 p-3">
          <h3 className="text-sm font-semibold text-slate-900">Version History</h3>
          <ul className="space-y-1 text-sm text-slate-700">
            {versionHistory.map((item) => (
              <li key={item.id}>
                v{item.version} | {(item.status ?? "draft").replaceAll("_", " ")} |{" "}
                {item.updated_at ? new Date(item.updated_at).toLocaleString() : "-"}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
