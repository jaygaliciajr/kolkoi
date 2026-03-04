
"use server";

import { revalidatePath } from "next/cache";

import { type AssignmentActionState } from "@/lib/campaigns/assignment-action-state";
import { getSelectedOrgId } from "@/lib/org/getSelectedOrgId";
import {
  calculateMilestoneAmounts,
  normalizeMilestoneTemplates,
} from "@/lib/campaigns/payout";
import { getCurrentInfluencer } from "@/lib/influencers/getCurrentInfluencer";
import { createClient } from "@/lib/supabase/server";

export async function sendCampaignInvitesAction(
  _: AssignmentActionState,
  formData: FormData,
): Promise<AssignmentActionState> {
  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return { error: "No organization selected.", success: null };
  }

  const campaignId = formData.get("campaign_id");
  const rawInfluencerIds = formData.get("selected_influencer_ids");

  if (typeof campaignId !== "string" || campaignId.length === 0) {
    return { error: "Campaign ID is missing.", success: null };
  }
  if (typeof rawInfluencerIds !== "string" || rawInfluencerIds.trim().length === 0) {
    return { error: "Select at least one influencer.", success: null };
  }

  const influencerIds = Array.from(
    new Set(
      rawInfluencerIds
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
  if (influencerIds.length === 0) {
    return { error: "Select at least one influencer.", success: null };
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

  let inserted = 0;
  let skipped = 0;
  const invitedAt = new Date().toISOString();

  for (const influencerId of influencerIds) {
    const { error } = await supabase.from("campaign_assignments").insert({
      org_id: orgId,
      campaign_id: campaignId,
      influencer_id: influencerId,
      status: "invited",
      invited_at: invitedAt,
    });

    if (!error) {
      inserted += 1;
      continue;
    }

    if (error.code === "23505") {
      skipped += 1;
      continue;
    }

    return {
      error: "Failed to send invites. Please try again.",
      success: null,
    };
  }

  revalidatePath(`/admin/campaigns/${campaignId}/invite`);
  revalidatePath(`/admin/campaigns/${campaignId}`);

  return {
    error: null,
    success: `Invites sent: ${inserted}. Skipped duplicates: ${skipped}.`,
  };
}

export async function removeCampaignInviteAction(formData: FormData) {
  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return;
  }

  const assignmentId = formData.get("assignment_id");
  const campaignId = formData.get("campaign_id");
  if (typeof assignmentId !== "string" || typeof campaignId !== "string") {
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("campaign_assignments")
    .update({
      status: "removed",
      responded_at: new Date().toISOString(),
    })
    .eq("id", assignmentId)
    .eq("campaign_id", campaignId)
    .eq("org_id", orgId);

  revalidatePath(`/admin/campaigns/${campaignId}/invite`);
  revalidatePath("/influencer/inbox");
}

type TemplateLike = {
  label: string;
  percent: number;
  trigger: string;
};

async function getMilestoneTemplatesForAssignment(input: {
  orgId: string;
  campaignId: string;
}) {
  const supabase = await createClient();

  const { data: campaignTemplates } = await supabase
    .from("payment_templates")
    .select("*")
    .eq("org_id", input.orgId)
    .eq("campaign_id", input.campaignId)
    .order("created_at", { ascending: true });

  const normalizedCampaignTemplates = (campaignTemplates ?? [])
    .filter(
      (item) =>
        typeof item.label === "string" &&
        typeof item.percent === "number" &&
        item.percent > 0,
    )
    .map(
      (item) =>
        ({
          label: item.label as string,
          percent: item.percent as number,
          trigger:
            (typeof item.trigger === "string" && item.trigger) || "approved",
        }) satisfies TemplateLike,
    );

  if (normalizedCampaignTemplates.length > 0) {
    return normalizeMilestoneTemplates(normalizedCampaignTemplates);
  }

  const { data: defaultTemplates } = await supabase
    .from("payment_templates")
    .select("*")
    .eq("org_id", input.orgId)
    .eq("is_default", true)
    .order("created_at", { ascending: true });

  const normalizedDefaultTemplates = (defaultTemplates ?? [])
    .filter(
      (item) =>
        typeof item.label === "string" &&
        typeof item.percent === "number" &&
        item.percent > 0,
    )
    .map(
      (item) =>
        ({
          label: item.label as string,
          percent: item.percent as number,
          trigger:
            (typeof item.trigger === "string" && item.trigger) || "approved",
        }) satisfies TemplateLike,
    );

  return normalizeMilestoneTemplates(normalizedDefaultTemplates);
}

export async function respondToInviteAction(
  _: AssignmentActionState,
  formData: FormData,
): Promise<AssignmentActionState> {
  const influencer = await getCurrentInfluencer();
  if (!influencer) {
    return { error: "Influencer account is not linked.", success: null };
  }

  const assignmentId = formData.get("assignment_id");
  const decision = formData.get("decision");
  const declineNote = formData.get("decline_note");

  if (typeof assignmentId !== "string" || assignmentId.length === 0) {
    return { error: "Assignment ID is missing.", success: null };
  }
  if (decision !== "accept" && decision !== "decline") {
    return { error: "Invalid decision.", success: null };
  }

  const supabase = await createClient();
  const { data: assignment, error: assignmentError } = await supabase
    .from("campaign_assignments")
    .select("*")
    .eq("id", assignmentId)
    .eq("influencer_id", influencer.id)
    .maybeSingle();

  if (assignmentError || !assignment) {
    return { error: "Invite not found.", success: null };
  }

  if (assignment.status !== "invited") {
    return {
      error: "This invite is no longer pending.",
      success: null,
    };
  }

  const now = new Date();
  const nowIso = now.toISOString();

  if (decision === "decline") {
    const { error } = await supabase
      .from("campaign_assignments")
      .update({
        status: "declined",
        responded_at: nowIso,
        decline_note:
          typeof declineNote === "string" && declineNote.trim().length > 0
            ? declineNote.trim()
            : null,
      })
      .eq("id", assignmentId)
      .eq("influencer_id", influencer.id);

    if (error) {
      return { error: "Failed to decline invite.", success: null };
    }

    revalidatePath("/influencer/inbox");
    revalidatePath("/influencer/campaigns");
    revalidatePath(`/influencer/campaigns/${assignmentId}`);
    return { error: null, success: "Invite declined." };
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", assignment.campaign_id)
    .eq("org_id", assignment.org_id)
    .maybeSingle();

  if (!campaign) {
    return { error: "Campaign not found.", success: null };
  }

  const { data: deliverables } = await supabase
    .from("campaign_deliverables")
    .select("*")
    .eq("campaign_id", assignment.campaign_id)
    .eq("org_id", assignment.org_id);

  const earliestDueAt = (deliverables ?? [])
    .map((item) => (typeof item.due_at === "string" ? item.due_at : null))
    .filter((value): value is string => Boolean(value))
    .sort()[0];

  if (typeof campaign.end_date === "string" && nowIso.slice(0, 10) > campaign.end_date) {
    return { error: "Invite expired. Campaign end date has passed.", success: null };
  }
  if (earliestDueAt && now > new Date(earliestDueAt)) {
    return {
      error: "Invite expired. Earliest deliverable due date has passed.",
      success: null,
    };
  }

  const { error: assignmentUpdateError } = await supabase
    .from("campaign_assignments")
    .update({
      status: "accepted",
      responded_at: nowIso,
      accepted_at: nowIso,
      decline_note: null,
    })
    .eq("id", assignmentId)
    .eq("influencer_id", influencer.id)
    .eq("status", "invited");

  if (assignmentUpdateError) {
    return { error: "Failed to accept invite.", success: null };
  }

  const deliverableRows = deliverables ?? [];
  const proofRows = deliverableRows.map((item) => ({
    assignment_id: assignmentId,
    deliverable_id: item.id,
    status: "not_submitted",
  }));
  if (proofRows.length > 0) {
    const { error: proofsError } = await supabase.from("post_proofs").upsert(proofRows, {
      onConflict: "assignment_id,deliverable_id",
      ignoreDuplicates: true,
    });

    if (proofsError) {
      return {
        error: "Invite accepted, but proof rows could not be prepared.",
        success: null,
      };
    }
  }

  const totalPayout = deliverableRows.reduce((sum, row) => {
    const amount = typeof row.payout_amount === "number" ? row.payout_amount : 0;
    return sum + amount;
  }, 0);

  const templates = await getMilestoneTemplatesForAssignment({
    orgId: assignment.org_id as string,
    campaignId: assignment.campaign_id as string,
  });
  const amounts = calculateMilestoneAmounts(
    totalPayout,
    templates.map((item) => item.percent),
  );

  const milestoneRows = templates.map((template, index) => ({
    assignment_id: assignmentId,
    org_id: assignment.org_id,
    campaign_id: assignment.campaign_id,
    label: template.label,
    percent: Number(template.percent.toFixed(2)),
    amount: amounts[index] ?? 0,
    status: "pending",
    trigger: template.trigger,
  }));

  if (milestoneRows.length > 0) {
    const { error: milestoneError } = await supabase
      .from("payment_milestones")
      .upsert(milestoneRows, {
        onConflict: "assignment_id,label",
        ignoreDuplicates: true,
      });

    if (milestoneError) {
      return {
        error: "Invite accepted, but payment milestones could not be created.",
        success: null,
      };
    }
  }

  revalidatePath("/influencer/inbox");
  revalidatePath("/influencer/campaigns");
  revalidatePath(`/influencer/campaigns/${assignmentId}`);
  revalidatePath(`/admin/campaigns/${assignment.campaign_id}/invite`);

  return {
    error: null,
    success: "Invite accepted. Deliverables and milestones prepared.",
  };
}
