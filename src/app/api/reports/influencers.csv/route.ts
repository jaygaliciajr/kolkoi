import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/getSessionUser";
import { getSelectedOrgId } from "@/lib/org/getSelectedOrgId";
import { createClient } from "@/lib/supabase/server";

function escapeCsv(value: string | number | null | undefined) {
  const str = value === null || value === undefined ? "" : String(value);
  if (str.includes(",") || str.includes("\n") || str.includes("\"")) {
    return `"${str.replaceAll("\"", "\"\"")}"`;
  }
  return str;
}

async function ensureAdminReportAccess(orgId: string) {
  const user = await getSessionUser();
  if (!user) {
    return false;
  }

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("org_members")
    .select("role, role_type")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  const role =
    (member && typeof member.role === "string" && member.role) ||
    (member && typeof member.role_type === "string" && member.role_type) ||
    null;

  return role === "org_admin" || role === "campaign_manager" || role === "finance";
}

export async function GET() {
  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return new NextResponse("No organization selected", { status: 401 });
  }

  const hasAccess = await ensureAdminReportAccess(orgId);
  if (!hasAccess) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const supabase = await createClient();
  const { data: assignments } = await supabase
    .from("campaign_assignments")
    .select("id, campaign_id, influencer_id, status, invited_at, responded_at, accepted_at, org_id")
    .eq("org_id", orgId);

  const assignmentIds = (assignments ?? []).map((item) => item.id as string);
  const influencerIds = Array.from(
    new Set((assignments ?? []).map((item) => item.influencer_id as string)),
  );
  const campaignIds = Array.from(
    new Set((assignments ?? []).map((item) => item.campaign_id as string)),
  );

  const [influencersRes, proofsRes, txnsRes, submissionsRes, deliverablesRes] = await Promise.all([
    influencerIds.length
      ? supabase.from("influencers").select("id, full_name").in("id", influencerIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    assignmentIds.length
      ? supabase
          .from("post_proofs")
          .select("id, assignment_id, status, posted_at, verified_at")
          .in("assignment_id", assignmentIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    assignmentIds.length
      ? supabase.from("payment_transactions").select("id, assignment_id, amount, created_at").in("assignment_id", assignmentIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    assignmentIds.length
      ? supabase
          .from("content_submissions")
          .select("id, assignment_id, submitted_at, updated_at")
          .in("assignment_id", assignmentIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    campaignIds.length
      ? supabase
          .from("campaign_deliverables")
          .select("id, campaign_id, payout_amount")
          .in("campaign_id", campaignIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ]);

  const influencers = influencersRes.data ?? [];
  const proofs = proofsRes.data ?? [];
  const transactions = txnsRes.data ?? [];
  const submissions = submissionsRes.data ?? [];
  const deliverables = deliverablesRes.data ?? [];

  const influencerMap = new Map((influencers ?? []).map((item) => [item.id as string, item]));

  const payoutByCampaign = new Map<string, number>();
  for (const deliverable of deliverables) {
    const campaignId = deliverable.campaign_id as string;
    const amount = typeof deliverable.payout_amount === "number" ? deliverable.payout_amount : 0;
    payoutByCampaign.set(campaignId, (payoutByCampaign.get(campaignId) ?? 0) + amount);
  }

  const assignmentById = new Map((assignments ?? []).map((item) => [item.id as string, item]));

  const proofsByInfluencer = new Map<string, number>();
  for (const proof of proofs) {
    if (proof.status !== "verified") continue;
    const assignment = assignmentById.get(proof.assignment_id as string);
    if (!assignment) continue;
    const influencerId = assignment.influencer_id as string;
    proofsByInfluencer.set(influencerId, (proofsByInfluencer.get(influencerId) ?? 0) + 1);
  }

  const paidByInfluencer = new Map<string, number>();
  for (const txn of transactions) {
    const assignment = assignmentById.get(txn.assignment_id as string);
    if (!assignment) continue;
    const influencerId = assignment.influencer_id as string;
    const amount = typeof txn.amount === "number" ? txn.amount : 0;
    paidByInfluencer.set(influencerId, (paidByInfluencer.get(influencerId) ?? 0) + amount);
  }

  const lastActivityByInfluencer = new Map<string, string>();
  function pushActivity(influencerId: string, at: string | null | undefined) {
    if (!at) return;
    const current = lastActivityByInfluencer.get(influencerId);
    if (!current || new Date(at).getTime() > new Date(current).getTime()) {
      lastActivityByInfluencer.set(influencerId, at);
    }
  }

  for (const assignment of assignments ?? []) {
    const influencerId = assignment.influencer_id as string;
    pushActivity(influencerId, assignment.invited_at as string | null | undefined);
    pushActivity(influencerId, assignment.responded_at as string | null | undefined);
    pushActivity(influencerId, assignment.accepted_at as string | null | undefined);
  }
  for (const proof of proofs) {
    const assignment = assignmentById.get(proof.assignment_id as string);
    if (!assignment) continue;
    const influencerId = assignment.influencer_id as string;
    pushActivity(influencerId, proof.posted_at as string | null | undefined);
    pushActivity(influencerId, proof.verified_at as string | null | undefined);
  }
  for (const submission of submissions) {
    const assignment = assignmentById.get(submission.assignment_id as string);
    if (!assignment) continue;
    const influencerId = assignment.influencer_id as string;
    pushActivity(influencerId, submission.submitted_at as string | null | undefined);
    pushActivity(influencerId, submission.updated_at as string | null | undefined);
  }
  for (const txn of transactions) {
    const assignment = assignmentById.get(txn.assignment_id as string);
    if (!assignment) continue;
    const influencerId = assignment.influencer_id as string;
    pushActivity(influencerId, txn.created_at as string | null | undefined);
  }

  const summaryByInfluencer = new Map<
    string,
    {
      invitedCount: number;
      acceptedCount: number;
      totalPayout: number;
    }
  >();

  for (const assignment of assignments ?? []) {
    const influencerId = assignment.influencer_id as string;
    const current = summaryByInfluencer.get(influencerId) ?? {
      invitedCount: 0,
      acceptedCount: 0,
      totalPayout: 0,
    };

    current.invitedCount += 1;
    if (assignment.status === "accepted") {
      current.acceptedCount += 1;
      current.totalPayout += payoutByCampaign.get(assignment.campaign_id as string) ?? 0;
    }

    summaryByInfluencer.set(influencerId, current);
  }

  const header = [
    "influencer_name",
    "number_of_campaigns_invited",
    "accepted_count",
    "verified_proofs_count",
    "total_payout",
    "paid_amount",
    "last_activity_date",
  ];

  const lines = [header.join(",")];

  for (const [influencerId, summary] of summaryByInfluencer) {
    const influencer = influencerMap.get(influencerId);
    const row = [
      escapeCsv((influencer?.full_name as string) ?? "Influencer"),
      escapeCsv(summary.invitedCount),
      escapeCsv(summary.acceptedCount),
      escapeCsv(proofsByInfluencer.get(influencerId) ?? 0),
      escapeCsv(summary.totalPayout),
      escapeCsv(paidByInfluencer.get(influencerId) ?? 0),
      escapeCsv(lastActivityByInfluencer.get(influencerId) ?? ""),
    ];

    lines.push(row.join(","));
  }

  const body = lines.join("\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=influencers-summary.csv",
    },
  });
}
