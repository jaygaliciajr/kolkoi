import { NextRequest, NextResponse } from "next/server";

import { getSelectedOrgId } from "@/lib/org/getSelectedOrgId";
import { createClient } from "@/lib/supabase/server";

function escapeCsv(value: string | number | null | undefined) {
  const str = value === null || value === undefined ? "" : String(value);
  if (str.includes(",") || str.includes("\n") || str.includes("\"")) {
    return `"${str.replaceAll("\"", "\"\"")}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return new NextResponse("No organization selected", { status: 401 });
  }

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status")?.trim().toLowerCase();
  const campaignFilter = url.searchParams.get("campaign")?.trim() ?? "";
  const influencerFilter = url.searchParams.get("influencer")?.trim() ?? "";
  const query = (url.searchParams.get("q") ?? "").trim().toLowerCase();

  const supabase = await createClient();
  const { data: assignments } = await supabase
    .from("campaign_assignments")
    .select("id, campaign_id, influencer_id, org_id")
    .eq("org_id", orgId);

  const assignmentIds = (assignments ?? []).map((item) => item.id as string);
  const campaignIds = Array.from(
    new Set((assignments ?? []).map((item) => item.campaign_id as string)),
  );
  const influencerIds = Array.from(
    new Set((assignments ?? []).map((item) => item.influencer_id as string)),
  );

  const [campaignsRes, influencersRes, milestonesRes, transactionsRes] = await Promise.all([
    campaignIds.length
      ? supabase.from("campaigns").select("id, title").in("id", campaignIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    influencerIds.length
      ? supabase.from("influencers").select("id, full_name").in("id", influencerIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    assignmentIds.length
      ? supabase.from("payment_milestones").select("*").in("assignment_id", assignmentIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    assignmentIds.length
      ? supabase
          .from("payment_transactions")
          .select("*")
          .in("assignment_id", assignmentIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ]);

  const campaigns = campaignsRes.data ?? [];
  const influencers = influencersRes.data ?? [];
  const milestones = milestonesRes.data ?? [];
  const transactions = transactionsRes.data ?? [];

  const campaignMap = new Map((campaigns ?? []).map((item) => [item.id as string, item]));
  const influencerMap = new Map((influencers ?? []).map((item) => [item.id as string, item]));
  const assignmentMap = new Map((assignments ?? []).map((item) => [item.id as string, item]));
  const txByMilestone = new Map<string, Record<string, unknown>[]>();

  for (const tx of transactions) {
    const milestoneId = tx.milestone_id as string;
    const list = txByMilestone.get(milestoneId) ?? [];
    list.push(tx);
    txByMilestone.set(milestoneId, list);
  }

  const filteredMilestones = (milestones ?? []).filter((milestone) => {
    const assignment = assignmentMap.get(milestone.assignment_id as string);
    if (!assignment) return false;

    const campaign = campaignMap.get(assignment.campaign_id as string);
    const influencer = influencerMap.get(assignment.influencer_id as string);

    if (statusFilter && statusFilter !== "all" && milestone.status !== statusFilter) {
      return false;
    }
    if (campaignFilter && assignment.campaign_id !== campaignFilter) {
      return false;
    }
    if (influencerFilter && assignment.influencer_id !== influencerFilter) {
      return false;
    }
    if (query) {
      const campaignTitle = ((campaign?.title as string) ?? "").toLowerCase();
      const influencerName = ((influencer?.full_name as string) ?? "").toLowerCase();
      if (!campaignTitle.includes(query) && !influencerName.includes(query)) {
        return false;
      }
    }
    return true;
  });

  const header = [
    "influencer_name",
    "campaign_title",
    "milestone_label",
    "milestone_amount",
    "milestone_status",
    "paid_at",
    "method",
    "reference_no",
  ];

  const lines = [header.join(",")];

  for (const milestone of filteredMilestones) {
    const assignment = assignmentMap.get(milestone.assignment_id as string);
    if (!assignment) continue;

    const campaign = campaignMap.get(assignment.campaign_id as string);
    const influencer = influencerMap.get(assignment.influencer_id as string);
    const latestTransaction = (txByMilestone.get(milestone.id as string) ?? [])[0] ?? null;

    const row = [
      escapeCsv((influencer?.full_name as string) ?? ""),
      escapeCsv((campaign?.title as string) ?? ""),
      escapeCsv((milestone.label as string) ?? ""),
      escapeCsv(typeof milestone.amount === "number" ? milestone.amount : 0),
      escapeCsv((milestone.status as string) ?? "pending"),
      escapeCsv((milestone.paid_at as string | null) ?? ""),
      escapeCsv((latestTransaction?.method as string | null) ?? ""),
      escapeCsv((latestTransaction?.reference_no as string | null) ?? ""),
    ];

    lines.push(row.join(","));
  }

  const body = lines.join("\n");
  const now = new Date().toISOString().slice(0, 10);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=payments-${now}.csv`,
    },
  });
}
