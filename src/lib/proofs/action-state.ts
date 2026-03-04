export type ProofActionState = {
  error: string | null;
  success: string | null;
};

export const INITIAL_PROOF_ACTION_STATE: ProofActionState = {
  error: null,
  success: null,
};
