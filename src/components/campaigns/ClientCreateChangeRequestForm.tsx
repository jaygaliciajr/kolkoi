"use client";

import { useActionState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  clientCreateChangeRequestAction,
  INITIAL_CAMPAIGN_LIFECYCLE_ACTION_STATE,
} from "@/lib/campaigns/lifecycle-actions";
import { Button } from "@/components/ui/Button";

type LockedCampaignOption = {
  id: string;
  title: string;
  versionNumber: number;
};

export function ClientCreateChangeRequestForm({
  campaigns,
  initialCampaignId,
}: {
  campaigns: LockedCampaignOption[];
  initialCampaignId?: string | null;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [state, formAction, pending] = useActionState(
    clientCreateChangeRequestAction,
    INITIAL_CAMPAIGN_LIFECYCLE_ACTION_STATE,
  );

  const defaultCampaignId = useMemo(() => {
    if (initialCampaignId && campaigns.some((campaign) => campaign.id === initialCampaignId)) {
      return initialCampaignId;
    }
    return campaigns[0]?.id ?? "";
  }, [campaigns, initialCampaignId]);

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
      return;
    }

    if (state.success) {
      toast.success(state.success);
      formRef.current?.reset();
      router.refresh();
    }
  }, [router, state.error, state.success]);

  if (campaigns.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/70 p-4 text-sm text-muted">
        No locked campaigns available yet. Change requests are available only after a manager locks a campaign.
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-3 rounded-xl border border-border bg-surface/80 p-4">
      <div className="space-y-1.5">
        <label htmlFor="campaign_id" className="text-sm font-medium text-text">
          Locked campaign
        </label>
        <select
          id="campaign_id"
          name="campaign_id"
          required
          defaultValue={defaultCampaignId}
          className="ui-select"
        >
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.title} (v{campaign.versionNumber})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="request_note" className="text-sm font-medium text-text">
          Change request note
        </label>
        <textarea
          id="request_note"
          name="request_note"
          required
          rows={4}
          placeholder="Describe what needs to change after lock."
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-primary/30"
        />
        <p className="text-xs text-muted">
          Manager approval will create a new campaign version and cancel existing invites for re-invite.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" loading={pending}>
          Submit Change Request
        </Button>
      </div>
    </form>
  );
}

export type { LockedCampaignOption };
