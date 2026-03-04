export type InfluencerActionState = {
  error: string | null;
  success: string | null;
};

export type LinkCodeActionState = InfluencerActionState & {
  generatedCode: string | null;
  status: "Active" | "Expired" | "Used" | null;
};

export const INITIAL_INFLUENCER_ACTION_STATE: InfluencerActionState = {
  error: null,
  success: null,
};

export const INITIAL_LINK_CODE_ACTION_STATE: LinkCodeActionState = {
  error: null,
  success: null,
  generatedCode: null,
  status: null,
};
