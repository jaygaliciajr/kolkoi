import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentInfluencer } from "@/lib/influencers/getCurrentInfluencer";
import { createClient } from "@/lib/supabase/server";

function toCurrency(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const revalidate = 30;

export default async function InfluencerPaymentsPage() {
  const influencer = await getCurrentInfluencer();
  if (!influencer) {
    redirect("/influencer/profile");
  }

  const supabase = await createClient();
  const { data: assignments } = await supabase
    .from("campaign_assignments")
    .select("id, campaign_id, influencer_id")
    .eq("influencer_id", influencer.id)
    .order("created_at", { ascending: false });

  const assignmentIds = (assignments ?? []).map((item) => item.id as string);
  const campaignIds = Array.from(
    new Set((assignments ?? []).map((item) => item.campaign_id as string)),
  );

  const [campaignsRes, milestonesRes, transactionsRes, deliverablesRes] = await Promise.all([
    campaignIds.length
      ? supabase.from("campaigns").select("id, title").in("id", campaignIds)
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
    campaignIds.length
      ? supabase
          .from("campaign_deliverables")
          .select("id, campaign_id, payout_amount")
          .in("campaign_id", campaignIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ]);

  const campaigns = campaignsRes.data ?? [];
  const milestones = milestonesRes.data ?? [];
  const transactions = transactionsRes.data ?? [];
  const deliverables = deliverablesRes.data ?? [];

  const campaignMap = new Map((campaigns ?? []).map((item) => [item.id as string, item]));

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

  const transactionsByAssignment = new Map<string, Record<string, unknown>[]>();
  for (const txn of transactions) {
    const assignmentId = txn.assignment_id as string;
    const list = transactionsByAssignment.get(assignmentId) ?? [];
    list.push(txn);
    transactionsByAssignment.set(assignmentId, list);
  }

  const rows = (assignments ?? []).map((assignment) => {
    const assignmentId = assignment.id as string;
    const campaignId = assignment.campaign_id as string;
    const rowMilestones = milestonesByAssignment.get(assignmentId) ?? [];

    const readyAmount = rowMilestones
      .filter((item) => item.status === "ready")
      .reduce((sum, item) => sum + (typeof item.amount === "number" ? item.amount : 0), 0);
    const paidAmount = rowMilestones
      .filter((item) => item.status === "paid")
      .reduce((sum, item) => sum + (typeof item.amount === "number" ? item.amount : 0), 0);

    const txns = transactionsByAssignment.get(assignmentId) ?? [];
    const lastPaymentDate = txns.find((item) => Boolean(item.created_at))?.created_at as
      | string
      | null
      | undefined;

    return {
      assignmentId,
      campaignTitle: (campaignMap.get(campaignId)?.title as string) ?? "Campaign",
      totalPayout: payoutByCampaign.get(campaignId) ?? 0,
      readyAmount,
      paidAmount,
      lastPaymentDate: lastPaymentDate ?? null,
    };
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Payments</h1>

      {rows.length === 0 ? (
        <section className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
          No payment records yet.
        </section>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <article key={row.assignmentId} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-lg font-semibold text-slate-900">{row.campaignTitle}</p>
              <div className="mt-2 grid gap-1 text-sm text-slate-700">
                <p>Total payout: {toCurrency(row.totalPayout)}</p>
                <p>Ready amount: {toCurrency(row.readyAmount)}</p>
                <p>Paid amount: {toCurrency(row.paidAmount)}</p>
                <p>
                  Last payment date:{" "}
                  {row.lastPaymentDate ? new Date(row.lastPaymentDate).toLocaleString() : "-"}
                </p>
              </div>

              <Link
                href={`/influencer/payments/${row.assignmentId}`}
                className="mt-3 inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                View
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
