"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  createOrganizationAction,
} from "@/lib/org/actions";
import { INITIAL_CREATE_ORG_STATE } from "@/lib/org/action-state";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Creating..." : "Create Organization"}
    </button>
  );
}

export default function CreateOrgPage() {
  const [state, formAction] = useActionState(
    createOrganizationAction,
    INITIAL_CREATE_ORG_STATE,
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 sm:p-6">
      <section className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h1 className="text-2xl font-semibold text-slate-900">Create Organization</h1>
        <p className="mt-1 text-sm text-slate-600">
          Set up your organization to start using the admin portal.
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="name">
              Organization Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={120}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
              placeholder="Acme Brand"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="tier">
              Tier
            </label>
            <select
              id="tier"
              name="tier"
              defaultValue="starter"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
            >
              <option value="starter">starter</option>
              <option value="pro">pro</option>
              <option value="enterprise">enterprise</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="logo">
              Logo Upload (optional)
            </label>
            <input
              id="logo"
              name="logo"
              type="file"
              accept="image/*"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
            />
          </div>

          {state.error ? (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {state.error}
            </p>
          ) : null}

          <SubmitButton />
        </form>
      </section>
    </main>
  );
}
