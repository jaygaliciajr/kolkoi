"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  sendCampaignInvitesAction,
} from "@/lib/campaigns/assignmentActions";
import { INITIAL_ASSIGNMENT_ACTION_STATE } from "@/lib/campaigns/assignment-action-state";

type InfluencerOption = {
  id: string;
  full_name: string;
  tags: string[];
  ig_handle: string | null;
  fb_page_url: string | null;
};

function SendInvitesButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Sending..." : "Send Invites"}
    </button>
  );
}

export function CampaignInviteManager({
  campaignId,
  influencers,
}: {
  campaignId: string;
  influencers: InfluencerOption[];
}) {
  const [state, formAction] = useActionState(
    sendCampaignInvitesAction,
    INITIAL_ASSIGNMENT_ACTION_STATE,
  );
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const allTags = useMemo(
    () => Array.from(new Set(influencers.flatMap((item) => item.tags))).sort(),
    [influencers],
  );

  const filtered = useMemo(() => {
    return influencers.filter((item) => {
      const matchesQuery =
        query.trim().length === 0 ||
        item.full_name.toLowerCase().includes(query.toLowerCase());
      const matchesTag = tag.length === 0 || item.tags.includes(tag);
      return matchesQuery && matchesTag;
    });
  }, [influencers, query, tag]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold text-slate-900">Invite Influencers</h2>

      <div className="grid gap-3 sm:grid-cols-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring sm:col-span-2"
        />
        <select
          value={tag}
          onChange={(event) => setTag(event.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
        >
          <option value="">All tags</option>
          {allTags.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className="max-h-80 space-y-2 overflow-y-auto rounded-md border border-slate-200 p-2">
        {filtered.length === 0 ? (
          <p className="p-3 text-sm text-slate-500">No influencers match your filters.</p>
        ) : (
          filtered.map((influencer) => (
            <label
              key={influencer.id}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 p-3 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={selected.includes(influencer.id)}
                onChange={() => toggle(influencer.id)}
                className="mt-1"
              />
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{influencer.full_name}</p>
                <p className="text-xs text-slate-500">
                  {influencer.ig_handle ? `@${influencer.ig_handle}` : "No IG"} |{" "}
                  {influencer.fb_page_url ? "Has FB page" : "No FB page"}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {influencer.tags.map((item, index) => (
                    <span
                      key={`${influencer.id}-tag-${index}`}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </label>
          ))
        )}
      </div>

      <form action={formAction} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="campaign_id" value={campaignId} />
        <input type="hidden" name="selected_influencer_ids" value={selected.join(",")} />
        <SendInvitesButton />
        <span className="text-sm text-slate-600">{selected.length} selected</span>
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
