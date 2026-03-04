"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/getSessionUser";
import { getSelectedOrgId } from "@/lib/org/getSelectedOrgId";
import { getCurrentInfluencer } from "@/lib/influencers/getCurrentInfluencer";
import { createClient } from "@/lib/supabase/server";
import { uploadSubmissionMediaFiles } from "@/lib/submissions/media";
import {
  type SubmissionActionState,
  type SubmissionReviewActionState,
} from "@/lib/submissions/action-state";

function getErrorMessage(value: unknown): string | null {
  if (
    value &&
    typeof value === "object" &&
    "error" in value &&
    typeof (value as { error?: unknown }).error === "string"
  ) {
    return (value as { error: string }).error;
  }
  return null;
}

function getIntent(formData: FormData) {
  const intent = formData.get("intent");
  return intent === "submit" ? "submit" : "draft";
}

function normalizeText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function ensureInfluencerOwnsAssignment(input: {
  assignmentId: string;
  deliverableId?: string;
}) {
  const influencer = await getCurrentInfluencer();
  if (!influencer) {
    return { error: "Influencer account is not linked." as const };
  }

  const supabase = await createClient();
  const { data: assignment } = await supabase
    .from("campaign_assignments")
    .select("*")
    .eq("id", input.assignmentId)
    .eq("influencer_id", influencer.id)
    .eq("status", "accepted")
    .maybeSingle();

  if (!assignment) {
    return { error: "Assignment not found or not accepted." as const };
  }

  if (input.deliverableId) {
    const { data: deliverable } = await supabase
      .from("campaign_deliverables")
      .select("id")
      .eq("id", input.deliverableId)
      .eq("campaign_id", assignment.campaign_id)
      .eq("org_id", assignment.org_id)
      .maybeSingle();
    if (!deliverable) {
      return { error: "Deliverable not found for this assignment." as const };
    }
  }

  return { assignment, influencer };
}

