"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  generateInfluencerLinkCodeAction,
} from "@/lib/influencers/actions";
import { INITIAL_LINK_CODE_ACTION_STATE } from "@/lib/influencers/action-state";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Generating..." : "Generate Link Code"}
    </button>
  );
}

export function LinkCodeGenerator({
  influencerId,
  latestStatus,
  latestCode,
  latestExpiresAt,
}: {
  influencerId: string;
  latestStatus: "Active" | "Expired" | "Used" | null;
  latestCode: string | null;
  latestExpiresAt: string | null;
}) {
  const [state, formAction] = useActionState(
    generateInfluencerLinkCodeAction,
    INITIAL_LINK_CODE_ACTION_STATE,
  );
  const [copied, setCopied] = useState(false);

  const displayCode = state.generatedCode ?? latestCode;
  const displayStatus = state.status ?? latestStatus;

  async function onCopy() {
    if (!displayCode) return;
    await navigator.clipboard.writeText(displayCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <p>
          Status: <span className="font-medium">{displayStatus ?? "No code yet"}</span>
        </p>
        {displayCode ? (
          <p className="mt-1 break-all">
            Code: <span className="font-mono font-medium">{displayCode}</span>
          </p>
        ) : null}
        {latestExpiresAt ? <p className="mt-1">Expires: {latestExpiresAt}</p> : null}
      </div>

      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="influencer_id" value={influencerId} />
        <SubmitButton />
        {displayCode ? (
          <button
            type="button"
            onClick={onCopy}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            {copied ? "Copied" : "Copy Code"}
          </button>
        ) : null}
      </form>

      {state.error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.success}
        </p>
      ) : null}
    </div>
  );
}
