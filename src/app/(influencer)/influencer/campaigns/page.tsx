import { redirect } from "next/navigation";

import { InfluencerDashboardView } from "@/components/influencer/InfluencerDashboardView";
import { getCurrentInfluencer } from "@/lib/influencers/getCurrentInfluencer";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 30;

export default async function InfluencerCampaignsPage() {
  const influencer = await getCurrentInfluencer();
  if (!influencer) {
    redirect("/influencer/profile");
  }

  const supabase = await createClient();

  const { data: allAssignments } = await supabase
    .from("campaign_assignments")
    .select("id, campaign_id, influencer_id, status, invited_at, accepted_at, responded_at")
    .eq("influencer_id", influencer.id)
    .order("invited_at", { ascending: false });

  const invitedPending = (allAssignments ?? []).filter((item) => item.status === "invited").length;

  const acceptedAssignments = (allAssignments ?? []).filter((item) => item.status === "accepted");
  const acceptedAssignmentIds = acceptedAssignments.map((item) => item.id as string);
  const campaignIds = Array.from(new Set(acceptedAssignments.map((item) => item.campaign_id as string)));

  const [campaignsRes, proofsRes, submissionsRes, milestonesRes, deliverablesRes, txnsRes] = await Promise.all([
    campaignIds.length ? supabase.from("campaigns").select("id, title, end_date").in("id", campaignIds) : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    acceptedAssignmentIds.length
      ? supabase
          .from("post_proofs")
          .select("id, assignment_id, deliverable_id, status, posted_at, verified_at")
          .in("assignment_id", acceptedAssignmentIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    acceptedAssignmentIds.length
      ? supabase
          .from("content_submissions")
          .select("id, assignment_id, deliverable_id, status, version, submitted_at, reviewed_at")
          .in("assignment_id", acceptedAssignmentIds)
          .order("version", { ascending: false })
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    acceptedAssignmentIds.length
      ? supabase
          .from("payment_milestones")
          .select("id, assignment_id, amount, status, paid_at, ready_at")
          .in("assignment_id", acceptedAssignmentIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    campaignIds.length
      ? supabase
          .from("campaign_deliverables")
          .select("id, campaign_id, platform, due_at")
          .in("campaign_id", campaignIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    acceptedAssignmentIds.length
      ? supabase
          .from("payment_transactions")
          .select("id, assignment_id, amount, created_at")
          .in("assignment_id", acceptedAssignmentIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ]);

  const campaigns = campaignsRes.data ?? [];
  const proofs = proofsRes.data ?? [];
  const submissions = submissionsRes.data ?? [];
  const milestones = milestonesRes.data ?? [];
  const deliverables = deliverablesRes.data ?? [];
  const transactions = txnsRes.data ?? [];

  const draftsNeedAttention = submissions.filter((item) => item.status === "needs_revision").length;

  const proofsToSubmit = proofs.filter((item) => {
    const status = (item.status as string | null) ?? "not_submitted";
    return status === "not_submitted" || status === "rejected" || status === "needs_url";
  }).length;

  const readyAmount = milestones
    .filter((item) => item.status === "ready")
    .reduce((sum, item) => sum + (typeof item.amount === "number" ? item.amount : 0), 0);

  const paidAmount = milestones
    .filter((item) => item.status === "paid")
    .reduce((sum, item) => sum + (typeof item.amount === "number" ? item.amount : 0), 0);

  const lastPaidDate =
    milestones
      .filter((item) => Boolean(item.paid_at))
      .map((item) => item.paid_at as string)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

  const campaignMap = new Map(campaigns.map((item) => [item.id as string, item]));
  const latestSubmissionByKey = new Map<string, Record<string, unknown>>();
  for (const submission of submissions) {
    const key = `${submission.assignment_id as string}:${submission.deliverable_id as string}`;
    if (!latestSubmissionByKey.has(key)) {
      latestSubmissionByKey.set(key, submission);
    }
  }

  const proofMap = new Map<string, Record<string, unknown>>();
  for (const proof of proofs) {
    const key = `${proof.assignment_id as string}:${proof.deliverable_id as string}`;
    proofMap.set(key, proof);
  }

  const campaignsProgress = acceptedAssignments.map((assignment) => {
    const assignmentId = assignment.id as string;
    const campaignId = assignment.campaign_id as string;
    const campaign = campaignMap.get(campaignId);
    const relatedDeliverables = deliverables.filter((item) => item.campaign_id === campaignId);

    const approvedDrafts = relatedDeliverables.filter((item) => {
      const key = `${assignmentId}:${item.id as string}`;
      return latestSubmissionByKey.get(key)?.status === "approved";
    }).length;

    const verifiedProofs = relatedDeliverables.filter((item) => {
      const key = `${assignmentId}:${item.id as string}`;
      return proofMap.get(key)?.status === "verified";
    }).length;

    return {
      assignmentId,
      campaignTitle: (campaign?.title as string) ?? "Campaign",
      endDate: (campaign?.end_date as string | null) ?? null,
      deliverables: relatedDeliverables.length,
      approvedDrafts,
      verifiedProofs,
    };
  });

  const upcomingDeliverables = acceptedAssignments
    .flatMap((assignment) => {
      const assignmentId = assignment.id as string;
      const campaignId = assignment.campaign_id as string;
      const campaign = campaignMap.get(campaignId);
      return deliverables
        .filter((item) => item.campaign_id === campaignId)
        .map((deliverable) => {
          const key = `${assignmentId}:${deliverable.id as string}`;
          const proof = proofMap.get(key);
          return {
            assignmentId,
            deliverableId: deliverable.id as string,
            campaignTitle: (campaign?.title as string) ?? "Campaign",
            platform: (deliverable.platform as string) ?? "platform",
            dueAt: (deliverable.due_at as string | null) ?? null,
            proofStatus: (proof?.status as string | undefined) ?? "not_submitted",
          };
        });
    })
    .sort((a, b) => {
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    })
    .slice(0, 6);

  const activityTimeline = [
    ...submissions
      .filter((item) => item.submitted_at)
      .map((item) => ({
        id: `sub-${item.id as string}`,
        label: "Draft submitted",
        at: item.submitted_at as string,
        status: (item.status as string) ?? "submitted",
      })),
    ...submissions
      .filter((item) => item.reviewed_at)
      .map((item) => ({
        id: `sub-review-${item.id as string}`,
        label: "Draft reviewed",
        at: item.reviewed_at as string,
        status: (item.status as string) ?? "approved",
      })),
    ...proofs
      .filter((item) => item.verified_at)
      .map((item) => ({
        id: `proof-${item.id as string}`,
        label: "Proof verified",
        at: item.verified_at as string,
        status: "verified",
      })),
    ...transactions
      .filter((item) => item.created_at)
      .map((item) => ({
        id: `txn-${item.id as string}`,
        label: "Payment logged",
        at: item.created_at as string,
        status: "paid",
      })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 12);

  return (
    <InfluencerDashboardView
      invitesPending={invitedPending}
      draftsNeedAttention={draftsNeedAttention}
      proofsToSubmit={proofsToSubmit}
      readyAmount={readyAmount}
      paidAmount={paidAmount}
      lastPaidDate={lastPaidDate}
      campaigns={campaignsProgress}
      upcomingDeliverables={upcomingDeliverables}
      activityTimeline={activityTimeline}
    />
  );
}
