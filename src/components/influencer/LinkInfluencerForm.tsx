"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  redeemInfluencerLinkCodeAction,
} from "@/lib/influencers/actions";
import { INITIAL_INFLUENCER_ACTION_STATE } from "@/lib/influencers/action-state";
import { Button } from "@/components/ui/Button";
import { focusRing, inputBase, transitionFast } from "@/lib/ui/tokens";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      loading={pending}
      size="md"
    >
      {pending ? "Linking..." : "Link My Record"}
    </Button>
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
        <label className="mb-1 block text-sm font-medium text-text" htmlFor="code">
          Link Code
        </label>
        <input
          id="code"
          name="code"
          placeholder="Paste code from manager/admin portal"
          className={`${inputBase} ${focusRing} ${transitionFast} uppercase`}
        />
      </div>

      {state.error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
          {state.success}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
