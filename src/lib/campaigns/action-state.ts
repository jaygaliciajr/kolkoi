export type CampaignActionState = {
  error: string | null;
  success: string | null;
};

export const INITIAL_CAMPAIGN_ACTION_STATE: CampaignActionState = {
  error: null,
  success: null,
};
