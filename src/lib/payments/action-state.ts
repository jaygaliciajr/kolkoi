export type MarkPaidActionState = {
  error: string | null;
  success: string | null;
};

export const INITIAL_MARK_PAID_ACTION_STATE: MarkPaidActionState = {
  error: null,
  success: null,
};
