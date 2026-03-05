"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { ChartCard } from "@/components/ui/ChartCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { NextActionPanel } from "@/components/ui/NextActionPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";

type DashboardKpis = {
  activeCampaigns: number;
  pendingApprovals: number;
  proofsPending: number;
  readyAmount: number;
  readyCount: number;
  paid30d: number;
};

type ActivityItem = {
  id: string;
  type: "Submission" | "Proof" | "Payment";
  title: string;
  subtitle: string;
  at: string;
};

type InfluencerActivity = {
  id: string;
  name: string;
  campaignsJoined: number;
  verifiedPosts: number;
  payout: number;
  trend: Array<{ value: number; key: string }>;
};

type AdminDashboardViewProps = {
  kpis: DashboardKpis;
  campaignPerformance: Array<{ label: string; active: number; completed: number }>;
  draftFunnel: Array<{ status: string; count: number }>;
  proofStatus: Array<{ status: string; pending: number; needsUrl: number; verified: number; rejected: number }>;
  paymentTrend: Array<{ label: string; ready: number; paid: number; trend: number }>;
  influencerActivity: InfluencerActivity[];
  recentActivity: ActivityItem[];
};

const chartGrid = "rgb(var(--chart-grid))";
const chartAxis = "rgb(var(--chart-axis))";
const tooltipStyle = {
  backgroundColor: "rgb(var(--chart-tooltip-bg))",
  border: "1px solid rgb(var(--chart-tooltip-border))",
  borderRadius: "12px",
  color: "rgb(var(--text))",
};

function toCurrency(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function hasAnyValue(values: number[]) {
  return values.some((value) => value > 0);
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
      <p className="mt-2 text-3xl font-semibold tracking-tight text-text">
        <AnimatedNumber
          value={value}
          format={format}
          maximumFractionDigits={maximumFractionDigits}
          className="tabular-nums"
        />
      </p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </Card>
  );
}

