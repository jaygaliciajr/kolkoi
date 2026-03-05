export type CampaignLifecycleActionState = {
  error: string | null;
  success: string | null;
  meta?: {
    oldCampaignId?: string;
    newCampaignId?: string;
    canceledAssignmentCount?: number;
    changeRequestId?: string;
  } | null;
};

export const INITIAL_CAMPAIGN_LIFECYCLE_ACTION_STATE: CampaignLifecycleActionState = {
  error: null,
  success: null,
  meta: null,
};
