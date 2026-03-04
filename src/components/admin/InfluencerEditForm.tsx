"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  updateInfluencerAction,
} from "@/lib/influencers/actions";
import { INITIAL_INFLUENCER_ACTION_STATE } from "@/lib/influencers/action-state";

type InfluencerLike = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  notes: string | null;
  fb_page_url: string | null;
  ig_handle: string | null;
  follower_count: number | null;
  engagement_rate: number | null;
  tags: string[] | null;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving..." : "Save Changes"}
    </button>
  );
}

export function InfluencerEditForm({ influencer }: { influencer: InfluencerLike }) {
  const [state, formAction] = useActionState(
    updateInfluencerAction,
    INITIAL_INFLUENCER_ACTION_STATE,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="influencer_id" value={influencer.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="full_name">
            Full Name
          </label>
          <input
            id="full_name"
            name="full_name"
            required
            defaultValue={influencer.full_name}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={influencer.email ?? ""}
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
            defaultValue={influencer.phone ?? ""}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="location">
            Location
          </label>
          <input
            id="location"
            name="location"
            defaultValue={influencer.location ?? ""}
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
            defaultValue={influencer.ig_handle ?? ""}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="fb_page_url">
            FB Page URL
          </label>
          <input
            id="fb_page_url"
            name="fb_page_url"
            type="url"
            defaultValue={influencer.fb_page_url ?? ""}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
          />
        </div>

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
            defaultValue={influencer.follower_count ?? ""}
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
            defaultValue={influencer.engagement_rate ?? ""}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="tags">
            Tags (comma-separated)
          </label>
          <input
            id="tags"
            name="tags"
            defaultValue={(influencer.tags ?? []).join(", ")}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            defaultValue={influencer.notes ?? ""}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
          />
        </div>
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
