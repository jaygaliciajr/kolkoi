import Link from "next/link";
import { redirect } from "next/navigation";

import { PaymentStatusBadge } from "@/components/payments/PaymentStatusBadge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { NextActionPanel } from "@/components/ui/NextActionPanel";
import { getSelectedOrgId } from "@/lib/org/getSelectedOrgId";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{
  status?: string;
  campaign?: string;
  influencer?: string;
  q?: string;
}>;
export const revalidate = 10;

type StatusFilter = "ready" | "paid" | "pending" | "all";

function parseStatus(value: string | undefined): StatusFilter {
  if (value === "ready" || value === "paid" || value === "pending") {
    return value;
  }
  return "all";
}

function toCurrency(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function AdminPaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  const orgId = await getSelectedOrgId();
  if (!orgId) {
    redirect("/admin/select-org");
  }

  const params = await searchParams;
  const statusFilter = parseStatus(params.status);
  const campaignFilter = params.campaign ?? "";
  const influencerFilter = params.influencer ?? "";
  const query = (params.q ?? "").trim().toLowerCase();

  const supabase = await createClient();
  const { data: assignments } = await supabase
    .from("campaign_assignments")
    .select("id, campaign_id, influencer_id, org_id")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  const assignmentIds = (assignments ?? []).map((item) => item.id as string);
  const campaignIds = Array.from(new Set((assignments ?? []).map((item) => item.campaign_id as string)));
  const influencerIds = Array.from(new Set((assignments ?? []).map((item) => item.influencer_id as string)));

  const [campaignsRes, influencersRes, milestonesRes, deliverablesRes] = await Promise.all([
    campaignIds.length
      ? supabase.from("campaigns").select("id, title").in("id", campaignIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    influencerIds.length
      ? supabase.from("influencers").select("id, full_name").in("id", influencerIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    assignmentIds.length
      ? supabase.from("payment_milestones").select("*").in("assignment_id", assignmentIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    campaignIds.length
      ? supabase
          .from("campaign_deliverables")
          .select("id, campaign_id, payout_amount")
          .in("campaign_id", campaignIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ]);

  const campaigns = campaignsRes.data ?? [];
  const influencers = influencersRes.data ?? [];
  const milestones = milestonesRes.data ?? [];
  const deliverables = deliverablesRes.data ?? [];

  const campaignMap = new Map(campaigns.map((item) => [item.id as string, item]));
  const influencerMap = new Map(influencers.map((item) => [item.id as string, item]));

  const payoutByCampaign = new Map<string, number>();
  for (const deliverable of deliverables) {
    const campaignId = deliverable.campaign_id as string;
    const amount = typeof deliverable.payout_amount === "number" ? deliverable.payout_amount : 0;
    payoutByCampaign.set(campaignId, (payoutByCampaign.get(campaignId) ?? 0) + amount);
  }

  const milestonesByAssignment = new Map<string, Record<string, unknown>[]>();
  for (const milestone of milestones) {
    const assignmentId = milestone.assignment_id as string;
    const list = milestonesByAssignment.get(assignmentId) ?? [];
    list.push(milestone);
    milestonesByAssignment.set(assignmentId, list);
  }

  const rows = (assignments ?? [])
    .map((assignment) => {
      const assignmentId = assignment.id as string;
      const campaignId = assignment.campaign_id as string;
      const influencerId = assignment.influencer_id as string;
      const rowMilestones = milestonesByAssignment.get(assignmentId) ?? [];

      const totalPayout = payoutByCampaign.get(campaignId) ?? 0;
      const readyAmount = rowMilestones
        .filter((item) => item.status === "ready")
        .reduce((sum, item) => sum + (typeof item.amount === "number" ? item.amount : 0), 0);
      const paidAmount = rowMilestones
        .filter((item) => item.status === "paid")
        .reduce((sum, item) => sum + (typeof item.amount === "number" ? item.amount : 0), 0);

      const nextMilestone =
        rowMilestones.find((item) => item.status !== "paid") ??
        rowMilestones[rowMilestones.length - 1] ??
        null;

      const campaignTitle = (campaignMap.get(campaignId)?.title as string) ?? "Campaign";
      const influencerName = (influencerMap.get(influencerId)?.full_name as string) ?? "Influencer";

      return {
        assignmentId,
        campaignId,
        influencerId,
        campaignTitle,
        influencerName,
        totalPayout,
        readyAmount,
        paidAmount,
        nextMilestoneLabel: (nextMilestone?.label as string) ?? "-",
        nextMilestoneStatus: (nextMilestone?.status as string | null) ?? null,
        statuses: new Set(rowMilestones.map((item) => (item.status as string) ?? "pending")),
      };
    })
    .filter((row) => {
      if (statusFilter !== "all" && !row.statuses.has(statusFilter)) return false;
      if (campaignFilter && row.campaignId !== campaignFilter) return false;
      if (influencerFilter && row.influencerId !== influencerFilter) return false;
      if (query && !row.campaignTitle.toLowerCase().includes(query) && !row.influencerName.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });

  const csvParams = new URLSearchParams();
  if (statusFilter !== "all") csvParams.set("status", statusFilter);
  if (campaignFilter) csvParams.set("campaign", campaignFilter);
  if (influencerFilter) csvParams.set("influencer", influencerFilter);
  if (query) csvParams.set("q", query);

  const readyCount = rows.filter((row) => row.nextMilestoneStatus === "ready").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Payments</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Track milestone readiness and payout logs.</p>
        </div>
        <Link href={`/admin/payments/export${csvParams.toString() ? `?${csvParams.toString()}` : ""}`} className="inline-flex">
          <Button variant="secondary">Export CSV</Button>
        </Link>
      </div>

      <NextActionPanel
        items={readyCount > 0 ? [{ label: "Pay ready milestones", href: "/admin/payments?status=ready" }] : []}
      />

      <Card interactive={false}>
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="status" className="text-sm font-medium text-slate-800 dark:text-slate-200">Milestone status</label>
            <select id="status" name="status" defaultValue={statusFilter} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              <option value="all">All</option>
              <option value="ready">Ready to Pay</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div>
            <label htmlFor="campaign" className="text-sm font-medium text-slate-800 dark:text-slate-200">Campaign</label>
            <select id="campaign" name="campaign" defaultValue={campaignFilter} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              <option value="">All campaigns</option>
              {(campaigns ?? []).map((campaign) => (
                <option key={campaign.id as string} value={campaign.id as string}>{campaign.title as string}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="influencer" className="text-sm font-medium text-slate-800 dark:text-slate-200">Influencer</label>
            <select id="influencer" name="influencer" defaultValue={influencerFilter} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              <option value="">All influencers</option>
              {(influencers ?? []).map((influencer) => (
                <option key={influencer.id as string} value={influencer.id as string}>{influencer.full_name as string}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="q" className="text-sm font-medium text-slate-800 dark:text-slate-200">Search</label>
            <input id="q" name="q" defaultValue={query} placeholder="Influencer or campaign" className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
          </div>

          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit">Apply Filters</Button>
          </div>
        </form>
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          title="No payment rows match your filters"
          description="Try adjusting campaign, influencer, or status filters."
          ctaLabel="Reset filters"
          ctaHref="/admin/payments"
        />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {rows.map((row) => (
              <Card key={row.assignmentId} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{row.influencerName}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{row.campaignTitle}</p>
                  </div>
                  <PaymentStatusBadge status={row.nextMilestoneStatus} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <dt className="text-slate-500 dark:text-slate-400">Total payout</dt>
                  <dd className="text-slate-700 dark:text-slate-200">{toCurrency(row.totalPayout)}</dd>
                  <dt className="text-slate-500 dark:text-slate-400">Ready</dt>
                  <dd className="text-slate-700 dark:text-slate-200">{toCurrency(row.readyAmount)}</dd>
                  <dt className="text-slate-500 dark:text-slate-400">Paid</dt>
                  <dd className="text-slate-700 dark:text-slate-200">{toCurrency(row.paidAmount)}</dd>
                  <dt className="text-slate-500 dark:text-slate-400">Next milestone</dt>
                  <dd className="text-slate-700 dark:text-slate-200">{row.nextMilestoneLabel}</dd>
                </dl>
                <div className="mt-3">
                  <Link href={`/admin/payments/${row.assignmentId}`} className="inline-flex">
                    <Button size="sm" variant="secondary">View</Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>

          <Card className="hidden overflow-x-auto p-0 md:block" interactive={false}>
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Influencer</th>
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Total payout</th>
                  <th className="px-4 py-3">Ready amount</th>
                  <th className="px-4 py-3">Paid amount</th>
                  <th className="px-4 py-3">Next milestone</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.assignmentId} className="border-t border-slate-200 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/70">
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{row.influencerName}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{row.campaignTitle}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{toCurrency(row.totalPayout)}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{toCurrency(row.readyAmount)}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{toCurrency(row.paidAmount)}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      <div className="flex items-center gap-2"><span>{row.nextMilestoneLabel}</span><PaymentStatusBadge status={row.nextMilestoneStatus} /></div>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/payments/${row.assignmentId}`} className="inline-flex">
                        <Button size="sm" variant="secondary">View</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
