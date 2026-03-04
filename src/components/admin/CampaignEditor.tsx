"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  updateCampaignAction,
  updateCampaignStatusAction,
} from "@/lib/campaigns/actions";
import { INITIAL_CAMPAIGN_ACTION_STATE } from "@/lib/campaigns/action-state";

import { StatusBadge } from "@/components/admin/StatusBadge";

type CampaignLike = {
  id: string;
  title: string;
  description: string | null;
  objectives: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving..." : "Save Updates"}
    </button>
  );
}

function toDateInputValue(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

export function CampaignEditor({ campaign }: { campaign: CampaignLike }) {
  const [state, formAction] = useActionState(
    updateCampaignAction,
    INITIAL_CAMPAIGN_ACTION_STATE,
  );

  const nextStatusOptions =
    campaign.status === "draft"
      ? ["active", "archived"]
      : campaign.status === "active"
        ? ["completed", "archived"]
        : campaign.status === "completed"
          ? ["archived"]
          : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <p className="text-sm text-slate-500">Current Status</p>
          <div className="mt-1">
            <StatusBadge status={campaign.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {nextStatusOptions.map((status) => (
            <form key={status} action={updateCampaignStatusAction}>
              <input type="hidden" name="campaign_id" value={campaign.id} />
              <input type="hidden" name="next_status" value={status} />
              <button
                type="submit"
                className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold uppercase text-slate-700 hover:bg-slate-100"
              >
                Mark {status}
              </button>
            </form>
          ))}
        </div>
      </div>

      <form action={formAction} className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <input type="hidden" name="campaign_id" value={campaign.id} />

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            defaultValue={campaign.title}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={campaign.description ?? ""}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="objectives">
            Objectives
          </label>
          <textarea
            id="objectives"
            name="objectives"
            rows={3}
            defaultValue={campaign.objectives ?? ""}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="start_date">
              Start Date
            </label>
            <input
              id="start_date"
              name="start_date"
              type="date"
              defaultValue={toDateInputValue(campaign.start_date)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="end_date">
              End Date
            </label>
            <input
              id="end_date"
              name="end_date"
              type="date"
              defaultValue={toDateInputValue(campaign.end_date)}
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

        <div className="sticky bottom-4 rounded-lg border border-slate-200 bg-white/95 p-3 backdrop-blur">
          <SaveButton />
        </div>
      </form>
    </div>
  );
}
