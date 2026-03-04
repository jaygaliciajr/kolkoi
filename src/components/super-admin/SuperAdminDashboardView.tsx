"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Card } from "@/components/ui/Card";
import { NextActionPanel } from "@/components/ui/NextActionPanel";

type DashboardViewProps = {
  totalOrganizations: number;
  activeCampaigns: number;
  totalInfluencers: number;
  totalAssignments: number;
  pendingApprovals: number;
  pendingProofs: number;
  paymentsReadyAmount: number;
  paymentsReadyCount: number;
  totalPaid30d: number;
  orgGrowthData: Array<{ week: string; count: number }>;
  campaignActivityData: Array<{ name: string; active: number; completed: number }>;
  paymentsTrendData: Array<{ week: string; amount: number }>;
};

function KpiCard({ title, value, format = "number", hint }: { title: string; value: number; format?: "number" | "currency"; hint?: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
        <AnimatedNumber value={value} format={format} maximumFractionDigits={2} className="tabular-nums" />
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </Card>
  );
}

export function SuperAdminDashboardView({
  totalOrganizations,
  activeCampaigns,
  totalInfluencers,
  totalAssignments,
  pendingApprovals,
  pendingProofs,
  paymentsReadyAmount,
  paymentsReadyCount,
  totalPaid30d,
  orgGrowthData,
  campaignActivityData,
  paymentsTrendData,
}: DashboardViewProps) {
  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Platform Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Read-only monitoring across all organizations.</p>
      </section>

      <NextActionPanel
        title="Monitoring Shortcuts"
        description="Review platform-wide queues and payment movement quickly."
        items={[
          { label: "View organizations", href: "/super-admin/organizations" },
          { label: "Open global activity", href: "/super-admin/activity" },
          { label: "Export reports", href: "/super-admin/reports" },
        ]}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Total Organizations" value={totalOrganizations} />
        <KpiCard title="Active Campaigns" value={activeCampaigns} />
        <KpiCard title="Total Influencers" value={totalInfluencers} />
        <KpiCard title="Assignments (Invited/Accepted)" value={totalAssignments} />
        <KpiCard title="Pending Approvals" value={pendingApprovals} />
        <KpiCard title="Pending Proofs" value={pendingProofs} />
        <KpiCard title="Payments Ready" value={paymentsReadyAmount} format="currency" hint={`${paymentsReadyCount} milestones`} />
        <KpiCard title="Total Paid (30d)" value={totalPaid30d} format="currency" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5" interactive={false}>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Organizations Growth</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">New organizations by week.</p>
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={orgGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5" interactive={false}>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Campaign Activity</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Active vs completed campaigns.</p>
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={campaignActivityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="active" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="completed" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <section>
        <Card className="p-5" interactive={false}>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Payments Trend</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Total paid per week.</p>
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={paymentsTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="amount" stroke="#0ea5e9" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>
    </div>
  );
}
