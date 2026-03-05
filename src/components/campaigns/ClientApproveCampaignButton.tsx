"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  clientApproveCampaignAction,
  INITIAL_CAMPAIGN_LIFECYCLE_ACTION_STATE,
} from "@/lib/campaigns/lifecycle-actions";
import { Button } from "@/components/ui/Button";

function formatDateTime(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

export function ClientApproveCampaignButton({
  campaignId,
  approvedAt,
  compact = false,
}: {
  campaignId: string;
  approvedAt: string | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    clientApproveCampaignAction,
    INITIAL_CAMPAIGN_LIFECYCLE_ACTION_STATE,
  );

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success) {
      toast.success(state.success);
      router.refresh();
    }
  }, [router, state.error, state.success]);

  if (approvedAt) {
    if (compact) {
      return <p className="text-xs font-medium text-emerald-600 dark:text-emerald-300">Approved</p>;
    }

    return (
      <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
        Client approval recorded on {formatDateTime(approvedAt) ?? "-"}.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="campaign_id" value={campaignId} />
      <Button type="submit" loading={pending} size={compact ? "sm" : "md"}>
        {compact ? "Approve Campaign" : "Approve Campaign for Lock"}
      </Button>
      {compact ? null : (
        <p className="text-xs text-muted">
          Approval enables manager campaign lock. This cannot be undone once locked.
        </p>
      )}
    </form>
  );
}
