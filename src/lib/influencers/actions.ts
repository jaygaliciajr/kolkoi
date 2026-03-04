
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/getSessionUser";
import {
  INITIAL_LINK_CODE_ACTION_STATE,
  type InfluencerActionState,
  type LinkCodeActionState,
} from "@/lib/influencers/action-state";
import { getSelectedOrgId } from "@/lib/org/getSelectedOrgId";
import { createClient } from "@/lib/supabase/server";

function parseTags(tagsRaw: FormDataEntryValue | null) {
  if (typeof tagsRaw !== "string" || tagsRaw.trim().length === 0) {
    return [];
  }

  return tagsRaw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function validateOptionalUrl(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  try {
    const parsed = new URL(value);
    return parsed.toString();
  } catch {
    return null;
  }
}

export async function createInfluencerAction(
  _: InfluencerActionState,
  formData: FormData,
): Promise<InfluencerActionState> {
  const user = await getSessionUser();
  if (!user) {
    return {
      error: "Session expired. Please log in again.",
      success: null,
    };
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return {
      error: "No organization selected. Please select an organization first.",
      success: null,
    };
  }

  const fullName = formData.get("full_name");
  if (typeof fullName !== "string" || fullName.trim().length === 0) {
    return {
      error: "Full name is required.",
      success: null,
    };
  }

  const fbPageUrl = validateOptionalUrl(formData.get("fb_page_url"));
  const fbRaw = formData.get("fb_page_url");
  if (typeof fbRaw === "string" && fbRaw.trim().length > 0 && !fbPageUrl) {
    return {
      error: "Facebook page URL is invalid.",
      success: null,
    };
  }

  const followerCountRaw = formData.get("follower_count");
  const engagementRateRaw = formData.get("engagement_rate");
  const followerCount =
    typeof followerCountRaw === "string" && followerCountRaw.trim().length > 0
      ? Number(followerCountRaw)
      : null;
  const engagementRate =
    typeof engagementRateRaw === "string" && engagementRateRaw.trim().length > 0
      ? Number(engagementRateRaw)
      : null;

  if (followerCount !== null && Number.isNaN(followerCount)) {
    return {
      error: "Follower count must be a valid number.",
      success: null,
    };
  }

  if (engagementRate !== null && Number.isNaN(engagementRate)) {
    return {
      error: "Engagement rate must be a valid decimal number.",
      success: null,
    };
  }

  const payload = {
    org_id: orgId,
    created_by: user.id,
    full_name: fullName.trim(),
    email:
      typeof formData.get("email") === "string" && formData.get("email")?.toString().trim()
        ? formData.get("email")?.toString().trim()
        : null,
    phone:
      typeof formData.get("phone") === "string" && formData.get("phone")?.toString().trim()
        ? formData.get("phone")?.toString().trim()
        : null,
    location:
      typeof formData.get("location") === "string" &&
      formData.get("location")?.toString().trim()
        ? formData.get("location")?.toString().trim()
        : null,
    notes:
      typeof formData.get("notes") === "string" && formData.get("notes")?.toString().trim()
        ? formData.get("notes")?.toString().trim()
        : null,
    fb_page_url: fbPageUrl,
    ig_handle:
      typeof formData.get("ig_handle") === "string" &&
      formData.get("ig_handle")?.toString().trim()
        ? formData.get("ig_handle")?.toString().trim()
        : null,
    follower_count: followerCount,
    engagement_rate: engagementRate,
    tags: parseTags(formData.get("tags")),
  };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("influencers")
    .insert(payload)
    .select("id")
    .single();

  if (error || !data) {
    return {
      error: "Failed to create influencer. Please try again.",
      success: null,
    };
  }

  redirect(`/admin/influencers/${data.id}`);
}

export async function updateInfluencerAction(
  _: InfluencerActionState,
  formData: FormData,
): Promise<InfluencerActionState> {
  const user = await getSessionUser();
  if (!user) {
    return {
      error: "Session expired. Please log in again.",
      success: null,
    };
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return {
      error: "No organization selected. Please select an organization first.",
      success: null,
    };
  }

  const influencerId = formData.get("influencer_id");
  const fullName = formData.get("full_name");

  if (typeof influencerId !== "string" || influencerId.length === 0) {
    return {
      error: "Influencer ID is missing.",
      success: null,
    };
  }

  if (typeof fullName !== "string" || fullName.trim().length === 0) {
    return {
      error: "Full name is required.",
      success: null,
    };
  }

  const fbPageUrl = validateOptionalUrl(formData.get("fb_page_url"));
  const fbRaw = formData.get("fb_page_url");
  if (typeof fbRaw === "string" && fbRaw.trim().length > 0 && !fbPageUrl) {
    return {
      error: "Facebook page URL is invalid.",
      success: null,
    };
  }

  const followerCountRaw = formData.get("follower_count");
  const engagementRateRaw = formData.get("engagement_rate");
  const followerCount =
    typeof followerCountRaw === "string" && followerCountRaw.trim().length > 0
      ? Number(followerCountRaw)
      : null;
  const engagementRate =
    typeof engagementRateRaw === "string" && engagementRateRaw.trim().length > 0
      ? Number(engagementRateRaw)
      : null;

  if (followerCount !== null && Number.isNaN(followerCount)) {
    return {
      error: "Follower count must be a valid number.",
      success: null,
    };
  }

  if (engagementRate !== null && Number.isNaN(engagementRate)) {
    return {
      error: "Engagement rate must be a valid decimal number.",
      success: null,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("influencers")
    .update({
      full_name: fullName.trim(),
      email:
        typeof formData.get("email") === "string" && formData.get("email")?.toString().trim()
          ? formData.get("email")?.toString().trim()
          : null,
      phone:
        typeof formData.get("phone") === "string" && formData.get("phone")?.toString().trim()
          ? formData.get("phone")?.toString().trim()
          : null,
      location:
        typeof formData.get("location") === "string" &&
        formData.get("location")?.toString().trim()
          ? formData.get("location")?.toString().trim()
          : null,
      notes:
        typeof formData.get("notes") === "string" && formData.get("notes")?.toString().trim()
          ? formData.get("notes")?.toString().trim()
          : null,
      fb_page_url: fbPageUrl,
      ig_handle:
        typeof formData.get("ig_handle") === "string" &&
        formData.get("ig_handle")?.toString().trim()
          ? formData.get("ig_handle")?.toString().trim()
          : null,
      follower_count: followerCount,
      engagement_rate: engagementRate,
      tags: parseTags(formData.get("tags")),
    })
    .eq("id", influencerId)
    .eq("org_id", orgId);

  if (error) {
    return {
      error: "Failed to update influencer.",
      success: null,
    };
  }

  revalidatePath(`/admin/influencers/${influencerId}`);

  return {
    error: null,
    success: "Influencer updated.",
  };
}

export async function generateInfluencerLinkCodeAction(
  _: LinkCodeActionState,
  formData: FormData,
): Promise<LinkCodeActionState> {
  const user = await getSessionUser();
  if (!user) {
    return {
      ...INITIAL_LINK_CODE_ACTION_STATE,
      error: "Session expired. Please log in again.",
    };
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return {
      ...INITIAL_LINK_CODE_ACTION_STATE,
      error: "No organization selected.",
    };
  }

  const influencerId = formData.get("influencer_id");
  if (typeof influencerId !== "string" || influencerId.length === 0) {
    return {
      ...INITIAL_LINK_CODE_ACTION_STATE,
      error: "Influencer ID is required.",
    };
  }

  const supabase = await createClient();
  const { data: influencer, error: influencerError } = await supabase
    .from("influencers")
    .select("id, user_id")
    .eq("id", influencerId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (influencerError || !influencer) {
    return {
      ...INITIAL_LINK_CODE_ACTION_STATE,
      error: "Influencer not found in current organization.",
    };
  }

  if (influencer.user_id) {
    return {
      ...INITIAL_LINK_CODE_ACTION_STATE,
      error: "This influencer is already linked to a user.",
    };
  }

  const code = crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("influencer_link_codes").insert({
    org_id: orgId,
    influencer_id: influencerId,
    code,
    expires_at: expiresAt,
  });

  if (error) {
    return {
      ...INITIAL_LINK_CODE_ACTION_STATE,
      error: "Failed to generate code. Please try again.",
    };
  }

  revalidatePath(`/admin/influencers/${influencerId}`);

  return {
    error: null,
    success: "Link code generated.",
    generatedCode: code,
    status: "Active",
  };
}

export async function redeemInfluencerLinkCodeAction(
  _: InfluencerActionState,
  formData: FormData,
): Promise<InfluencerActionState> {
  const user = await getSessionUser();
  if (!user) {
    return {
      error: "Session expired. Please log in again.",
      success: null,
    };
  }

  const rawCode = formData.get("code");
  if (typeof rawCode !== "string" || rawCode.trim().length === 0) {
    return {
      error: "Link code is required.",
      success: null,
    };
  }

  const code = rawCode.trim().toUpperCase();
  const nowIso = new Date().toISOString();
  const supabase = await createClient();
  const { data: linkCode, error: codeError } = await supabase
    .from("influencer_link_codes")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (codeError || !linkCode) {
    return {
      error: "Invalid link code.",
      success: null,
    };
  }

  if (linkCode.used_at) {
    return {
      error: "This code has already been used.",
      success: null,
    };
  }

  if (typeof linkCode.expires_at === "string" && linkCode.expires_at < nowIso) {
    return {
      error: "This code is expired.",
      success: null,
    };
  }

  const { data: influencer, error: influencerError } = await supabase
    .from("influencers")
    .select("id, org_id, user_id")
    .eq("id", linkCode.influencer_id)
    .eq("org_id", linkCode.org_id)
    .maybeSingle();

  if (influencerError || !influencer) {
    return {
      error: "Linked influencer record is unavailable.",
      success: null,
    };
  }

  if (influencer.user_id && influencer.user_id !== user.id) {
    return {
      error: "This influencer is already linked to another user.",
      success: null,
    };
  }

  const { error: updateInfluencerError } = await supabase
    .from("influencers")
    .update({
      user_id: user.id,
    })
    .eq("id", influencer.id)
    .eq("org_id", influencer.org_id);

  if (updateInfluencerError) {
    return {
      error: "Failed to link influencer account.",
      success: null,
    };
  }

  const { error: markUsedError } = await supabase
    .from("influencer_link_codes")
    .update({
      used_at: nowIso,
    })
    .eq("id", linkCode.id)
    .is("used_at", null);

  if (markUsedError) {
    return {
      error: "Linked account, but failed to mark code as used.",
      success: null,
    };
  }

  revalidatePath("/influencer/profile");
  revalidatePath(`/admin/influencers/${influencer.id}`);

  return {
    error: null,
    success: "Your influencer profile is now linked.",
  };
}
