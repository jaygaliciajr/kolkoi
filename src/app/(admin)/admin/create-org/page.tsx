"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  createOrganizationAction,
} from "@/lib/org/actions";
import { INITIAL_CREATE_ORG_STATE } from "@/lib/org/action-state";
import { Button } from "@/components/ui/Button";
import { focusRing, inputBase, transitionFast } from "@/lib/ui/tokens";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      loading={pending}
      className="w-full"
    >
      {pending ? "Creating..." : "Create Organization"}
    </Button>
  );
}

export default function CreateOrgPage() {
  const [state, formAction] = useActionState(
    createOrganizationAction,
    INITIAL_CREATE_ORG_STATE,
  );

  return (
    <main className="flex min-h-[calc(100dvh-9rem)] items-center justify-center p-4 sm:p-6">
      <section className="w-full max-w-lg rounded-[var(--radius-2xl)] border border-border/70 bg-surface/80 p-5 text-text shadow-[var(--shadow-soft)] backdrop-blur-md sm:p-6">
        <h1 className="text-2xl font-semibold text-text">Create Organization</h1>
        <p className="mt-1 text-sm text-muted">
          Set up your organization to start using the admin portal.
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text" htmlFor="name">
              Organization Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={120}
              className={`${inputBase} ${focusRing} ${transitionFast}`}
              placeholder="Acme Brand"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text" htmlFor="tier">
              Tier
            </label>
            <select id="tier" name="tier" defaultValue="starter" className="ui-select">
              <option value="starter">starter</option>
              <option value="pro">pro</option>
              <option value="enterprise">enterprise</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text" htmlFor="logo">
              Logo Upload (optional)
            </label>
            <input
              id="logo"
              name="logo"
              type="file"
              accept="image/*"
              className={`${inputBase} ${focusRing} ${transitionFast} file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-text hover:file:bg-surface-2/80`}
            />
          </div>

          {state.error ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
              {state.error}
            </p>
          ) : null}

          <SubmitButton />
        </form>
      </section>
    </main>
  );
}
