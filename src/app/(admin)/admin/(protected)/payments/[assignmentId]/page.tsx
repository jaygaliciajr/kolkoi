import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { MarkMilestonePaidForm } from "@/components/admin/MarkMilestonePaidForm";
import { PaymentStatusBadge } from "@/components/payments/PaymentStatusBadge";
import { getSelectedOrgId } from "@/lib/org/getSelectedOrgId";
import { getMyRole } from "@/lib/rbac/getMyRole";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ assignmentId: string }>;

function toCurrency(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function AdminAssignmentPaymentsPage({ params }: { params: Params }) {
  const orgId = await getSelectedOrgId();
  if (!orgId) {
    redirect("/admin/select-org");
  }

  const { assignmentId } = await params;
  const supabase = await createClient();

  const { data: assignment } = await supabase
    .from("campaign_assignments")
    .select("*")
    .eq("id", assignmentId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!assignment) {
    notFound();
  }

  const [campaignRes, influencerRes, milestonesRes, transactionsRes, deliverablesRes] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, title")
      .eq("id", assignment.campaign_id)
      .eq("org_id", orgId)
      .maybeSingle(),
    supabase
      .from("influencers")
      .select("id, full_name, ig_handle")
      .eq("id", assignment.influencer_id)
      .maybeSingle(),
    supabase
      .from("payment_milestones")
      .select("*")
      .eq("assignment_id", assignmentId)
      .order("created_at", { ascending: true }),
    supabase
      .from("payment_transactions")
      .select("*")
      .eq("assignment_id", assignmentId)
      .order("created_at", { ascending: false }),
    supabase
      .from("campaign_deliverables")
      .select("id, payout_amount")
      .eq("campaign_id", assignment.campaign_id),
  ]);

  const campaign = campaignRes.data;
  const influencer = influencerRes.data;
  const milestones = milestonesRes.data ?? [];
  const transactions = transactionsRes.data ?? [];
  const deliverables = deliverablesRes.data ?? [];

  const totalPayout = deliverables.reduce((sum, item) => {
    const amount = typeof item.payout_amount === "number" ? item.payout_amount : 0;
    return sum + amount;
  }, 0);

  const role = await getMyRole();
  const canMarkPaid = role === "finance" || role === "org_admin";

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Assignment Payments</h1>
        <div className="mt-2 grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
          <p>Influencer: {(influencer?.full_name as string) ?? "Influencer"}</p>
          <p>Campaign: {(campaign?.title as string) ?? "Campaign"}</p>
          <p>IG: {(influencer?.ig_handle as string | null) ?? "-"}</p>
          <p>Total payout: {toCurrency(totalPayout)}</p>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Milestones</h2>

        {(milestones ?? []).length === 0 ? (
          <p className="text-sm text-slate-500">No milestones found.</p>
        ) : (
          <div className="space-y-3">
            {milestones.map((milestone) => (
              <article
                key={milestone.id as string}
                className="space-y-2 rounded-lg border border-slate-200 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{(milestone.label as string) ?? "Milestone"}</p>
                  <PaymentStatusBadge status={(milestone.status as string | null) ?? "pending"} />
                </div>

                <div className="grid gap-1 text-sm text-slate-700 sm:grid-cols-3">
                  <p>Percent: {typeof milestone.percent === "number" ? `${milestone.percent}%` : "-"}</p>
                  <p>Amount: {toCurrency(typeof milestone.amount === "number" ? milestone.amount : 0)}</p>
                  <p>
                    Ready at:{" "}
                    {milestone.ready_at ? new Date(milestone.ready_at as string).toLocaleString() : "-"}
                  </p>
                  <p>
                    Paid at: {milestone.paid_at ? new Date(milestone.paid_at as string).toLocaleString() : "-"}
                  </p>
                </div>

                {canMarkPaid && milestone.status === "ready" ? (
                  <MarkMilestonePaidForm
                    assignmentId={assignmentId}
                    milestone={{
                      id: milestone.id as string,
                      label: (milestone.label as string) ?? "Milestone",
                      amount: typeof milestone.amount === "number" ? milestone.amount : 0,
                    }}
                  />
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Transactions</h2>

        {transactions.length === 0 ? (
          <p className="text-sm text-slate-500">No transactions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Method</th>
                  <th className="px-3 py-2">Reference</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {transactions.map((txn) => (
                  <tr key={txn.id as string}>
                    <td className="px-3 py-2 text-slate-700">
                      {txn.created_at ? new Date(txn.created_at as string).toLocaleString() : "-"}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{(txn.method as string) ?? "-"}</td>
                    <td className="px-3 py-2 text-slate-700">{(txn.reference_no as string | null) ?? "-"}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {toCurrency(typeof txn.amount === "number" ? txn.amount : 0)}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{(txn.notes as string | null) ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Link
        href="/admin/payments"
        className="inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
      >
        Back to Payments
      </Link>
    </div>
  );
}
