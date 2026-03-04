"use client";

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

import { ChartCard } from "@/components/ui/ChartCard";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { NextActionPanel } from "@/components/ui/NextActionPanel";
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

function toCurrency(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

function MiniSparkline({ data }: { data: Array<{ value: number; key: string }> }) {
  return (
    <div className="h-10 w-28">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="value" stroke="#6366f1" fill="url(#spark)" strokeWidth={2} />
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
  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Command Center</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Real-time campaign, approval, proof, and payout operations.
        </p>
      </section>

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
          ...(kpis.pendingApprovals > 0 ? [{ label: `Review approvals (${kpis.pendingApprovals})`, href: "/admin/approvals" }] : []),
          ...(kpis.proofsPending > 0 ? [{ label: `Verify proofs (${kpis.proofsPending})`, href: "/admin/proofs" }] : []),
          ...(kpis.readyCount > 0 ? [{ label: `Pay milestones (${kpis.readyCount})`, href: "/admin/payments?status=ready" }] : []),
        ]}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Campaign Performance Overview" subtitle="Active vs completed campaigns over time.">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={campaignPerformance}>
                <defs>
                  <linearGradient id="activeFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area dataKey="active" stroke="#4f46e5" fill="url(#activeFill)" strokeWidth={2} />
                <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Draft Approval Funnel" subtitle="Submission health by current state.">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={draftFunnel}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {draftFunnel.map((row) => (
                    <Cell
                      key={row.status}
                      fill={
                        row.status === "approved"
                          ? "#10b981"
                          : row.status === "needs_revision"
                            ? "#f59e0b"
                            : "#3b82f6"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-1">
        <ChartCard title="Proof Verification Status" subtitle="Pending and quality compliance status.">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={proofStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="pending" stackId="proof" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                <Bar dataKey="needsUrl" stackId="proof" fill="#f59e0b" />
                <Bar dataKey="verified" stackId="proof" fill="#10b981" />
                <Bar dataKey="rejected" stackId="proof" fill="#f43f5e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <ChartCard title="Payment Overview" subtitle="Milestone readiness and paid trend.">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={paymentTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="ready" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                <Bar dataKey="paid" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Line type="monotone" dataKey="trend" stroke="#4f46e5" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Submission Mix" subtitle="Quick status spread of latest draft states.">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={draftFunnel} dataKey="count" nameKey="status" innerRadius={52} outerRadius={84} paddingAngle={3}>
                  {draftFunnel.map((row) => (
                    <Cell
                      key={row.status}
                      fill={
                        row.status === "approved"
                          ? "#10b981"
                          : row.status === "needs_revision"
                            ? "#f59e0b"
                            : "#3b82f6"
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
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
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
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
                    <td className="px-3 py-6 text-slate-500 dark:text-slate-400" colSpan={5}>
                      No influencer activity yet.
                    </td>
                  </tr>
                ) : (
                  influencerActivity.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-slate-100 transition-colors duration-200 hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-3 py-3 font-medium text-slate-900 dark:text-slate-100">{row.name}</td>
                      <td className="px-3 py-3 text-slate-700 dark:text-slate-300">{row.campaignsJoined}</td>
                      <td className="px-3 py-3 text-slate-700 dark:text-slate-300">{row.verifiedPosts}</td>
                      <td className="px-3 py-3 text-slate-700 dark:text-slate-300">PHP {toCurrency(row.payout)}</td>
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
              <p className="text-sm text-slate-500 dark:text-slate-400">No recent activity yet.</p>
            ) : (
              recentActivity.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/80"
                >
                  <div className="flex items-center justify-between gap-3">
                    <StatusBadge status={item.type.toLowerCase()} />
                    <time className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(item.at).toLocaleString()}
                    </time>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">{item.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.subtitle}</p>
                </article>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
