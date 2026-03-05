"use server";

import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/lib/auth/getSessionUser";
import {
  INITIAL_CAMPAIGN_LIFECYCLE_ACTION_STATE,
  type CampaignLifecycleActionState,
} from "@/lib/campaigns/lifecycle-action-state";
import { createClient } from "@/lib/supabase/server";

function normalizeText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function rpcErrorMessage(error: { message?: string } | null, fallback: string) {
  if (!error || typeof error.message !== "string" || error.message.trim().length === 0) {
    return fallback;
  }
  return error.message;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function ensureSessionOrReturn() {
  return getSessionUser();
}

export async function clientApproveCampaignAction(
  _: CampaignLifecycleActionState,
  formData: FormData,
): Promise<CampaignLifecycleActionState> {
  const campaignId = normalizeText(formData.get("campaign_id"));
  if (!campaignId) {
    return { error: "Campaign ID is required.", success: null, meta: null };
  }

  const user = await ensureSessionOrReturn();
  if (!user) {
    return { error: "Session expired. Please log in again.", success: null, meta: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("client_approve_campaign", {
    p_campaign_id: campaignId,
  });

  if (error) {
    return {
      error: rpcErrorMessage(error, "Failed to approve campaign."),
      success: null,
      meta: null,
    };
  }

  const payload = asRecord(data);
  const idempotent = payload.idempotent === true;

  revalidatePath("/client/campaigns");
  revalidatePath(`/client/campaigns/${campaignId}`);
  revalidatePath("/client/requests");
  revalidatePath("/admin/campaigns");
  revalidatePath(`/admin/campaigns/${campaignId}`);

  return {
    error: null,
    success: idempotent
      ? "Campaign was already approved."
      : "Campaign approved. Manager can now lock this campaign.",
    meta: null,
  };
}

export async function managerLockCampaignAction(
  _: CampaignLifecycleActionState,
  formData: FormData,
): Promise<CampaignLifecycleActionState> {
  const campaignId = normalizeText(formData.get("campaign_id"));
  if (!campaignId) {
    return { error: "Campaign ID is required.", success: null, meta: null };
  }

  const user = await ensureSessionOrReturn();
  if (!user) {
    return { error: "Session expired. Please log in again.", success: null, meta: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("manager_lock_campaign", {
    p_campaign_id: campaignId,
  });

  if (error) {
    return {
      error: rpcErrorMessage(error, "Failed to lock campaign."),
      success: null,
      meta: null,
    };
  }

  const payload = asRecord(data);
  const idempotent = payload.idempotent === true;

  revalidatePath("/admin/campaigns");
  revalidatePath(`/admin/campaigns/${campaignId}`);
  revalidatePath(`/admin/campaigns/${campaignId}/deliverables`);
  revalidatePath(`/admin/campaigns/${campaignId}/invite`);
  revalidatePath("/client/campaigns");
  revalidatePath(`/client/campaigns/${campaignId}`);

  return {
    error: null,
    success: idempotent ? "Campaign is already locked." : "Campaign locked successfully.",
    meta: null,
  };
}

export async function clientCreateChangeRequestAction(
  _: CampaignLifecycleActionState,
  formData: FormData,
): Promise<CampaignLifecycleActionState> {
  const campaignId = normalizeText(formData.get("campaign_id"));
  const requestNote = normalizeText(formData.get("request_note"));

  if (!campaignId) {
    return { error: "Campaign ID is required.", success: null, meta: null };
  }
  if (!requestNote) {
    return { error: "Please add a change request note.", success: null, meta: null };
  }

  const user = await ensureSessionOrReturn();
  if (!user) {
    return { error: "Session expired. Please log in again.", success: null, meta: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("client_create_change_request", {
    p_campaign_id: campaignId,
    p_request_note: requestNote,
  });

  if (error) {
    return {
      error: rpcErrorMessage(error, "Failed to submit change request."),
      success: null,
      meta: null,
    };
  }

  const payload = asRecord(data);
  const changeRequestId = asString(payload.change_request_id) ?? undefined;

  revalidatePath("/client/requests");
  revalidatePath("/client/campaigns");
  revalidatePath(`/client/campaigns/${campaignId}`);
  revalidatePath(`/admin/campaigns/${campaignId}`);

  return {
    error: null,
    success: "Change request submitted to manager.",
    meta: {
      changeRequestId,
    },
  };
}

export async function managerReviewChangeRequestAction(
  _: CampaignLifecycleActionState,
  formData: FormData,
): Promise<CampaignLifecycleActionState> {
  const changeRequestId = normalizeText(formData.get("change_request_id"));
  const campaignId = normalizeText(formData.get("campaign_id"));
  const decision = normalizeText(formData.get("decision"));
  const reviewNote = normalizeText(formData.get("review_note"));

  if (!changeRequestId || !campaignId) {
    return { error: "Change request and campaign IDs are required.", success: null, meta: null };
  }

  if (decision !== "approve" && decision !== "reject") {
    return { error: "Invalid decision.", success: null, meta: null };
  }

  const user = await ensureSessionOrReturn();
  if (!user) {
    return { error: "Session expired. Please log in again.", success: null, meta: null };
  }

  const supabase = await createClient();
  const rpcName =
    decision === "approve" ? "manager_approve_change_request" : "manager_reject_change_request";

  const { data, error } = await supabase.rpc(rpcName, {
    p_change_request_id: changeRequestId,
    p_review_note: reviewNote,
  });

  if (error) {
    return {
      error: rpcErrorMessage(error, `Failed to ${decision} change request.`),
      success: null,
      meta: null,
    };
  }

  const payload = asRecord(data);
  const oldCampaignId = asString(payload.old_campaign_id) ?? campaignId;
  const newCampaignId = asString(payload.new_campaign_id) ?? undefined;
  const canceledAssignmentCount = asNumber(payload.canceled_assignment_count) ?? undefined;

  revalidatePath("/admin/campaigns");
  revalidatePath(`/admin/campaigns/${campaignId}`);
  revalidatePath(`/admin/campaigns/${campaignId}/invite`);
  revalidatePath("/client/campaigns");
  revalidatePath(`/client/campaigns/${campaignId}`);
  revalidatePath("/client/requests");

  if (oldCampaignId) {
    revalidatePath(`/admin/campaigns/${oldCampaignId}`);
    revalidatePath(`/admin/campaigns/${oldCampaignId}/invite`);
    revalidatePath(`/client/campaigns/${oldCampaignId}`);
  }

  if (newCampaignId) {
    revalidatePath(`/admin/campaigns/${newCampaignId}`);
    revalidatePath(`/admin/campaigns/${newCampaignId}/deliverables`);
    revalidatePath(`/admin/campaigns/${newCampaignId}/invite`);
    revalidatePath(`/client/campaigns/${newCampaignId}`);
  }

  if (decision === "reject") {
    return {
      error: null,
      success: "Change request rejected.",
      meta: {
        oldCampaignId,
      },
    };
  }

  const reinviteNote =
    typeof canceledAssignmentCount === "number"
      ? ` ${canceledAssignmentCount} invite(s) were canceled and require re-invite.`
      : "";

  return {
    error: null,
    success: `Change request implemented. New campaign version created.${reinviteNote}`,
    meta: {
      oldCampaignId,
      newCampaignId,
      canceledAssignmentCount,
    },
  };
}

export { INITIAL_CAMPAIGN_LIFECYCLE_ACTION_STATE };
