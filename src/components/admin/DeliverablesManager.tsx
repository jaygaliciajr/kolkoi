"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  createDeliverableAction,
  deleteDeliverableAction,
  updateDeliverableAction,
} from "@/lib/campaigns/actions";
import { INITIAL_CAMPAIGN_ACTION_STATE } from "@/lib/campaigns/action-state";

type DeliverableLike = {
  id: string;
  platform: string | null;
  required_post_count: number | null;
  required_hashtags: string[] | null;
  talking_points: string[] | null;
  due_at: string | null;
  payout_amount: number | null;
};

function tagsToList(value: string[] | null) {
  return Array.isArray(value) ? value : [];
}

function toDateTimeLocalValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function CreateButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Adding..." : "Add Deliverable"}
    </button>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving..." : "Save"}
    </button>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Deleting..." : "Delete"}
    </button>
  );
}

function DeliverableEditor({
  campaignId,
  deliverable,
}: {
  campaignId: string;
  deliverable: DeliverableLike;
}) {
  const [state, formAction] = useActionState(
    updateDeliverableAction,
    INITIAL_CAMPAIGN_ACTION_STATE,
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="campaign_id" value={campaignId} />
        <input type="hidden" name="deliverable_id" value={deliverable.id} />

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Platform</label>
            <select
              name="platform"
              defaultValue={deliverable.platform ?? "instagram"}
              className="ui-select"
            >
              <option value="facebook_page">facebook_page</option>
              <option value="instagram">instagram</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Required Post Count
            </label>
            <input
              name="required_post_count"
              type="number"
              min={1}
              defaultValue={deliverable.required_post_count ?? 1}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Required Hashtags (comma-separated)
            </label>
            <input
              name="required_hashtags"
              defaultValue={tagsToList(deliverable.required_hashtags).join(", ")}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Due At</label>
            <input
              name="due_at"
              type="datetime-local"
              defaultValue={toDateTimeLocalValue(deliverable.due_at)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Talking Points (one per line)
          </label>
          <textarea
            name="talking_points"
            rows={3}
            defaultValue={tagsToList(deliverable.talking_points).join("\n")}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Payout Amount</label>
          <input
            name="payout_amount"
            type="number"
            min={0}
            step="0.01"
            defaultValue={deliverable.payout_amount ?? 0}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
          />
        </div>

        <div className="flex gap-2">
          <SaveButton />
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

      <form action={deleteDeliverableAction} className="mt-2">
        <input type="hidden" name="campaign_id" value={campaignId} />
        <input type="hidden" name="deliverable_id" value={deliverable.id} />
        <DeleteButton />
      </form>

      <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
        <div className="mb-2 grid gap-2 sm:grid-cols-2">
          <p className="text-slate-700">
            <span className="font-medium">Platform:</span> {deliverable.platform ?? "-"}
          </p>
          <p className="text-slate-700">
            <span className="font-medium">Required Posts:</span>{" "}
            {deliverable.required_post_count ?? 1}
          </p>
          <p className="text-slate-700">
            <span className="font-medium">Due:</span>{" "}
            {deliverable.due_at ? new Date(deliverable.due_at).toLocaleString() : "-"}
          </p>
          <p className="text-slate-700">
            <span className="font-medium">Payout:</span>{" "}
            {typeof deliverable.payout_amount === "number"
              ? deliverable.payout_amount.toLocaleString()
              : "0"}
          </p>
        </div>
        <div className="mb-2 flex flex-wrap gap-2">
          {tagsToList(deliverable.required_hashtags).length === 0 ? (
            <span className="text-slate-500">No hashtags</span>
          ) : (
            tagsToList(deliverable.required_hashtags).map((hashtag, index) => (
              <span
                key={`${deliverable.id}-tag-${index}`}
                className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-700"
              >
                #{hashtag}
              </span>
            ))
          )}
        </div>
        <p className="font-medium text-slate-800">Checklist Preview</p>
        <ul className="mt-2 space-y-1 text-slate-700">
          {tagsToList(deliverable.talking_points).length === 0 ? (
            <li>- No talking points</li>
          ) : (
            tagsToList(deliverable.talking_points).map((point, index) => (
              <li key={`${deliverable.id}-tp-${index}`}>- {point}</li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

export function DeliverablesManager({
  campaignId,
  deliverables,
}: {
  campaignId: string;
  deliverables: DeliverableLike[];
}) {
  const [createState, createFormAction] = useActionState(
    createDeliverableAction,
    INITIAL_CAMPAIGN_ACTION_STATE,
  );

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-900">Add Deliverable</h2>
        <form action={createFormAction} className="mt-3 space-y-3">
          <input type="hidden" name="campaign_id" value={campaignId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Platform</label>
              <select
                name="platform"
                defaultValue="instagram"
                className="ui-select"
              >
                <option value="facebook_page">facebook_page</option>
                <option value="instagram">instagram</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Required Post Count
              </label>
              <input
                name="required_post_count"
                type="number"
                min={1}
                defaultValue={1}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Required Hashtags (comma-separated)
              </label>
              <input
                name="required_hashtags"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Due At</label>
              <input
                name="due_at"
                type="datetime-local"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Talking Points (one per line)
            </label>
            <textarea
              name="talking_points"
              rows={3}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Payout Amount</label>
            <input
              name="payout_amount"
              type="number"
              min={0}
              step="0.01"
              defaultValue={0}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
            />
          </div>

          {createState.error ? (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {createState.error}
            </p>
          ) : null}
          {createState.success ? (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {createState.success}
            </p>
          ) : null}

          <CreateButton />
        </form>
      </section>

      {deliverables.length === 0 ? (
        <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm text-slate-600">No deliverables yet.</p>
        </section>
      ) : (
        <section className="space-y-3">
          {deliverables.map((deliverable) => (
            <DeliverableEditor
              key={deliverable.id}
              campaignId={campaignId}
              deliverable={deliverable}
            />
          ))}
        </section>
      )}

      {deliverables.length > 0 ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Next step: Invite influencers to this campaign.
        </div>
      ) : null}
    </div>
  );
}
