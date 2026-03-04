
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { type CampaignActionState } from "@/lib/campaigns/action-state";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { getSelectedOrgId } from "@/lib/org/getSelectedOrgId";
import { createClient } from "@/lib/supabase/server";

function parseDateOrNull(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  return value;
}

function parseDateTimeLocalOrNull(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function parseCsv(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseMultiline(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

const ALLOWED_CAMPAIGN_STATUSES = new Set([
  "draft",
  "active",
  "completed",
  "archived",
]);

const ALLOWED_PLATFORMS = new Set(["facebook_page", "instagram"]);

export async function createCampaignAction(
  _: CampaignActionState,
  formData: FormData,
): Promise<CampaignActionState> {
  const user = await getSessionUser();
  if (!user) {
    return { error: "Session expired. Please log in again.", success: null };
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return { error: "No organization selected.", success: null };
  }

  const title = formData.get("title");
  if (typeof title !== "string" || title.trim().length === 0) {
    return { error: "Title is required.", success: null };
  }

  const statusValue = formData.get("status");
  const status =
    typeof statusValue === "string" && ALLOWED_CAMPAIGN_STATUSES.has(statusValue)
      ? statusValue
      : "draft";

  const startDate = parseDateOrNull(formData.get("start_date"));
  const endDate = parseDateOrNull(formData.get("end_date"));
  if (startDate && endDate && endDate < startDate) {
    return {
      error: "End date cannot be before start date.",
      success: null,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      org_id: orgId,
      created_by: user.id,
      title: title.trim(),
      description:
        typeof formData.get("description") === "string" &&
        formData.get("description")?.toString().trim()
          ? formData.get("description")?.toString().trim()
          : null,
      objectives:
        typeof formData.get("objectives") === "string" &&
        formData.get("objectives")?.toString().trim()
          ? formData.get("objectives")?.toString().trim()
          : null,
      status,
      start_date: startDate,
      end_date: endDate,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      error: "Failed to create campaign.",
      success: null,
    };
  }

  redirect(`/admin/campaigns/${data.id}`);
}

export async function updateCampaignAction(
  _: CampaignActionState,
  formData: FormData,
): Promise<CampaignActionState> {
  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return { error: "No organization selected.", success: null };
  }

  const campaignId = formData.get("campaign_id");
  const title = formData.get("title");

  if (typeof campaignId !== "string" || campaignId.length === 0) {
    return { error: "Campaign ID is missing.", success: null };
  }
  if (typeof title !== "string" || title.trim().length === 0) {
    return { error: "Title is required.", success: null };
  }

  const startDate = parseDateOrNull(formData.get("start_date"));
  const endDate = parseDateOrNull(formData.get("end_date"));
  if (startDate && endDate && endDate < startDate) {
    return {
      error: "End date cannot be before start date.",
      success: null,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("campaigns")
    .update({
      title: title.trim(),
      description:
        typeof formData.get("description") === "string" &&
        formData.get("description")?.toString().trim()
          ? formData.get("description")?.toString().trim()
          : null,
      objectives:
        typeof formData.get("objectives") === "string" &&
        formData.get("objectives")?.toString().trim()
          ? formData.get("objectives")?.toString().trim()
          : null,
      start_date: startDate,
      end_date: endDate,
    })
    .eq("id", campaignId)
    .eq("org_id", orgId);

  if (error) {
    return { error: "Failed to update campaign.", success: null };
  }

  revalidatePath(`/admin/campaigns/${campaignId}`);
  revalidatePath("/admin/campaigns");
  return { error: null, success: "Campaign saved." };
}

export async function updateCampaignStatusAction(formData: FormData) {
  const orgId = await getSelectedOrgId();
  if (!orgId) {
    redirect("/admin/select-org");
  }

  const campaignId = formData.get("campaign_id");
  const nextStatus = formData.get("next_status");
  if (typeof campaignId !== "string" || typeof nextStatus !== "string") {
    return;
  }
  if (!ALLOWED_CAMPAIGN_STATUSES.has(nextStatus)) {
    return;
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("campaigns")
    .select("status")
    .eq("id", campaignId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (!existing || typeof existing.status !== "string") {
    return;
  }

  const isAllowedTransition =
    (existing.status === "draft" && nextStatus === "active") ||
    (existing.status === "active" && nextStatus === "completed") ||
    nextStatus === "archived";

  if (!isAllowedTransition) {
    return;
  }

  await supabase
    .from("campaigns")
    .update({ status: nextStatus })
    .eq("id", campaignId)
    .eq("org_id", orgId);

  revalidatePath(`/admin/campaigns/${campaignId}`);
  revalidatePath("/admin/campaigns");
}

export async function createDeliverableAction(
  _: CampaignActionState,
  formData: FormData,
): Promise<CampaignActionState> {
  const user = await getSessionUser();
  if (!user) {
    return { error: "Session expired. Please log in again.", success: null };
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return { error: "No organization selected.", success: null };
  }

  const campaignId = formData.get("campaign_id");
  const platform = formData.get("platform");
  const requiredPostCountRaw = formData.get("required_post_count");
  const payoutAmountRaw = formData.get("payout_amount");

  if (typeof campaignId !== "string" || campaignId.length === 0) {
    return { error: "Campaign ID is missing.", success: null };
  }
  if (typeof platform !== "string" || !ALLOWED_PLATFORMS.has(platform)) {
    return { error: "Platform is required.", success: null };
  }

  const requiredPostCount =
    typeof requiredPostCountRaw === "string" && requiredPostCountRaw.trim().length > 0
      ? Number(requiredPostCountRaw)
      : 1;
  if (Number.isNaN(requiredPostCount) || requiredPostCount < 1) {
    return { error: "Required post count must be at least 1.", success: null };
  }

  const payoutAmount =
    typeof payoutAmountRaw === "string" && payoutAmountRaw.trim().length > 0
      ? Number(payoutAmountRaw)
      : 0;
  if (Number.isNaN(payoutAmount) || payoutAmount < 0) {
    return { error: "Payout amount must be 0 or higher.", success: null };
  }

  const supabase = await createClient();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id")
    .eq("id", campaignId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!campaign) {
    return { error: "Campaign not found in selected org.", success: null };
  }

  const { error } = await supabase.from("campaign_deliverables").insert({
    org_id: orgId,
    campaign_id: campaignId,
    created_by: user.id,
    platform,
    required_post_count: requiredPostCount,
    required_hashtags: parseCsv(formData.get("required_hashtags")),
    talking_points: parseMultiline(formData.get("talking_points")),
    due_at: parseDateTimeLocalOrNull(formData.get("due_at")),
    payout_amount: payoutAmount,
  });

  if (error) {
    return { error: "Failed to create deliverable.", success: null };
  }

  revalidatePath(`/admin/campaigns/${campaignId}/deliverables`);
  return { error: null, success: "Deliverable created." };
}

export async function updateDeliverableAction(
  _: CampaignActionState,
  formData: FormData,
): Promise<CampaignActionState> {
  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return { error: "No organization selected.", success: null };
  }

  const deliverableId = formData.get("deliverable_id");
  const campaignId = formData.get("campaign_id");
  const platform = formData.get("platform");
  const requiredPostCountRaw = formData.get("required_post_count");
  const payoutAmountRaw = formData.get("payout_amount");

  if (
    typeof deliverableId !== "string" ||
    typeof campaignId !== "string" ||
    deliverableId.length === 0 ||
    campaignId.length === 0
  ) {
    return { error: "Deliverable ID is missing.", success: null };
  }
  if (typeof platform !== "string" || !ALLOWED_PLATFORMS.has(platform)) {
    return { error: "Platform is required.", success: null };
  }

  const requiredPostCount =
    typeof requiredPostCountRaw === "string" && requiredPostCountRaw.trim().length > 0
      ? Number(requiredPostCountRaw)
      : 1;
  if (Number.isNaN(requiredPostCount) || requiredPostCount < 1) {
    return { error: "Required post count must be at least 1.", success: null };
  }

  const payoutAmount =
    typeof payoutAmountRaw === "string" && payoutAmountRaw.trim().length > 0
      ? Number(payoutAmountRaw)
      : 0;
  if (Number.isNaN(payoutAmount) || payoutAmount < 0) {
    return { error: "Payout amount must be 0 or higher.", success: null };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("campaign_deliverables")
    .update({
      platform,
      required_post_count: requiredPostCount,
      required_hashtags: parseCsv(formData.get("required_hashtags")),
      talking_points: parseMultiline(formData.get("talking_points")),
      due_at: parseDateTimeLocalOrNull(formData.get("due_at")),
      payout_amount: payoutAmount,
    })
    .eq("id", deliverableId)
    .eq("campaign_id", campaignId)
    .eq("org_id", orgId);

  if (error) {
    return { error: "Failed to update deliverable.", success: null };
  }

  revalidatePath(`/admin/campaigns/${campaignId}/deliverables`);
  return { error: null, success: "Deliverable updated." };
}

export async function deleteDeliverableAction(formData: FormData) {
  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return;
  }

  const deliverableId = formData.get("deliverable_id");
  const campaignId = formData.get("campaign_id");

  if (typeof deliverableId !== "string" || typeof campaignId !== "string") {
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("campaign_deliverables")
    .delete()
    .eq("id", deliverableId)
    .eq("campaign_id", campaignId)
    .eq("org_id", orgId);

  revalidatePath(`/admin/campaigns/${campaignId}/deliverables`);
}
