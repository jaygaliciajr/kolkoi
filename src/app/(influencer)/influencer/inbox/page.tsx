import Link from "next/link";
import { redirect } from "next/navigation";

import { InviteDecisionActions } from "@/components/influencer/InviteDecisionActions";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { NextActionPanel } from "@/components/ui/NextActionPanel";
import { getCurrentInfluencer } from "@/lib/influencers/getCurrentInfluencer";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 10;

export default async function InfluencerInboxPage() {
  const influencer = await getCurrentInfluencer();
  if (!influencer) {
    redirect("/influencer/profile");
  }

  const supabase = await createClient();
  const { data: assignments } = await supabase
    .from("campaign_assignments")
    .select("id, campaign_id, status, invited_at, responded_at")
    .eq("influencer_id", influencer.id)
    .in("status", ["invited", "accepted", "declined"])
    .order("invited_at", { ascending: false });

  const campaignIds = Array.from(new Set((assignments ?? []).map((item) => item.campaign_id as string)));

  const { data: campaigns } = campaignIds.length
    ? await supabase.from("campaigns").select("id, org_id, title, end_date").in("id", campaignIds)
    : { data: [] as Record<string, unknown>[] };
  const campaignMap = new Map((campaigns ?? []).map((item) => [item.id as string, item]));

  const orgIds = Array.from(new Set((campaigns ?? []).map((item) => item.org_id as string)));
  const { data: orgs } = orgIds.length
    ? await supabase.from("organizations").select("id, name").in("id", orgIds)
    : { data: [] as { id: string; name: string }[] };
  const orgNameMap = new Map((orgs ?? []).map((item) => [item.id as string, item.name as string]));

  const { data: deliverables } = campaignIds.length
    ? await supabase.from("campaign_deliverables").select("campaign_id, payout_amount, due_at").in("campaign_id", campaignIds)
    : { data: [] as Record<string, unknown>[] };

  const payoutByCampaign = new Map<string, number>();
  const earliestDueByCampaign = new Map<string, string>();
  for (const item of deliverables ?? []) {
    const campaignId = item.campaign_id as string;
    const payout = typeof item.payout_amount === "number" ? item.payout_amount : 0;
    payoutByCampaign.set(campaignId, (payoutByCampaign.get(campaignId) ?? 0) + payout);

    if (typeof item.due_at === "string") {
      const existing = earliestDueByCampaign.get(campaignId);
      if (!existing || item.due_at < existing) {
        earliestDueByCampaign.set(campaignId, item.due_at);
      }
    }
  }

  const pendingInvites = (assignments ?? []).filter((item) => item.status === "invited").length;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Inbox</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Respond to campaign invites and track decisions.</p>
      </div>

      <NextActionPanel
        title="Next Action"
        description="Respond quickly so campaigns can proceed on schedule."
        items={pendingInvites > 0 ? [{ label: "Respond to pending invites", href: "/influencer/inbox" }] : []}
      />

      {(assignments ?? []).length === 0 ? (
        <EmptyState
          title="No invites yet"
          description="Your campaign invitations will appear here once an admin sends one."
          ctaLabel="Browse campaigns"
          ctaHref="/influencer/campaigns"
        />
      ) : (
        (assignments ?? []).map((assignment) => {
          const campaign = campaignMap.get(assignment.campaign_id as string);
          const endDate = campaign && typeof campaign.end_date === "string" ? campaign.end_date : null;
          const earliestDue = earliestDueByCampaign.get(assignment.campaign_id as string);
          const totalPayout = payoutByCampaign.get(assignment.campaign_id as string) ?? 0;
          const orgName =
            campaign && typeof campaign.org_id === "string"
              ? orgNameMap.get(campaign.org_id) ?? "Organization"
              : "Organization";

          return (
            <Card key={assignment.id as string} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{(campaign?.title as string) ?? "Campaign"}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{orgName}</p>
                </div>
                <StatusBadge status={assignment.status as string | null} />
              </div>

              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">End date</dt>
                  <dd className="text-slate-700 dark:text-slate-200">{endDate ? new Date(endDate).toLocaleDateString() : "-"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Earliest due</dt>
                  <dd className="text-slate-700 dark:text-slate-200">{earliestDue ? new Date(earliestDue).toLocaleString() : "-"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Total payout</dt>
                  <dd className="text-slate-700 dark:text-slate-200">{totalPayout.toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Status</dt>
                  <dd className="text-slate-700 dark:text-slate-200">{(assignment.status as string) ?? "-"}</dd>
                </div>
              </dl>

              {(assignment.status as string) === "invited" ? (
                <InviteDecisionActions assignmentId={assignment.id as string} />
              ) : (
                <Link href={`/influencer/campaigns/${assignment.id as string}`} className="inline-flex">
                  <Button variant="secondary" size="sm">View Details</Button>
                </Link>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
