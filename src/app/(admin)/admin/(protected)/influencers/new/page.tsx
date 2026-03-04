"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  createInfluencerAction,
} from "@/lib/influencers/actions";
import { INITIAL_INFLUENCER_ACTION_STATE } from "@/lib/influencers/action-state";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving..." : "Create Influencer"}
    </button>
  );
}

export default function NewInfluencerPage() {
  const [state, formAction] = useActionState(
    createInfluencerAction,
    INITIAL_INFLUENCER_ACTION_STATE,
  );

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Add Influencer</h1>
        <Link
          href="/admin/influencers"
          className="text-sm font-medium text-slate-700 underline hover:text-slate-900"
        >
          Back to list
        </Link>
      </div>

      <form action={formAction} className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="full_name">
            Full Name
          </label>
          <input
            id="full_name"
            name="full_name"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="phone">
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="location">
            Location
          </label>
          <input
            id="location"
            name="location"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="fb_page_url">
              FB Page URL
            </label>
            <input
              id="fb_page_url"
              name="fb_page_url"
              type="url"
              placeholder="https://facebook.com/..."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="ig_handle">
              IG Handle
            </label>
            <input
              id="ig_handle"
              name="ig_handle"
              placeholder="username"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              className="mb-1 block text-sm font-medium text-slate-700"
              htmlFor="follower_count"
            >
              Follower Count
            </label>
            <input
              id="follower_count"
              name="follower_count"
              type="number"
              min={0}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
            />
          </div>
          <div>
            <label
              className="mb-1 block text-sm font-medium text-slate-700"
              htmlFor="engagement_rate"
            >
              Engagement Rate
            </label>
            <input
              id="engagement_rate"
              name="engagement_rate"
              type="number"
              step="0.01"
              min={0}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="tags">
            Tags (comma-separated)
          </label>
          <input
            id="tags"
            name="tags"
            placeholder="gaming, lifestyle, beauty"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
          />
        </div>

        {state.error ? (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
        ) : null}

        <SubmitButton />
      </form>
    </div>
  );
}
