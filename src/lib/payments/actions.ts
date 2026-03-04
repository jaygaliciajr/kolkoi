"use server";

import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/lib/auth/getSessionUser";
import { getSelectedOrgId } from "@/lib/org/getSelectedOrgId";
import { createClient } from "@/lib/supabase/server";
import { type MarkPaidActionState } from "@/lib/payments/action-state";

function normalizeText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePositiveAmount(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Number(parsed.toFixed(2));
}

async function ensureFinanceOrOrgAdmin(input: { assignmentId: string; milestoneId: string }) {
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

  if (role !== "finance" && role !== "org_admin") {
    return { error: "Only finance or org_admin can mark milestones as paid." as const };
  }

  const { data: assignment } = await supabase
    .from("campaign_assignments")
    .select("id, org_id")
    .eq("id", input.assignmentId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!assignment) {
    return { error: "Assignment not found in selected org." as const };
  }

  const { data: milestone } = await supabase
    .from("payment_milestones")
    .select("*")
    .eq("id", input.milestoneId)
    .eq("assignment_id", input.assignmentId)
    .maybeSingle();
  if (!milestone) {
    return { error: "Milestone not found." as const };
  }

  return { user, assignment, milestone };
}

function hasPermissionError(
  value:
    | { error: string }
    | { user: { id: string }; assignment: { org_id: string }; milestone: Record<string, unknown> },
): value is { error: string } {
  return "error" in value;
}

export async function markMilestonePaidAction(
  _: MarkPaidActionState,
  formData: FormData,
): Promise<MarkPaidActionState> {
  const assignmentId = formData.get("assignment_id");
  const milestoneId = formData.get("milestone_id");
  const method = normalizeText(formData.get("method"));
  const referenceNo = normalizeText(formData.get("reference_no"));
  const amount = normalizePositiveAmount(formData.get("amount"));
  const notes = normalizeText(formData.get("notes"));

  if (typeof assignmentId !== "string" || typeof milestoneId !== "string") {
    return { error: "Assignment and milestone are required.", success: null };
  }
  if (!method) {
    return { error: "Payment method is required.", success: null };
  }
  if (amount === null) {
    return { error: "Amount must be greater than 0.", success: null };
  }

  const permissionCheck = await ensureFinanceOrOrgAdmin({ assignmentId, milestoneId });
  if (hasPermissionError(permissionCheck)) {
    return { error: permissionCheck.error, success: null };
  }

  const { user, assignment, milestone } = permissionCheck;
  if (milestone.status !== "ready") {
    return { error: "Only ready milestones can be marked paid.", success: null };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("payment_milestones")
    .update({
      status: "paid",
      paid_at: now,
      paid_by: user.id,
    })
    .eq("id", milestoneId)
    .eq("assignment_id", assignmentId)
    .eq("status", "ready");

  if (updateError) {
    return { error: "Failed to mark milestone paid.", success: null };
  }

  const { error: transactionError } = await supabase.from("payment_transactions").insert({
    org_id: assignment.org_id,
    assignment_id: assignmentId,
    milestone_id: milestoneId,
    method,
    reference_no: referenceNo,
    amount,
    notes,
    created_by: user.id,
  });

  if (transactionError) {
    return {
      error: "Milestone marked paid, but transaction log failed. Please check data.",
      success: null,
    };
  }

  revalidatePath("/admin/payments");
  revalidatePath(`/admin/payments/${assignmentId}`);
  revalidatePath("/influencer/payments");
  revalidatePath(`/influencer/payments/${assignmentId}`);

  return { error: null, success: "Milestone marked as paid." };
}
