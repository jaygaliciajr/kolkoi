import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { escapeCsv, requireSuperAdminApi } from "@/lib/super-admin/api";

export async function GET() {
  const forbidden = await requireSuperAdminApi();
  if (forbidden) {
    return forbidden;
  }

  const supabase = await createClient();
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, tier, created_at")
    .order("created_at", { ascending: false });

  const orgIds = (orgs ?? []).map((org) => org.id as string);

  const [campaignsRes, influencersRes, submissionsRes, proofsRes, milestonesRes] = await Promise.all([
    orgIds.length
      ? supabase.from("campaigns").select("id, org_id, status").in("org_id", orgIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    orgIds.length
      ? supabase.from("influencers").select("id, org_id").in("org_id", orgIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    orgIds.length
      ? supabase
          .from("content_submissions")
          .select("id, org_id")
          .in("org_id", orgIds)
          .eq("status", "submitted")
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    orgIds.length
      ? supabase
          .from("post_proofs")
          .select("id, org_id")
          .in("org_id", orgIds)
          .in("status", ["posted_pending", "needs_url"])
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    orgIds.length
      ? supabase
          .from("payment_milestones")
          .select("id, org_id, amount")
          .in("org_id", orgIds)
          .eq("status", "ready")
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ]);

  const activeCampaignsByOrg = new Map<string, number>();
  for (const row of campaignsRes.data ?? []) {
    if (row.status !== "active") continue;
    const orgId = row.org_id as string;
    activeCampaignsByOrg.set(orgId, (activeCampaignsByOrg.get(orgId) ?? 0) + 1);
  }

  const influencerByOrg = new Map<string, number>();
  for (const row of influencersRes.data ?? []) {
    const orgId = row.org_id as string;
    influencerByOrg.set(orgId, (influencerByOrg.get(orgId) ?? 0) + 1);
  }

  const pendingApprovalsByOrg = new Map<string, number>();
  for (const row of submissionsRes.data ?? []) {
    const orgId = row.org_id as string;
    pendingApprovalsByOrg.set(orgId, (pendingApprovalsByOrg.get(orgId) ?? 0) + 1);
  }

  const pendingProofsByOrg = new Map<string, number>();
  for (const row of proofsRes.data ?? []) {
    const orgId = row.org_id as string;
    pendingProofsByOrg.set(orgId, (pendingProofsByOrg.get(orgId) ?? 0) + 1);
  }

  const paymentsReadyByOrg = new Map<string, number>();
  for (const row of milestonesRes.data ?? []) {
    const orgId = row.org_id as string;
    const amount = typeof row.amount === "number" ? row.amount : 0;
    paymentsReadyByOrg.set(orgId, (paymentsReadyByOrg.get(orgId) ?? 0) + amount);
  }

  const header = [
    "org_name",
    "tier",
    "created_at",
    "influencers_count",
    "active_campaigns_count",
    "pending_approvals_count",
    "pending_proofs_count",
    "payments_ready_amount",
  ];

  const lines = [header.join(",")];

  for (const org of orgs ?? []) {
    const orgId = org.id as string;
    lines.push(
      [
        escapeCsv((org.name as string) ?? "Organization"),
        escapeCsv((org.tier as string) ?? "starter"),
        escapeCsv((org.created_at as string) ?? ""),
        escapeCsv(influencerByOrg.get(orgId) ?? 0),
        escapeCsv(activeCampaignsByOrg.get(orgId) ?? 0),
        escapeCsv(pendingApprovalsByOrg.get(orgId) ?? 0),
        escapeCsv(pendingProofsByOrg.get(orgId) ?? 0),
        escapeCsv(paymentsReadyByOrg.get(orgId) ?? 0),
      ].join(","),
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=super-admin-orgs.csv",
    },
  });
}