export async function createSubmissionAction(
  _: SubmissionActionState,
  formData: FormData,
): Promise<SubmissionActionState> {
  const assignmentId = formData.get("assignment_id");
  const deliverableId = formData.get("deliverable_id");

  if (typeof assignmentId !== "string" || typeof deliverableId !== "string") {
    return { error: "Assignment and deliverable are required.", success: null };
  }

  const ownerCheck = await ensureInfluencerOwnsAssignment({
    assignmentId,
    deliverableId,
  });
  const ownerError = getErrorMessage(ownerCheck);
  if (ownerError) {
    return { error: ownerError, success: null };
  }

  const { assignment } = ownerCheck;
  const supabase = await createClient();

  const { data: latestSubmission } = await supabase
    .from("content_submissions")
    .select("*")
    .eq("assignment_id", assignmentId)
    .eq("deliverable_id", deliverableId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const intent = getIntent(formData);
  let version = 1;

  if (latestSubmission) {
    if (
      latestSubmission.status === "needs_revision" &&
      intent === "submit"
    ) {
      version = (typeof latestSubmission.version === "number" ? latestSubmission.version : 1) + 1;
    } else {
      return {
        error: "A current submission already exists. Open it from Submissions.",
        success: null,
      };
    }
  }

  const mediaFiles = formData
    .getAll("media")
    .filter((item): item is File => item instanceof File && item.size > 0);
  const uploadedPaths = await uploadSubmissionMediaFiles({
    orgId: assignment.org_id as string,
    assignmentId,
    files: mediaFiles,
  });

  const now = new Date().toISOString();
  const { data: inserted, error } = await supabase
    .from("content_submissions")
    .insert({
      org_id: assignment.org_id,
      assignment_id: assignmentId,
      deliverable_id: deliverableId,
      version,
      status: intent === "submit" ? "submitted" : "draft",
      submitted_at: intent === "submit" ? now : null,
      caption: normalizeText(formData.get("caption")),
      notes: normalizeText(formData.get("notes")),
      media_urls: uploadedPaths,
      updated_at: now,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { error: "Failed to create submission.", success: null };
  }

  revalidatePath("/influencer/submissions");
  revalidatePath(`/influencer/campaigns/${assignmentId}`);
  redirect(`/influencer/submissions/${inserted.id}`);
}

export async function updateSubmissionAction(
  _: SubmissionActionState,
  formData: FormData,
): Promise<SubmissionActionState> {
  const submissionId = formData.get("submission_id");
  if (typeof submissionId !== "string") {
    return { error: "Submission ID is required.", success: null };
  }

  const influencer = await getCurrentInfluencer();
  if (!influencer) {
    return { error: "Influencer account is not linked.", success: null };
  }

  const supabase = await createClient();
  const { data: submission } = await supabase
    .from("content_submissions")
    .select("*")
    .eq("id", submissionId)
    .maybeSingle();
  if (!submission) {
    return { error: "Submission not found.", success: null };
  }

  const { data: assignment } = await supabase
    .from("campaign_assignments")
    .select("*")
    .eq("id", submission.assignment_id)
    .eq("influencer_id", influencer.id)
    .eq("status", "accepted")
    .maybeSingle();
  if (!assignment) {
    return { error: "You do not have permission to edit this submission.", success: null };
  }
  if (submission.status !== "draft") {
    return {
      error: "Only draft submissions can be edited. Create a new version for revisions.",
      success: null,
    };
  }

  const mediaFiles = formData
    .getAll("media")
    .filter((item): item is File => item instanceof File && item.size > 0);
  const uploadedPaths = await uploadSubmissionMediaFiles({
    orgId: assignment.org_id as string,
    assignmentId: assignment.id as string,
    files: mediaFiles,
  });

  const existingPaths = Array.isArray(submission.media_urls)
    ? submission.media_urls.filter((item: unknown): item is string => typeof item === "string")
    : [];
  const intent = getIntent(formData);
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("content_submissions")
    .update({
      caption: normalizeText(formData.get("caption")),
      notes: normalizeText(formData.get("notes")),
      media_urls: [...existingPaths, ...uploadedPaths],
      status: intent === "submit" ? "submitted" : "draft",
      submitted_at: intent === "submit" ? now : submission.submitted_at,
      updated_at: now,
    })
    .eq("id", submissionId)
    .eq("assignment_id", assignment.id);

  if (error) {
    return { error: "Failed to update submission.", success: null };
  }

  revalidatePath("/influencer/submissions");
  revalidatePath(`/influencer/submissions/${submissionId}`);
  revalidatePath(`/influencer/campaigns/${assignment.id as string}`);
  return { error: null, success: "Submission saved." };
}

export async function addSubmissionCommentAction(
  _: SubmissionActionState,
  formData: FormData,
): Promise<SubmissionActionState> {
  const user = await getSessionUser();
  if (!user) {
    return { error: "Session expired. Please log in again.", success: null };
  }

  const submissionId = formData.get("submission_id");
  const comment = normalizeText(formData.get("comment"));
  if (typeof submissionId !== "string" || !comment) {
    return { error: "Comment is required.", success: null };
  }

  const supabase = await createClient();
  const { data: submission } = await supabase
    .from("content_submissions")
    .select("*")
    .eq("id", submissionId)
    .maybeSingle();
  if (!submission) {
    return { error: "Submission not found.", success: null };
  }

  const { data: assignment } = await supabase
    .from("campaign_assignments")
    .select("*")
    .eq("id", submission.assignment_id)
    .maybeSingle();
  if (!assignment) {
    return { error: "Assignment not found.", success: null };
  }

  const influencer = await getCurrentInfluencer();
  const isInfluencerOwner = influencer && assignment.influencer_id === influencer.id;
  let isAdminMember = false;
  if (!isInfluencerOwner) {
    const { data: orgMember } = await supabase
      .from("org_members")
      .select("id")
      .eq("org_id", assignment.org_id)
      .eq("user_id", user.id)
      .maybeSingle();
    isAdminMember = Boolean(orgMember);
  }

  if (!isInfluencerOwner && !isAdminMember) {
    return { error: "You cannot comment on this submission.", success: null };
  }

  const { error } = await supabase.from("submission_comments").insert({
    submission_id: submissionId,
    user_id: user.id,
    body: comment,
  });

  if (error) {
    return { error: "Failed to post comment.", success: null };
  }

  revalidatePath(`/influencer/submissions/${submissionId}`);
  revalidatePath(`/admin/approvals/${submissionId}`);
  return { error: null, success: "Comment posted." };
}

async function ensureCampaignManagerForSubmission(submissionId: string) {
  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return { error: "No organization selected." as const };
  }

  const user = await getSessionUser();
  if (!user) {
    return { error: "Session expired. Please log in again." as const };
  }

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("org_members")
    .select("*")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  const role =
    (member && typeof member.role === "string" && member.role) ||
    (member && typeof member.role_type === "string" && member.role_type) ||
    null;

  if (role !== "campaign_manager") {
    return { error: "Only campaign_manager can review submissions." as const };
  }

  const { data: submission } = await supabase
    .from("content_submissions")
    .select("*")
    .eq("id", submissionId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (!submission) {
    return { error: "Submission not found in selected org." as const };
  }

  return { submission, user };
}

export async function approveSubmissionAction(
  _: SubmissionReviewActionState,
  formData: FormData,
): Promise<SubmissionReviewActionState> {
  const submissionId = formData.get("submission_id");
  if (typeof submissionId !== "string") {
    return { error: "Submission ID is required.", success: null };
  }

  const permissionCheck = await ensureCampaignManagerForSubmission(submissionId);
  const permissionError = getErrorMessage(permissionCheck);
  if (permissionError) {
    return { error: permissionError, success: null };
  }
  const { submission, user } = permissionCheck as {
    submission: Record<string, unknown>;
    user: { id: string };
  };

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error: submissionUpdateError } = await supabase
    .from("content_submissions")
    .update({
      status: "approved",
      reviewed_at: now,
      reviewed_by: user.id,
      updated_at: now,
    })
    .eq("id", submissionId);
  if (submissionUpdateError) {
    return { error: "Failed to approve submission.", success: null };
  }

  const { data: milestones } = await supabase
    .from("payment_milestones")
    .select("*")
    .eq("assignment_id", submission.assignment_id)
    .eq("status", "pending");

  for (const milestone of milestones ?? []) {
    const label = typeof milestone.label === "string" ? milestone.label.toLowerCase() : "";
    const trigger =
      typeof milestone.trigger === "string" ? milestone.trigger.toLowerCase() : "";
    if (label.includes("approved") || trigger === "approved") {
      const { error: milestoneError } = await supabase
        .from("payment_milestones")
        .update({ status: "ready", ready_at: now })
        .eq("id", milestone.id)
        .eq("status", "pending");
      if (milestoneError) {
        return {
          error: "Submission approved, but milestone update failed.",
          success: null,
        };
      }
    }
  }

  revalidatePath("/admin/approvals");
  revalidatePath(`/admin/approvals/${submissionId}`);
  revalidatePath("/influencer/submissions");
  revalidatePath(`/influencer/submissions/${submissionId}`);
  return { error: null, success: "Submission approved." };
}

export async function requestRevisionAction(
  _: SubmissionReviewActionState,
  formData: FormData,
): Promise<SubmissionReviewActionState> {
  const submissionId = formData.get("submission_id");
  if (typeof submissionId !== "string") {
    return { error: "Submission ID is required.", success: null };
  }

  const permissionCheck = await ensureCampaignManagerForSubmission(submissionId);
  const permissionError = getErrorMessage(permissionCheck);
  if (permissionError) {
    return { error: permissionError, success: null };
  }
  const { user } = permissionCheck as { user: { id: string } };
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error: revisionError } = await supabase
    .from("content_submissions")
    .update({
      status: "needs_revision",
      reviewed_at: now,
      reviewed_by: user.id,
      updated_at: now,
    })
    .eq("id", submissionId);
  if (revisionError) {
    return { error: "Failed to request revision.", success: null };
  }

  const { error: commentError } = await supabase.from("submission_comments").insert({
    submission_id: submissionId,
    user_id: user.id,
    body: "Revision requested",
  });
  if (commentError) {
    return {
      error: "Revision requested, but auto-comment could not be added.",
      success: null,
    };
  }

  revalidatePath("/admin/approvals");
  revalidatePath(`/admin/approvals/${submissionId}`);
  revalidatePath("/influencer/submissions");
  revalidatePath(`/influencer/submissions/${submissionId}`);
  return { error: null, success: "Revision requested." };
}
