import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AdminDashboardView } from "@/components/admin/AdminDashboardView";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { getSelectedOrgId } from "@/lib/org/getSelectedOrgId";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 30;

type ActivityRow = {
  id: string;
  type: "Submission" | "Proof" | "Payment";
  at: string;
  title: string;
  subtitle: string;
};

function toCurrency(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString(undefined, { month: "short" });
}

function buildLastSixMonths() {
  const now = new Date();
  return Array.from({ length: 6 }).map((_, idx) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - idx), 1));
    return { key: monthKey(d), label: monthLabel(d) };
  });
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={index} interactive={false} className="p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-24" />
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card interactive={false} className="p-5">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="mt-3 h-64 w-full" />
        </Card>
        <Card interactive={false} className="p-5">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="mt-3 h-64 w-full" />
        </Card>
      </section>
    </div>
  );
}

async function DashboardContent({ orgId }: { orgId: string }) {
  const supabase = await createClient();
  const months = buildLastSixMonths();

  const paid30dStart = new Date();
  paid30dStart.setDate(paid30dStart.getDate() - 30);

  const [campaignsRes, assignmentsRes, paid30dRes] = await Promise.all([
    supabase.from("campaigns").select("id, title, status, created_at").eq("org_id", orgId),
    supabase
      .from("campaign_assignments")
      .select("id, campaign_id, influencer_id, org_id, status, invited_at, accepted_at")
      .eq("org_id", orgId),
    supabase
      .from("payment_transactions")
      .select("id, assignment_id, amount, created_at")
      .eq("org_id", orgId)
      .gte("created_at", paid30dStart.toISOString()),
  ]);

  const campaigns = campaignsRes.data ?? [];
  const assignments = assignmentsRes.data ?? [];
  const paid30dTxns = paid30dRes.data ?? [];
  const assignmentIds = assignments.map((item) => item.id as string);
  const influencerIds = Array.from(new Set(assignments.map((item) => item.influencer_id as string)));

  const [
    submissionsRes,
    proofsRes,
    milestonesRes,
    deliverablesRes,
    recentSubmissionsRes,
    recentProofsRes,
    recentTxnsRes,
    influencersRes,
  ] = await Promise.all([
    assignmentIds.length
      ? supabase
          .from("content_submissions")
          .select("id, assignment_id, deliverable_id, status, submitted_at, created_at")
          .in("assignment_id", assignmentIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    assignmentIds.length
      ? supabase
          .from("post_proofs")
          .select("id, assignment_id, status, posted_at")
          .in("assignment_id", assignmentIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    assignmentIds.length
      ? supabase
          .from("payment_milestones")
          .select("id, assignment_id, amount, status, ready_at, paid_at")
          .in("assignment_id", assignmentIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    campaigns.length
      ? supabase
          .from("campaign_deliverables")
          .select("id, campaign_id, payout_amount")
          .in(
            "campaign_id",
            campaigns.map((item) => item.id as string),
          )
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    assignmentIds.length
      ? supabase
          .from("content_submissions")
          .select("id, assignment_id, status, submitted_at")
          .in("assignment_id", assignmentIds)
          .not("submitted_at", "is", null)
          .order("submitted_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    assignmentIds.length
      ? supabase
          .from("post_proofs")
          .select("id, assignment_id, status, posted_at")
          .in("assignment_id", assignmentIds)
          .not("posted_at", "is", null)
          .order("posted_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    supabase
      .from("payment_transactions")
      .select("id, assignment_id, amount, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(10),
    influencerIds.length
      ? supabase.from("influencers").select("id, full_name").in("id", influencerIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ]);

  const submissions = submissionsRes.data ?? [];
  const proofs = proofsRes.data ?? [];
  const milestones = milestonesRes.data ?? [];
  const deliverables = deliverablesRes.data ?? [];
  const recentSubmissions = recentSubmissionsRes.data ?? [];
  const recentProofs = recentProofsRes.data ?? [];
  const recentTxns = recentTxnsRes.data ?? [];
  const influencers = influencersRes.data ?? [];

  const influencerMap = new Map(influencers.map((item) => [item.id as string, item]));
  const campaignMap = new Map(campaigns.map((item) => [item.id as string, item]));
  const assignmentMap = new Map(assignments.map((item) => [item.id as string, item]));

  const activeCampaigns = campaigns.filter((item) => item.status === "active").length;
  const pendingApprovals = submissions.filter((item) => item.status === "submitted").length;
  const proofsPending = proofs.filter((item) => item.status === "posted_pending" || item.status === "needs_url").length;

  const readyMilestones = milestones.filter((item) => item.status === "ready");
  const paymentsReadyCount = readyMilestones.length;
  const paymentsReadyAmount = readyMilestones.reduce(
    (sum, item) => sum + (typeof item.amount === "number" ? item.amount : 0),
    0,
  );

  const totalPaid30d = paid30dTxns.reduce(
    (sum, item) => sum + (typeof item.amount === "number" ? item.amount : 0),
    0,
  );

  const campaignPerformanceMap = new Map(
    months.map((month) => [month.key, { label: month.label, active: 0, completed: 0 }]),
  );

  for (const campaign of campaigns) {
    if (!campaign.created_at) continue;
    const key = monthKey(new Date(campaign.created_at as string));
    const bucket = campaignPerformanceMap.get(key);
    if (!bucket) continue;
    if (campaign.status === "active") bucket.active += 1;
    if (campaign.status === "completed") bucket.completed += 1;
  }

  const campaignPerformance = Array.from(campaignPerformanceMap.values());

  const draftFunnel = [
    { status: "submitted", count: submissions.filter((item) => item.status === "submitted").length },
    {
      status: "needs_revision",
      count: submissions.filter((item) => item.status === "needs_revision").length,
    },
    { status: "approved", count: submissions.filter((item) => item.status === "approved").length },
  ];

  const proofStatus = [
    {
      status: "proofs",
      pending: proofs.filter((item) => item.status === "posted_pending").length,
      needsUrl: proofs.filter((item) => item.status === "needs_url").length,
      verified: proofs.filter((item) => item.status === "verified").length,
      rejected: proofs.filter((item) => item.status === "rejected").length,
    },
  ];

  const paymentsByMonth = new Map(
    months.map((month) => [month.key, { label: month.label, ready: 0, paid: 0, trend: 0 }]),
  );

  for (const milestone of milestones) {
    if (milestone.status === "ready" && milestone.ready_at) {
      const key = monthKey(new Date(milestone.ready_at as string));
      const bucket = paymentsByMonth.get(key);
      if (bucket) {
        bucket.ready += typeof milestone.amount === "number" ? milestone.amount : 0;
      }
    }
    if (milestone.status === "paid" && milestone.paid_at) {
      const key = monthKey(new Date(milestone.paid_at as string));
      const bucket = paymentsByMonth.get(key);
      if (bucket) {
        bucket.paid += typeof milestone.amount === "number" ? milestone.amount : 0;
      }
    }
  }

  for (const txn of recentTxns) {
    if (!txn.created_at) continue;
    const key = monthKey(new Date(txn.created_at as string));
    const bucket = paymentsByMonth.get(key);
    if (bucket) {
      bucket.trend += typeof txn.amount === "number" ? txn.amount : 0;
    }
  }

  const paymentTrend = Array.from(paymentsByMonth.values());

  const payoutByCampaign = new Map<string, number>();
  for (const item of deliverables) {
    const campaignId = item.campaign_id as string;
    payoutByCampaign.set(
      campaignId,
      (payoutByCampaign.get(campaignId) ?? 0) + (typeof item.payout_amount === "number" ? item.payout_amount : 0),
    );
  }

  const influencerActivity = influencers.slice(0, 8).map((influencer) => {
    const joinedAssignments = assignments.filter((item) => item.influencer_id === influencer.id);
    const joinedCount = joinedAssignments.length;
    const verifiedCount = proofs.filter(
      (proof) =>
        proof.status === "verified" && joinedAssignments.some((assignment) => assignment.id === proof.assignment_id),
    ).length;
    const payout = joinedAssignments.reduce((sum, assignment) => {
      const campaignId = assignment.campaign_id as string;
      return sum + (payoutByCampaign.get(campaignId) ?? 0);
    }, 0);

    return {
      id: influencer.id as string,
      name: (influencer.full_name as string) ?? "Influencer",
      campaignsJoined: joinedCount,
      verifiedPosts: verifiedCount,
      payout,
      trend: [
        { key: "invited", value: joinedAssignments.filter((item) => item.status === "invited").length },
        { key: "accepted", value: joinedAssignments.filter((item) => item.status === "accepted").length },
        { key: "verified", value: verifiedCount },
      ],
    };
  });

  const activity: ActivityRow[] = [
    ...recentSubmissions.map((item) => {
      const assignment = assignmentMap.get(item.assignment_id as string);
      const campaign = assignment ? campaignMap.get(assignment.campaign_id as string) : null;
      const influencer = assignment ? influencerMap.get(assignment.influencer_id as string) : null;

      return {
        id: `submission-${item.id as string}`,
        type: "Submission" as const,
        at: item.submitted_at as string,
        title: (campaign?.title as string) ?? "Campaign",
        subtitle: `By ${(influencer?.full_name as string) ?? "Influencer"}`,
      };
    }),
    ...recentProofs.map((item) => {
      const assignment = assignmentMap.get(item.assignment_id as string);
      const campaign = assignment ? campaignMap.get(assignment.campaign_id as string) : null;
      const influencer = assignment ? influencerMap.get(assignment.influencer_id as string) : null;

      return {
        id: `proof-${item.id as string}`,
        type: "Proof" as const,
        at: item.posted_at as string,
        title: (campaign?.title as string) ?? "Campaign",
        subtitle: `By ${(influencer?.full_name as string) ?? "Influencer"}`,
      };
    }),
    ...recentTxns.map((item) => {
      const assignment = assignmentMap.get(item.assignment_id as string);
      const campaign = assignment ? campaignMap.get(assignment.campaign_id as string) : null;
      const influencer = assignment ? influencerMap.get(assignment.influencer_id as string) : null;

      return {
        id: `payment-${item.id as string}`,
        type: "Payment" as const,
        at: item.created_at as string,
        title: `PHP ${toCurrency(typeof item.amount === "number" ? item.amount : 0)}`,
        subtitle: `${(campaign?.title as string) ?? "Campaign"} | ${(influencer?.full_name as string) ?? "Influencer"}`,
      };
    }),
  ]
    .filter((item) => Boolean(item.at))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 10);

  return (
    <AdminDashboardView
      kpis={{
        activeCampaigns,
        pendingApprovals,
        proofsPending,
        readyAmount: paymentsReadyAmount,
        readyCount: paymentsReadyCount,
        paid30d: totalPaid30d,
      }}
      campaignPerformance={campaignPerformance}
      draftFunnel={draftFunnel}
      proofStatus={proofStatus}
      paymentTrend={paymentTrend}
      influencerActivity={influencerActivity}
      recentActivity={activity}
    />
  );
}

export default async function AdminDashboardPage() {
  const orgId = await getSelectedOrgId();
  if (!orgId) {
    redirect("/admin/select-org");
  }

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent orgId={orgId} />
    </Suspense>
  );
}
