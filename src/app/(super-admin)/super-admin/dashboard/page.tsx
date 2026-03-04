import { SuperAdminDashboardView } from "@/components/super-admin/SuperAdminDashboardView";
import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/super-admin/auth";

export const revalidate = 60;

function toWeekKey(input: string) {
  const date = new Date(input);
  const day = date.getUTCDay();
  const diff = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - diff);
  const y = date.getUTCFullYear();
  const m = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const d = `${date.getUTCDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shortDate(input: string) {
  return new Date(input).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function sumAmount(rows: Record<string, unknown>[]) {
  return rows.reduce((sum, row) => sum + (typeof row.amount === "number" ? row.amount : 0), 0);
}

export default async function SuperAdminDashboardPage() {
  await requireSuperAdmin();

  const supabase = await createClient();
  const paid30dStart = new Date();
  paid30dStart.setDate(paid30dStart.getDate() - 30);

  const [
    orgsRes,
    activeCampaignsRes,
    campaignsForChartRes,
    influencersRes,
    assignmentsRes,
    pendingApprovalsRes,
    pendingProofsRes,
    readyMilestonesRes,
    paid30dRes,
    orgGrowthRes,
    paymentsTrendRes,
  ] = await Promise.all([
    supabase.from("organizations").select("id", { count: "exact", head: true }),
    supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("campaigns").select("id, status"),
    supabase.from("influencers").select("id", { count: "exact", head: true }),
    supabase
      .from("campaign_assignments")
      .select("id", { count: "exact", head: true })
      .in("status", ["invited", "accepted"]),
    supabase.from("content_submissions").select("id", { count: "exact", head: true }).eq("status", "submitted"),
    supabase.from("post_proofs").select("id", { count: "exact", head: true }).in("status", ["posted_pending", "needs_url"]),
    supabase.from("payment_milestones").select("id, amount").eq("status", "ready"),
    supabase
      .from("payment_transactions")
      .select("id, amount")
      .gte("created_at", paid30dStart.toISOString()),
    supabase.from("organizations").select("created_at").order("created_at", { ascending: true }),
    supabase
      .from("payment_transactions")
      .select("created_at, amount")
      .order("created_at", { ascending: true })
      .limit(1000),
  ]);

  const readyMilestones = readyMilestonesRes.data ?? [];
  const paid30d = paid30dRes.data ?? [];
  const campaignsForChart = campaignsForChartRes.data ?? [];

  const orgGrowthMap = new Map<string, number>();
  for (const row of orgGrowthRes.data ?? []) {
    if (typeof row.created_at !== "string") continue;
    const key = toWeekKey(row.created_at);
    orgGrowthMap.set(key, (orgGrowthMap.get(key) ?? 0) + 1);
  }
  const orgGrowthData = Array.from(orgGrowthMap.entries()).map(([week, count]) => ({
    week: shortDate(week),
    count,
  }));

  const campaignActivityData = [
    {
      name: "Campaigns",
      active: campaignsForChart.filter((row) => row.status === "active").length,
      completed: campaignsForChart.filter((row) => row.status === "completed").length,
    },
  ];

  const paymentsTrendMap = new Map<string, number>();
  for (const row of paymentsTrendRes.data ?? []) {
    if (typeof row.created_at !== "string") continue;
    const key = toWeekKey(row.created_at);
    const amount = typeof row.amount === "number" ? row.amount : 0;
    paymentsTrendMap.set(key, (paymentsTrendMap.get(key) ?? 0) + amount);
  }
  const paymentsTrendData = Array.from(paymentsTrendMap.entries()).map(([week, amount]) => ({
    week: shortDate(week),
    amount,
  }));

  return (
    <SuperAdminDashboardView
      totalOrganizations={orgsRes.count ?? 0}
      activeCampaigns={activeCampaignsRes.count ?? 0}
      totalInfluencers={influencersRes.count ?? 0}
      totalAssignments={assignmentsRes.count ?? 0}
      pendingApprovals={pendingApprovalsRes.count ?? 0}
      pendingProofs={pendingProofsRes.count ?? 0}
      paymentsReadyAmount={sumAmount(readyMilestones)}
      paymentsReadyCount={readyMilestones.length}
      totalPaid30d={sumAmount(paid30d)}
      orgGrowthData={orgGrowthData}
      campaignActivityData={campaignActivityData}
      paymentsTrendData={paymentsTrendData}
    />
  );
}