function MiniSparkline({ data }: { data: Array<{ value: number; key: string }> }) {
  return (
    <div className="h-10 w-28">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--primary))" stopOpacity={0.35} />
              <stop offset="100%" stopColor="rgb(var(--primary))" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="value" stroke="rgb(var(--primary))" fill="url(#spark)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AdminDashboardView({
  kpis,
  campaignPerformance,
  draftFunnel,
  proofStatus,
  paymentTrend,
  influencerActivity,
  recentActivity,
}: AdminDashboardViewProps) {
  const hasCampaignPerformance = hasAnyValue(
    campaignPerformance.flatMap((item) => [item.active, item.completed]),
  );
  const hasDraftFunnel = hasAnyValue(draftFunnel.map((item) => item.count));
  const hasProofStatus = hasAnyValue(
    proofStatus.flatMap((item) => [item.pending, item.needsUrl, item.verified, item.rejected]),
  );
  const hasPaymentTrend = hasAnyValue(paymentTrend.flatMap((item) => [item.ready, item.paid, item.trend]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operations Dashboard"
        subtitle="A unified view of campaign health, review queues, proof verification, and payout readiness."
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Dashboard" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/campaigns/new"
              className="rounded-[var(--radius-lg)] bg-primary px-3 py-2 text-sm font-medium text-white transition-[opacity] duration-[var(--motion-fast)] hover:opacity-95"
            >
              Create Campaign
            </Link>
            <Link
              href="/admin/reports"
              className="rounded-[var(--radius-lg)] border border-border bg-surface px-3 py-2 text-sm font-medium text-text transition-[background-color] duration-[var(--motion-fast)] hover:bg-surface-2"
            >
              Open Reports
            </Link>
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Active Campaigns" value={kpis.activeCampaigns} />
        <KpiCard label="Pending Approvals" value={kpis.pendingApprovals} />
        <KpiCard label="Proofs Pending" value={kpis.proofsPending} />
        <KpiCard
          label="Payments Ready"
          value={kpis.readyAmount}
          format="currency"
          maximumFractionDigits={2}
          hint={`${kpis.readyCount} milestones`}
        />
        <KpiCard label="Total Paid (30d)" value={kpis.paid30d} format="currency" maximumFractionDigits={2} />
      </section>

      <NextActionPanel
        items={[
          ...(kpis.pendingApprovals > 0
            ? [{ label: `Review approvals (${kpis.pendingApprovals})`, href: "/admin/approvals" }]
            : []),
          ...(kpis.proofsPending > 0
            ? [{ label: `Verify proofs (${kpis.proofsPending})`, href: "/admin/proofs" }]
            : []),
          ...(kpis.readyCount > 0
            ? [{ label: `Pay milestones (${kpis.readyCount})`, href: "/admin/payments?status=ready" }]
            : []),
        ]}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Campaign Performance Overview" subtitle="Active vs completed campaigns over time.">
          {hasCampaignPerformance ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={campaignPerformance}>
                  <defs>
                    <linearGradient id="activeFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(var(--primary))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="rgb(var(--primary))" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: chartAxis }} axisLine={{ stroke: chartGrid }} />
                  <YAxis tick={{ fontSize: 12, fill: chartAxis }} axisLine={{ stroke: chartGrid }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area dataKey="active" stroke="rgb(var(--primary))" fill="url(#activeFill)" strokeWidth={2} />
                  <Line type="monotone" dataKey="completed" stroke="rgb(var(--success))" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              title="No campaign trends yet"
              description="Once campaigns start moving, this overview will display momentum across active and completed work."
              ctaLabel="Create Campaign"
              ctaHref="/admin/campaigns/new"
            />
          )}
        </ChartCard>

        <ChartCard title="Draft Approval Funnel" subtitle="Submission health by current state.">
          {hasDraftFunnel ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={draftFunnel}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                  <XAxis dataKey="status" tick={{ fontSize: 12, fill: chartAxis }} axisLine={{ stroke: chartGrid }} />
                  <YAxis tick={{ fontSize: 12, fill: chartAxis }} axisLine={{ stroke: chartGrid }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {draftFunnel.map((row) => (
                      <Cell
                        key={row.status}
                        fill={
                          row.status === "approved"
                            ? "rgb(var(--success))"
                            : row.status === "needs_revision"
                              ? "rgb(var(--warning))"
                              : "rgb(var(--info))"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              title="No draft submissions yet"
              description="The funnel will populate when influencers submit content for approval."
            />
          )}
        </ChartCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-1">
        <ChartCard title="Proof Verification Status" subtitle="Pending and quality compliance status.">
          {hasProofStatus ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={proofStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                  <XAxis dataKey="status" tick={{ fontSize: 12, fill: chartAxis }} axisLine={{ stroke: chartGrid }} />
                  <YAxis tick={{ fontSize: 12, fill: chartAxis }} axisLine={{ stroke: chartGrid }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="pending" stackId="proof" fill="rgb(var(--info))" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="needsUrl" stackId="proof" fill="rgb(var(--warning))" />
                  <Bar dataKey="verified" stackId="proof" fill="rgb(var(--success))" />
                  <Bar dataKey="rejected" stackId="proof" fill="rgb(var(--danger))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              title="No proofs in queue"
              description="Verified and pending proof statuses will appear as soon as proof submissions are posted."
            />
          )}
        </ChartCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <ChartCard title="Payment Overview" subtitle="Milestone readiness and payout trend.">
          {hasPaymentTrend ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={paymentTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: chartAxis }} axisLine={{ stroke: chartGrid }} />
                  <YAxis tick={{ fontSize: 12, fill: chartAxis }} axisLine={{ stroke: chartGrid }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="ready" fill="rgb(var(--info))" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="paid" fill="rgb(var(--success))" radius={[6, 6, 0, 0]} />
                  <Line type="monotone" dataKey="trend" stroke="rgb(var(--primary))" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              title="No payment movement yet"
              description="Ready and paid milestones will trend here once approvals and verifications complete."
            />
          )}
        </ChartCard>

        <ChartCard title="Submission Mix" subtitle="Distribution of latest draft states.">
          {hasDraftFunnel ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={draftFunnel} dataKey="count" nameKey="status" innerRadius={52} outerRadius={84} paddingAngle={3}>
                    {draftFunnel.map((row) => (
                      <Cell
                        key={row.status}
                        fill={
                          row.status === "approved"
                            ? "rgb(var(--success))"
                            : row.status === "needs_revision"
                              ? "rgb(var(--warning))"
                              : "rgb(var(--info))"
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              title="No mix to display"
              description="This chart appears after the first submission batch enters your queue."
            />
          )}
        </ChartCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Influencer Activity</CardTitle>
            <CardDescription>Participation and output trend snapshots.</CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-2">Influencer</th>
                  <th className="px-3 py-2">Campaigns</th>
                  <th className="px-3 py-2">Verified</th>
                  <th className="px-3 py-2">Payout</th>
                  <th className="px-3 py-2">Trend</th>
                </tr>
              </thead>
              <tbody>
                {influencerActivity.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6" colSpan={5}>
                      <EmptyState
                        title="No influencer activity yet"
                        description="Invite influencers to campaigns to begin tracking participation performance."
                        ctaLabel="Open Influencers"
                        ctaHref="/admin/influencers"
                      />
                    </td>
                  </tr>
                ) : (
                  influencerActivity.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border/60 transition-colors duration-[var(--motion-fast)] hover:bg-surface-2/60"
                    >
                      <td className="px-3 py-3 font-medium text-text">{row.name}</td>
                      <td className="px-3 py-3 text-text/90">{row.campaignsJoined}</td>
                      <td className="px-3 py-3 text-text/90">{row.verifiedPosts}</td>
                      <td className="px-3 py-3 text-text/90">PHP {toCurrency(row.payout)}</td>
                      <td className="px-3 py-3">
                        <MiniSparkline data={row.trend} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Last 10 queue-impacting events.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentActivity.length === 0 ? (
              <EmptyState title="No recent activity" description="New submissions, proofs, and payments will appear here." />
            ) : (
              recentActivity.map((item) => (
                <article key={item.id} className="rounded-[var(--radius-xl)] border border-border bg-surface p-3">
                  <div className="flex items-center justify-between gap-3">
                    <StatusBadge status={item.type.toLowerCase()} />
                    <time className="text-xs text-muted">{new Date(item.at).toLocaleString()}</time>
                  </div>
                  <p className="mt-2 text-sm font-medium text-text">{item.title}</p>
                  <p className="text-xs text-muted">{item.subtitle}</p>
                </article>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
