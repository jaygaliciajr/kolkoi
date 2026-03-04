"use client";

import Link from "next/link";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";

type CampaignProgress = {
  assignmentId: string;
  campaignTitle: string;
  endDate: string | null;
  deliverables: number;
  approvedDrafts: number;
  verifiedProofs: number;
};

type UpcomingDeliverable = {
  assignmentId: string;
  deliverableId: string;
  campaignTitle: string;
  platform: string;
  dueAt: string | null;
  proofStatus: string;
};

type ActivityEvent = {
  id: string;
  label: string;
  at: string;
  status: string;
};

type InfluencerDashboardViewProps = {
  invitesPending: number;
  draftsNeedAttention: number;
  proofsToSubmit: number;
  readyAmount: number;
  paidAmount: number;
  lastPaidDate: string | null;
  campaigns: CampaignProgress[];
  upcomingDeliverables: UpcomingDeliverable[];
  activityTimeline: ActivityEvent[];
};

function toCurrency(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const ratio = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="h-2 rounded-full bg-slate-200">
        <div className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${ratio}%` }} />
      </div>
      <p className="mt-1 text-xs text-slate-500">{ratio}% complete</p>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  format = "number",
  maximumFractionDigits = 0,
}: {
  label: string;
  value: number;
  hint?: string;
  format?: "number" | "currency" | "percent";
  maximumFractionDigits?: number;
}) {
  return (
    <Card className="p-5">
      <CardDescription>{label}</CardDescription>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        <AnimatedNumber
          value={value}
          format={format}
          maximumFractionDigits={maximumFractionDigits}
          className="tabular-nums"
        />
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </Card>
  );
}

export function InfluencerDashboardView({
  invitesPending,
  draftsNeedAttention,
  proofsToSubmit,
  readyAmount,
  paidAmount,
  lastPaidDate,
  campaigns,
  upcomingDeliverables,
  activityTimeline,
}: InfluencerDashboardViewProps) {
  const paymentPie = [
    { name: "Ready", value: readyAmount, color: "#0ea5e9" },
    { name: "Paid", value: paidAmount, color: "#10b981" },
  ];

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">My Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Track invites, submissions, proofs, and payouts in one place.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Invites Pending" value={invitesPending} />
        <KpiCard label="Drafts Need Attention" value={draftsNeedAttention} />
        <KpiCard label="Proofs To Submit" value={proofsToSubmit} />
        <KpiCard
          label="Payments Ready"
          value={readyAmount}
          format="currency"
          maximumFractionDigits={2}
          hint={`Last paid: ${lastPaidDate ? new Date(lastPaidDate).toLocaleDateString() : "-"}`}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>My Campaign Progress</CardTitle>
            <CardDescription>Progress by accepted campaign assignment.</CardDescription>
          </CardHeader>
          <CardContent>
            {campaigns.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No active campaigns yet. Check your inbox for invites.
              </p>
            ) : (
              campaigns.map((campaign) => {
                const done = campaign.verifiedProofs;
                const total = campaign.deliverables;
                return (
                  <Link
                    key={campaign.assignmentId}
                    href={`/influencer/campaigns/${campaign.assignmentId}`}
                    className="block rounded-xl border border-slate-200 bg-white/80 p-4 transition-all duration-200 hover:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:hover:bg-slate-900"
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{campaign.campaignTitle}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        End: {campaign.endDate ? new Date(campaign.endDate).toLocaleDateString() : "-"}
                      </p>
                    </div>
                    <ProgressBar value={done} max={total} />
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-300">
                      <span>Deliverables: {campaign.deliverables}</span>
                      <span>Approved drafts: {campaign.approvedDrafts}</span>
                      <span>Verified proofs: {campaign.verifiedProofs}</span>
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payments Overview</CardTitle>
            <CardDescription>Ready vs paid amounts.</CardDescription>
          </CardHeader>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={paymentPie} dataKey="value" nameKey="name" innerRadius={52} outerRadius={90}>
                  {paymentPie.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <CardContent>
            <p className="text-sm text-slate-600">Ready: PHP {toCurrency(readyAmount)}</p>
            <p className="text-sm text-slate-600">Paid: PHP {toCurrency(paidAmount)}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deliverables</CardTitle>
            <CardDescription>Timeline-style view of due tasks.</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingDeliverables.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No upcoming deliverables right now.</p>
            ) : (
              upcomingDeliverables.map((item) => (
                <Link
                  key={`${item.assignmentId}:${item.deliverableId}`}
                  href={`/influencer/proofs/submit?assignmentId=${item.assignmentId}&deliverableId=${item.deliverableId}`}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white/80 p-3 transition-all duration-200 hover:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:hover:bg-slate-900"
                >
                  <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-indigo-500" />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{item.campaignTitle}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.platform.replaceAll("_", " ")}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Due: {item.dueAt ? new Date(item.dueAt).toLocaleString() : "No due date"}
                    </p>
                  </div>
                  <StatusBadge status={item.proofStatus} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity Timeline</CardTitle>
            <CardDescription>Draft submitted to payout milestones.</CardDescription>
          </CardHeader>
          <CardContent>
            {activityTimeline.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No activity yet.</p>
            ) : (
              activityTimeline.map((event) => (
                <article
                  key={event.id}
                  className="rounded-xl border border-slate-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/80"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{event.label}</p>
                    <StatusBadge status={event.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{new Date(event.at).toLocaleString()}</p>
                </article>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      {(invitesPending > 0 || draftsNeedAttention > 0 || proofsToSubmit > 0) ? (
        <Card className="border-indigo-200 bg-indigo-50/70 dark:border-indigo-900 dark:bg-indigo-950/40">
          <CardHeader>
            <CardTitle>Next Action</CardTitle>
            <CardDescription>Recommended steps to keep campaigns moving.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {invitesPending > 0 ? (
              <Link
                href="/influencer/inbox"
                className="rounded-xl bg-white px-3 py-2 text-sm text-indigo-700 shadow-sm dark:bg-slate-900 dark:text-indigo-300"
              >
                Respond to invites
              </Link>
            ) : null}
            {draftsNeedAttention > 0 ? (
              <Link
                href="/influencer/submissions"
                className="rounded-xl bg-white px-3 py-2 text-sm text-indigo-700 shadow-sm dark:bg-slate-900 dark:text-indigo-300"
              >
                Revise drafts
              </Link>
            ) : null}
            {proofsToSubmit > 0 ? (
              <Link
                href="/influencer/proofs"
                className="rounded-xl bg-white px-3 py-2 text-sm text-indigo-700 shadow-sm dark:bg-slate-900 dark:text-indigo-300"
              >
                Submit proofs
              </Link>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
