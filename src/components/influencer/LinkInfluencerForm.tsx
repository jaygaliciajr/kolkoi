"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  redeemInfluencerLinkCodeAction,
} from "@/lib/influencers/actions";
import { INITIAL_INFLUENCER_ACTION_STATE } from "@/lib/influencers/action-state";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Linking..." : "Link My Record"}
    </button>
  );
}

export function LinkInfluencerForm() {
  const [state, formAction] = useActionState(
    redeemInfluencerLinkCodeAction,
    INITIAL_INFLUENCER_ACTION_STATE,
  );

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="code">
          Link Code
        </label>
        <input
          id="code"
          name="code"
          placeholder="Paste code from admin"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase outline-none ring-slate-300 focus:ring"
        />
      </div>

      {state.error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.success}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
