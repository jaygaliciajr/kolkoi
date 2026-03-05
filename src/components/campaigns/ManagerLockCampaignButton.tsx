"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  INITIAL_CAMPAIGN_LIFECYCLE_ACTION_STATE,
  managerLockCampaignAction,
} from "@/lib/campaigns/lifecycle-actions";
import { Button } from "@/components/ui/Button";

function formatDateTime(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

export function ManagerLockCampaignButton({
  campaignId,
  isLocked,
  lockedAt,
  clientApprovedAt,
}: {
  campaignId: string;
  isLocked: boolean;
  lockedAt: string | null;
  clientApprovedAt: string | null;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    managerLockCampaignAction,
    INITIAL_CAMPAIGN_LIFECYCLE_ACTION_STATE,
  );

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
      return;
    }

    if (state.success) {
      toast.success(state.success);
      router.refresh();
    }
  }, [router, state.error, state.success]);

  if (isLocked) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
        Campaign locked on {formatDateTime(lockedAt) ?? "-"}. Locking is irreversible.
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="campaign_id" value={campaignId} />
      <Button type="submit" loading={pending} disabled={!clientApprovedAt}>
        Lock Campaign
      </Button>
      {!clientApprovedAt ? (
        <p className="text-xs text-amber-600 dark:text-amber-300">
          Lock is disabled until client approval is recorded.
        </p>
      ) : (
        <p className="text-xs text-muted">Once locked, changes require a client change request and campaign versioning.</p>
      )}
    </form>
  );
}
