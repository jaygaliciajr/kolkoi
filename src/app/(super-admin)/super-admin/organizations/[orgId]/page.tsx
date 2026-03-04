import { notFound } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/super-admin/auth";

export const revalidate = 60;

type Params = Promise<{ orgId: string }>;

type ActivityItem = {
  id: string;
  type: "submission" | "proof" | "payment";
  at: string;
  title: string;
  subtitle: string;
};

function toCurrency(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function SuperAdminOrganizationDetailPage({ params }: { params: Params }) {
  await requireSuperAdmin();
  const { orgId } = await params;

  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, tier, created_at")
    .eq("id", orgId)
    .maybeSingle();

  if (!org) {
    notFound();
  }

  const paid30dStart = new Date();
  paid30dStart.setDate(paid30dStart.getDate() - 30);

  const [campaignsRes, influencersRes, assignmentsRes, txRes, submissionsRes, proofsRes] = await Promise.all([
    supabase.from("campaigns").select("id, title, status").eq("org_id", orgId),
    supabase.from("influencers").select("id, full_name").eq("org_id", orgId),
    supabase
      .from("campaign_assignments")
      .select("id, campaign_id, influencer_id, status")
      .eq("org_id", orgId),
    supabase
      .from("payment_transactions")
      .select("id, assignment_id, amount, created_at")
      .eq("org_id", orgId)
      .gte("created_at", paid30dStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("content_submissions")
      .select("id, assignment_id, submitted_at")
      .eq("org_id", orgId)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false })
      .limit(20),
    supabase
      .from("post_proofs")
      .select("id, assignment_id, posted_at")
      .eq("org_id", orgId)
      .not("posted_at", "is", null)
      .order("posted_at", { ascending: false })
      .limit(20),
  ]);

  const campaigns = campaignsRes.data ?? [];
  const influencers = influencersRes.data ?? [];
  const assignments = assignmentsRes.data ?? [];
  const transactions = txRes.data ?? [];
  const submissions = submissionsRes.data ?? [];
  const proofs = proofsRes.data ?? [];

  const campaignMap = new Map(campaigns.map((row) => [row.id as string, row]));
  const influencerMap = new Map(influencers.map((row) => [row.id as string, row]));
  const assignmentMap = new Map(assignments.map((row) => [row.id as string, row]));

  const activity: ActivityItem[] = [
    ...submissions.map((row) => {
      const assignment = assignmentMap.get(row.assignment_id as string);
      const campaign = assignment ? campaignMap.get(assignment.campaign_id as string) : null;
      const influencer = assignment ? influencerMap.get(assignment.influencer_id as string) : null;
      return {
        id: `sub-${row.id as string}`,
        type: "submission" as const,
        at: row.submitted_at as string,
        title: campaign?.title ? (campaign.title as string) : "Campaign",
        subtitle: influencer?.full_name ? `By ${influencer.full_name as string}` : "Draft submitted",
      };
    }),
    ...proofs.map((row) => {
      const assignment = assignmentMap.get(row.assignment_id as string);
      const campaign = assignment ? campaignMap.get(assignment.campaign_id as string) : null;
      const influencer = assignment ? influencerMap.get(assignment.influencer_id as string) : null;
      return {
        id: `proof-${row.id as string}`,
        type: "proof" as const,
        at: row.posted_at as string,
        title: campaign?.title ? (campaign.title as string) : "Campaign",
        subtitle: influencer?.full_name ? `By ${influencer.full_name as string}` : "Proof posted",
      };
    }),
    ...transactions.map((row) => {
      const assignment = assignmentMap.get(row.assignment_id as string);
      const campaign = assignment ? campaignMap.get(assignment.campaign_id as string) : null;
      const influencer = assignment ? influencerMap.get(assignment.influencer_id as string) : null;
      const amount = typeof row.amount === "number" ? row.amount : 0;
      return {
        id: `pay-${row.id as string}`,
        type: "payment" as const,
        at: row.created_at as string,
        title: `PHP ${toCurrency(amount)}`,
        subtitle: `${campaign?.title ? (campaign.title as string) : "Campaign"} | ${influencer?.full_name ? (influencer.full_name as string) : "Influencer"}`,
      };
    }),
  ]
    .filter((row) => Boolean(row.at))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 20);

  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((row) => row.status === "active").length;
  const completedCampaigns = campaigns.filter((row) => row.status === "completed").length;
  const acceptedAssignments = assignments.filter((row) => row.status === "accepted").length;
  const paidLast30d = transactions.reduce((sum, row) => sum + (typeof row.amount === "number" ? row.amount : 0), 0);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{(org.name as string) ?? "Organization"}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Tier: {(org.tier as string) ?? "starter"} • Created {org.created_at ? new Date(org.created_at as string).toLocaleDateString() : "-"}
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="p-4" interactive={false}><p className="text-xs text-slate-500">Campaigns Total</p><p className="mt-1 text-2xl font-bold">{totalCampaigns}</p></Card>
        <Card className="p-4" interactive={false}><p className="text-xs text-slate-500">Campaigns Active</p><p className="mt-1 text-2xl font-bold">{activeCampaigns}</p></Card>
        <Card className="p-4" interactive={false}><p className="text-xs text-slate-500">Campaigns Completed</p><p className="mt-1 text-2xl font-bold">{completedCampaigns}</p></Card>
        <Card className="p-4" interactive={false}><p className="text-xs text-slate-500">Influencers</p><p className="mt-1 text-2xl font-bold">{influencers.length}</p></Card>
        <Card className="p-4" interactive={false}><p className="text-xs text-slate-500">Assignments Accepted</p><p className="mt-1 text-2xl font-bold">{acceptedAssignments}</p></Card>
      </section>

      <Card className="p-4" interactive={false}>
        <p className="text-sm text-slate-500 dark:text-slate-400">Paid Last 30 Days</p>
        <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">PHP {toCurrency(paidLast30d)}</p>
      </Card>

      <Card className="p-4" interactive={false}>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recent Activity</h2>
        {activity.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No activity yet for this organization.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {activity.map((row) => (
              <article key={row.id} className="rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-900/70">
                <div className="flex items-center justify-between gap-3">
                  <StatusBadge status={row.type} />
                  <time className="text-xs text-slate-500 dark:text-slate-400">{new Date(row.at).toLocaleString()}</time>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">{row.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{row.subtitle}</p>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
