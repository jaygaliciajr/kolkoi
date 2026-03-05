"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import {
  INITIAL_CAMPAIGN_LIFECYCLE_ACTION_STATE,
  managerReviewChangeRequestAction,
} from "@/lib/campaigns/lifecycle-actions";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";

type CampaignChangeRequestItem = {
  id: string;
  campaignId: string;
  requestNote: string;
  status: string;
  createdAt: string | null;
  reviewedAt: string | null;
  resolutionNote: string | null;
  implementedCampaignId: string | null;
};

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function ChangeRequestReviewRow({
  request,
}: {
  request: CampaignChangeRequestItem;
}) {
  const [state, formAction, pending] = useActionState(
    managerReviewChangeRequestAction,
    INITIAL_CAMPAIGN_LIFECYCLE_ACTION_STATE,
  );

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
      return;
    }

    if (state.success) {
      toast.success(state.success);
    }
  }, [state.error, state.success]);

  const isOpen = request.status === "open";
  const implementedCampaignId =
    (state.meta?.newCampaignId as string | undefined) ?? request.implementedCampaignId;
  const canceledAssignmentCount = state.meta?.canceledAssignmentCount;

  return (
    <article className="rounded-xl border border-border bg-surface/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={request.status} />
          <p className="text-xs text-muted">Created {formatDateTime(request.createdAt)}</p>
          {request.reviewedAt ? (
            <p className="text-xs text-muted">Reviewed {formatDateTime(request.reviewedAt)}</p>
          ) : null}
        </div>
        {implementedCampaignId ? (
          <Link
            href={`/admin/campaigns/${implementedCampaignId}`}
            className="text-xs font-medium text-primary hover:underline"
          >
            Open new version
          </Link>
        ) : null}
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm text-text">{request.requestNote}</p>

      {request.resolutionNote ? (
        <p className="mt-3 text-xs text-muted">Manager note: {request.resolutionNote}</p>
      ) : null}

      {isOpen ? (
        <form action={formAction} className="mt-4 space-y-3">
          <input type="hidden" name="campaign_id" value={request.campaignId} />
          <input type="hidden" name="change_request_id" value={request.id} />

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">Review note (optional)</span>
            <textarea
              name="review_note"
              rows={2}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Add context for your decision"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" name="decision" value="approve" loading={pending}>
              Approve and Create New Version
            </Button>
            <Button type="submit" name="decision" value="reject" variant="secondary" loading={pending}>
              Reject Request
            </Button>
          </div>
        </form>
      ) : null}

      {state.success && state.meta?.newCampaignId ? (
        <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-700 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-300">
          New campaign version created.{' '}
          <Link href={`/admin/campaigns/${state.meta.newCampaignId}`} className="font-medium underline">
            Open version {state.meta.newCampaignId.slice(0, 8)}
          </Link>
          {typeof canceledAssignmentCount === "number" ? (
            <span> and re-invite required for {canceledAssignmentCount} assignment(s).</span>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function CampaignChangeRequestReviewPanel({
  requests,
}: {
  requests: CampaignChangeRequestItem[];
}) {
  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/70 p-6 text-sm text-muted">
        No change requests submitted for this campaign.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <ChangeRequestReviewRow key={request.id} request={request} />
      ))}
    </div>
  );
}

export type { CampaignChangeRequestItem };
