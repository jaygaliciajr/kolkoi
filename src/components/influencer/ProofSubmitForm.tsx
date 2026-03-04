"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  submitProofAction,
} from "@/lib/proofs/actions";
import { INITIAL_PROOF_ACTION_STATE } from "@/lib/proofs/action-state";

type ScreenshotItem = {
  path: string;
  signedUrl: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Submitting..." : "Submit Proof"}
    </button>
  );
}

export function ProofSubmitForm({
  assignmentId,
  deliverableId,
  defaultPostUrl,
  existingScreenshots,
}: {
  assignmentId: string;
  deliverableId: string;
  defaultPostUrl: string | null;
  existingScreenshots: ScreenshotItem[];
}) {
  const [state, formAction] = useActionState(submitProofAction, INITIAL_PROOF_ACTION_STATE);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const previewUrls = useMemo(
    () => selectedFiles.map((file) => URL.createObjectURL(file)),
    [selectedFiles],
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="assignment_id" value={assignmentId} />
      <input type="hidden" name="deliverable_id" value={deliverableId} />

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Proof Details</h2>

        <div className="space-y-1">
          <label htmlFor="post_url" className="text-sm font-medium text-slate-800">
            Post URL
          </label>
          <input
            id="post_url"
            name="post_url"
            type="url"
            defaultValue={defaultPostUrl ?? ""}
            placeholder="https://..."
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
          />
          <p className="text-xs text-slate-500">
            Required for fully compliant proof. Screenshot-only will be marked as needs_url.
          </p>
        </div>

        <div className="space-y-1">
          <label htmlFor="screenshots" className="text-sm font-medium text-slate-800">
            Screenshot Upload (required)
          </label>
          <input
            id="screenshots"
            name="screenshots"
            type="file"
            multiple
            accept="image/*"
            required
            onChange={(event) =>
              setSelectedFiles(
                Array.from(event.currentTarget.files ?? []).filter((item) => item.size > 0),
              )
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-slate-700"
          />
        </div>

        {previewUrls.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-800">Selected Preview</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {previewUrls.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  className="h-32 rounded-md border border-slate-200 bg-cover bg-center"
                  style={{ backgroundImage: `url(${url})` }}
                />
              ))}
            </div>
          </div>
        ) : null}

        {existingScreenshots.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-800">Previous Submission Screenshots</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {existingScreenshots.map((item) => (
                <a
                  key={item.path}
                  href={item.signedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="h-32 rounded-md border border-slate-200 bg-cover bg-center"
                  style={{ backgroundImage: `url(${item.signedUrl})` }}
                />
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <div className="sticky bottom-2 z-10 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <p className="text-xs text-slate-500">Screenshots are required.</p>
        <SubmitButton />
      </div>

      {state.error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.success}
        </p>
      ) : null}
    </form>
  );
}
