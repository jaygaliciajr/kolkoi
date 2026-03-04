"use server";

import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/lib/auth/getSessionUser";
import { getCurrentInfluencer } from "@/lib/influencers/getCurrentInfluencer";
import { getSelectedOrgId } from "@/lib/org/getSelectedOrgId";
import { createClient } from "@/lib/supabase/server";
import { uploadProofScreenshotFiles } from "@/lib/proofs/media";
import { type ProofActionState } from "@/lib/proofs/action-state";

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

function normalizeText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function ensureInfluencerOwnsProof(input: {
  assignmentId: string;
  deliverableId: string;
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

  const { data: proof } = await supabase
    .from("post_proofs")
    .select("*")
    .eq("assignment_id", input.assignmentId)
    .eq("deliverable_id", input.deliverableId)
    .maybeSingle();

  if (!proof) {
    return { error: "Proof row not found for this deliverable." as const };
  }

  return { assignment, proof };
}

export async function submitProofAction(
  _: ProofActionState,
  formData: FormData,
): Promise<ProofActionState> {
  const assignmentId = formData.get("assignment_id");
  const deliverableId = formData.get("deliverable_id");
  if (typeof assignmentId !== "string" || typeof deliverableId !== "string") {
    return { error: "Assignment and deliverable are required.", success: null };
  }

  const ownership = await ensureInfluencerOwnsProof({ assignmentId, deliverableId });
  const ownershipError = getErrorMessage(ownership);
  if (ownershipError) {
    return { error: ownershipError, success: null };
  }

  const screenshotFiles = formData
    .getAll("screenshots")
    .filter((item): item is File => item instanceof File && item.size > 0);

  if (screenshotFiles.length === 0) {
    return { error: "At least one screenshot is required.", success: null };
  }

  const uploadedPaths = await uploadProofScreenshotFiles({
    orgId: ownership.assignment.org_id as string,
    assignmentId,
    files: screenshotFiles,
  });

  const postUrl = normalizeText(formData.get("post_url"));
  const status = postUrl ? "posted_pending" : "needs_url";
  const now = new Date().toISOString();
  const supabase = await createClient();

  const { error } = await supabase
    .from("post_proofs")
    .update({
      screenshot_urls: uploadedPaths,
      post_url: postUrl,
      posted_at: now,
      status,
      reject_reason: null,
    })
    .eq("id", ownership.proof.id)
    .eq("assignment_id", assignmentId)
    .eq("deliverable_id", deliverableId);

  if (error) {
    return { error: "Failed to submit proof.", success: null };
  }

  revalidatePath("/influencer/proofs");
  revalidatePath(`/influencer/campaigns/${assignmentId}`);
  revalidatePath(`/influencer/proofs/submit?assignmentId=${assignmentId}&deliverableId=${deliverableId}`);
  revalidatePath("/admin/proofs");

  return { error: null, success: "Proof submitted." };
}

async function ensureCampaignManagerForProof(proofId: string) {
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
    return { error: "Only campaign_manager can verify proofs." as const };
  }

  const { data: proof } = await supabase
    .from("post_proofs")
    .select("*")
    .eq("id", proofId)
    .maybeSingle();
  if (!proof) {
    return { error: "Proof not found." as const };
  }

  const { data: assignment } = await supabase
    .from("campaign_assignments")
    .select("id, org_id")
    .eq("id", proof.assignment_id)
    .maybeSingle();
  if (!assignment || assignment.org_id !== orgId) {
    return { error: "Proof not found in selected org." as const };
  }

  return { proof, user };
}

export async function verifyProofAction(
  _: ProofActionState,
  formData: FormData,
): Promise<ProofActionState> {
  const proofId = formData.get("proof_id");
  if (typeof proofId !== "string") {
    return { error: "Proof ID is required.", success: null };
  }

  const permissionCheck = await ensureCampaignManagerForProof(proofId);
  const permissionError = getErrorMessage(permissionCheck);
  if (permissionError) {
    return { error: permissionError, success: null };
  }

  const { proof, user } = permissionCheck as {
    proof: Record<string, unknown>;
    user: { id: string };
  };
  const now = new Date().toISOString();
  const supabase = await createClient();

  const { error: verifyError } = await supabase
    .from("post_proofs")
    .update({
      status: "verified",
      verified_at: now,
      verified_by: user.id,
      reject_reason: null,
    })
    .eq("id", proofId);

  if (verifyError) {
    return { error: "Failed to verify proof.", success: null };
  }

  const { data: milestones } = await supabase
    .from("payment_milestones")
    .select("*")
    .eq("assignment_id", proof.assignment_id)
    .eq("status", "pending");

  for (const milestone of milestones ?? []) {
    const label = typeof milestone.label === "string" ? milestone.label.toLowerCase() : "";
    if (label.includes("verified")) {
      const { error: milestoneError } = await supabase
        .from("payment_milestones")
        .update({ status: "ready", ready_at: now })
        .eq("id", milestone.id)
        .eq("status", "pending");
      if (milestoneError) {
        return {
          error: "Proof verified, but milestone readiness update failed.",
          success: null,
        };
      }
    }
  }

  revalidatePath("/admin/proofs");
  revalidatePath(`/admin/proofs/${proofId}`);
  revalidatePath("/influencer/proofs");
  revalidatePath(`/influencer/campaigns/${proof.assignment_id as string}`);

  return { error: null, success: "Proof verified." };
}

export async function rejectProofAction(
  _: ProofActionState,
  formData: FormData,
): Promise<ProofActionState> {
  const proofId = formData.get("proof_id");
  if (typeof proofId !== "string") {
    return { error: "Proof ID is required.", success: null };
  }

  const permissionCheck = await ensureCampaignManagerForProof(proofId);
  const permissionError = getErrorMessage(permissionCheck);
  if (permissionError) {
    return { error: permissionError, success: null };
  }

  const reason = normalizeText(formData.get("reject_reason"));
  const { proof } = permissionCheck as { proof: Record<string, unknown> };
  const supabase = await createClient();

  const { error } = await supabase
    .from("post_proofs")
    .update({
      status: "rejected",
      reject_reason: reason,
      verified_at: null,
      verified_by: null,
    })
    .eq("id", proofId);

  if (error) {
    return { error: "Failed to reject proof.", success: null };
  }

  revalidatePath("/admin/proofs");
  revalidatePath(`/admin/proofs/${proofId}`);
  revalidatePath("/influencer/proofs");
  revalidatePath(`/influencer/campaigns/${proof.assignment_id as string}`);

  return { error: null, success: "Proof rejected." };
}
