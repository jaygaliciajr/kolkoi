import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { escapeCsv, requireSuperAdminApi } from "@/lib/super-admin/api";

function toIsoStart(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toIsoEnd(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function GET(request: NextRequest) {
  const forbidden = await requireSuperAdminApi();
  if (forbidden) {
    return forbidden;
  }

  const search = new URL(request.url).searchParams;
  const from = toIsoStart(search.get("from"));
  const to = toIsoEnd(search.get("to"));

  const supabase = await createClient();
  let txQuery = supabase
    .from("payment_transactions")
    .select("id, org_id, assignment_id, milestone_id, method, reference_no, amount, created_at")
    .order("created_at", { ascending: false });

  if (from) {
    txQuery = txQuery.gte("created_at", from);
  }
  if (to) {
    txQuery = txQuery.lte("created_at", to);
  }

  const { data: transactions } = await txQuery.limit(5000);

  const assignmentIds = Array.from(new Set((transactions ?? []).map((row) => row.assignment_id as string)));
  const milestoneIds = Array.from(new Set((transactions ?? []).map((row) => row.milestone_id as string)));
  const orgIds = Array.from(new Set((transactions ?? []).map((row) => row.org_id as string)));

  const [assignmentsRes, milestonesRes, orgsRes] = await Promise.all([
    assignmentIds.length
      ? supabase
          .from("campaign_assignments")
          .select("id, campaign_id, influencer_id")
          .in("id", assignmentIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    milestoneIds.length
      ? supabase
          .from("payment_milestones")
          .select("id, assignment_id, label, amount, status, paid_at")
          .in("id", milestoneIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    orgIds.length
      ? supabase.from("organizations").select("id, name").in("id", orgIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ]);

  const assignments = assignmentsRes.data ?? [];
  const milestones = milestonesRes.data ?? [];
  const orgs = orgsRes.data ?? [];

  const campaignIds = Array.from(new Set(assignments.map((row) => row.campaign_id as string)));
  const influencerIds = Array.from(new Set(assignments.map((row) => row.influencer_id as string)));

  const [campaignsRes, influencersRes] = await Promise.all([
    campaignIds.length
      ? supabase.from("campaigns").select("id, title").in("id", campaignIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    influencerIds.length
      ? supabase.from("influencers").select("id, full_name").in("id", influencerIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ]);

  const assignmentMap = new Map(assignments.map((row) => [row.id as string, row]));
  const milestoneMap = new Map(milestones.map((row) => [row.id as string, row]));
  const orgMap = new Map(orgs.map((row) => [row.id as string, row.name as string]));
  const campaignMap = new Map((campaignsRes.data ?? []).map((row) => [row.id as string, row.title as string]));
  const influencerMap = new Map((influencersRes.data ?? []).map((row) => [row.id as string, row.full_name as string]));

  const header = [
    "org_name",
    "campaign_title",
    "influencer_name",
    "milestone_label",
    "milestone_amount",
    "milestone_status",
    "paid_at",
    "method",
    "reference_no",
    "transaction_amount",
  ];

  const lines = [header.join(",")];

  for (const row of transactions ?? []) {
    const assignment = assignmentMap.get(row.assignment_id as string);
    const milestone = milestoneMap.get(row.milestone_id as string);

    lines.push(
      [
        escapeCsv(orgMap.get(row.org_id as string) ?? "Organization"),
        escapeCsv(assignment ? campaignMap.get(assignment.campaign_id as string) ?? "Campaign" : "Campaign"),
        escapeCsv(assignment ? influencerMap.get(assignment.influencer_id as string) ?? "Influencer" : "Influencer"),
        escapeCsv((milestone?.label as string | undefined) ?? ""),
        escapeCsv(typeof milestone?.amount === "number" ? milestone.amount : 0),
        escapeCsv((milestone?.status as string | undefined) ?? ""),
        escapeCsv((milestone?.paid_at as string | undefined) ?? ""),
        escapeCsv((row.method as string | undefined) ?? ""),
        escapeCsv((row.reference_no as string | undefined) ?? ""),
        escapeCsv(typeof row.amount === "number" ? row.amount : 0),
      ].join(","),
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=super-admin-payments.csv",
    },
  });
}
