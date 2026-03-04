import { NextRequest, NextResponse } from "next/server";

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

export async function GET(request: NextRequest) {
  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return new NextResponse("No organization selected", { status: 401 });
  }

  const hasAccess = await ensureAdminReportAccess(orgId);
  if (!hasAccess) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const campaignId = new URL(request.url).searchParams.get("campaignId")?.trim();
  if (!campaignId) {
    return new NextResponse("campaignId is required", { status: 400 });
  }

  const supabase = await createClient();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, title, org_id")
    .eq("id", campaignId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (!campaign) {
    return new NextResponse("Campaign not found", { status: 404 });
  }

  const { data: assignments } = await supabase
    .from("campaign_assignments")
    .select("id, campaign_id, influencer_id, org_id")
    .eq("campaign_id", campaignId)
    .eq("org_id", orgId);

  const assignmentIds = (assignments ?? []).map((item) => item.id as string);
  const influencerIds = Array.from(
    new Set((assignments ?? []).map((item) => item.influencer_id as string)),
  );

  const [deliverablesRes, influencersRes, proofsRes, submissionsRes, txnsRes] = await Promise.all([
    supabase
      .from("campaign_deliverables")
      .select("id, campaign_id, platform, due_at, payout_amount")
      .eq("campaign_id", campaignId)
      .eq("org_id", orgId),
    influencerIds.length
      ? supabase.from("influencers").select("id, full_name").in("id", influencerIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    assignmentIds.length
      ? supabase
          .from("post_proofs")
          .select("id, assignment_id, deliverable_id, status, posted_at, verified_at")
          .in("assignment_id", assignmentIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    assignmentIds.length
      ? supabase
          .from("content_submissions")
          .select("id, assignment_id, deliverable_id, status, submitted_at, version")
          .in("assignment_id", assignmentIds)
          .order("version", { ascending: false })
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    assignmentIds.length
      ? supabase
          .from("payment_transactions")
          .select("id, assignment_id, amount")
          .in("assignment_id", assignmentIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ]);

  const deliverables = deliverablesRes.data ?? [];
  const influencers = influencersRes.data ?? [];
  const proofs = proofsRes.data ?? [];
  const submissions = submissionsRes.data ?? [];
  const transactions = txnsRes.data ?? [];

  let snapshots: Record<string, unknown>[] = [];
  if (assignmentIds.length) {
    const snapshotsRes = await supabase
      .from("engagement_snapshots")
      .select("*")
      .in("assignment_id", assignmentIds)
      .order("created_at", { ascending: false });
    snapshots = snapshotsRes.error ? [] : (snapshotsRes.data ?? []);
  }

  const influencerMap = new Map((influencers ?? []).map((item) => [item.id as string, item]));
  const proofsMap = new Map(
    (proofs ?? []).map((item) => [`${item.assignment_id as string}:${item.deliverable_id as string}`, item]),
  );

  const latestSubmissionMap = new Map<string, Record<string, unknown>>();
  for (const submission of submissions ?? []) {
    const key = `${submission.assignment_id as string}:${submission.deliverable_id as string}`;
    if (!latestSubmissionMap.has(key)) {
      latestSubmissionMap.set(key, submission);
    }
  }

  const paidByAssignment = new Map<string, number>();
  for (const txn of transactions ?? []) {
    const assignmentId = txn.assignment_id as string;
    const amount = typeof txn.amount === "number" ? txn.amount : 0;
    paidByAssignment.set(assignmentId, (paidByAssignment.get(assignmentId) ?? 0) + amount);
  }

  const totalPayout = (deliverables ?? []).reduce((sum, item) => {
    const amount = typeof item.payout_amount === "number" ? item.payout_amount : 0;
    return sum + amount;
  }, 0);

  const latestSnapshotByAssignment = new Map<string, string>();
  for (const snapshot of snapshots) {
    const assignmentId = typeof snapshot.assignment_id === "string" ? snapshot.assignment_id : null;
    if (!assignmentId || latestSnapshotByAssignment.has(assignmentId)) {
      continue;
    }

    const snapshotData: Record<string, unknown> = { ...snapshot };
    delete snapshotData.id;
    delete snapshotData.assignment_id;
    delete snapshotData.created_at;
    delete snapshotData.updated_at;

    latestSnapshotByAssignment.set(assignmentId, JSON.stringify(snapshotData));
  }

  const header = [
    "influencer_name",
    "deliverable_platform",
    "deliverable_due_at",
    "latest_submission_status",
    "latest_submission_submitted_at",
    "proof_status",
    "proof_posted_at",
    "proof_verified_at",
    "total_payout",
    "paid_amount",
    "latest_engagement_snapshot",
  ];

  const lines = [header.join(",")];

  for (const assignment of assignments ?? []) {
    const influencer = influencerMap.get(assignment.influencer_id as string);
    for (const deliverable of deliverables ?? []) {
      const key = `${assignment.id as string}:${deliverable.id as string}`;
      const submission = latestSubmissionMap.get(key);
      const proof = proofsMap.get(key);
      const row = [
        escapeCsv((influencer?.full_name as string) ?? "Influencer"),
        escapeCsv((deliverable.platform as string) ?? ""),
        escapeCsv((deliverable.due_at as string | null) ?? ""),
        escapeCsv((submission?.status as string | null) ?? ""),
        escapeCsv((submission?.submitted_at as string | null) ?? ""),
        escapeCsv((proof?.status as string | null) ?? ""),
        escapeCsv((proof?.posted_at as string | null) ?? ""),
        escapeCsv((proof?.verified_at as string | null) ?? ""),
        escapeCsv(totalPayout),
        escapeCsv(paidByAssignment.get(assignment.id as string) ?? 0),
        escapeCsv(latestSnapshotByAssignment.get(assignment.id as string) ?? ""),
      ];
      lines.push(row.join(","));
    }
  }

  const body = lines.join("\n");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=campaign-${campaignId}-report.csv`,
    },
  });
}
