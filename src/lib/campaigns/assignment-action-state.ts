export type AssignmentActionState = {
  error: string | null;
  success: string | null;
};

export const INITIAL_ASSIGNMENT_ACTION_STATE: AssignmentActionState = {
  error: null,
  success: null,
};
