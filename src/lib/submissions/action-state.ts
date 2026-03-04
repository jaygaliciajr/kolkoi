export type SubmissionActionState = {
  error: string | null;
  success: string | null;
};

export const INITIAL_SUBMISSION_ACTION_STATE: SubmissionActionState = {
  error: null,
  success: null,
};

export type SubmissionReviewActionState = {
  error: string | null;
  success: string | null;
};

export const INITIAL_SUBMISSION_REVIEW_ACTION_STATE: SubmissionReviewActionState = {
  error: null,
  success: null,
};
