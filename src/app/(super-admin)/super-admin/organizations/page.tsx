import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/super-admin/auth";

type SearchParams = Promise<{ q?: string }>;

export const revalidate = 60;

function toCurrency(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function SuperAdminOrganizationsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireSuperAdmin();

  const params = await searchParams;
  const q = (params.q ?? "").trim();

  const supabase = await createClient();
  let orgsQuery = supabase
    .from("organizations")
    .select("id, name, tier, created_at")
    .order("created_at", { ascending: false });

  if (q.length > 0) {
    orgsQuery = orgsQuery.ilike("name", `%${q}%`);
  }

  const { data: orgs } = await orgsQuery;
  const orgIds = (orgs ?? []).map((org) => org.id as string);

  const [campaignsRes, influencersRes, submissionsRes, proofsRes, milestonesRes] = await Promise.all([
    orgIds.length
      ? supabase.from("campaigns").select("id, org_id, status").in("org_id", orgIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    orgIds.length
      ? supabase.from("influencers").select("id, org_id").in("org_id", orgIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    orgIds.length
      ? supabase
          .from("content_submissions")
          .select("id, org_id")
          .in("org_id", orgIds)
          .eq("status", "submitted")
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    orgIds.length
      ? supabase
          .from("post_proofs")
          .select("id, org_id")
          .in("org_id", orgIds)
          .in("status", ["posted_pending", "needs_url"])
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    orgIds.length
      ? supabase
          .from("payment_milestones")
          .select("id, org_id, amount")
          .in("org_id", orgIds)
          .eq("status", "ready")
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ]);

  const campaignByOrg = new Map<string, { active: number }>();
  for (const row of campaignsRes.data ?? []) {
    const orgId = row.org_id as string;
    const current = campaignByOrg.get(orgId) ?? { active: 0 };
    if (row.status === "active") {
      current.active += 1;
    }
    campaignByOrg.set(orgId, current);
  }

  const influencerCountByOrg = new Map<string, number>();
  for (const row of influencersRes.data ?? []) {
    const orgId = row.org_id as string;
    influencerCountByOrg.set(orgId, (influencerCountByOrg.get(orgId) ?? 0) + 1);
  }

  const pendingApprovalsByOrg = new Map<string, number>();
  for (const row of submissionsRes.data ?? []) {
    const orgId = row.org_id as string;
    pendingApprovalsByOrg.set(orgId, (pendingApprovalsByOrg.get(orgId) ?? 0) + 1);
  }

  const pendingProofsByOrg = new Map<string, number>();
  for (const row of proofsRes.data ?? []) {
    const orgId = row.org_id as string;
    pendingProofsByOrg.set(orgId, (pendingProofsByOrg.get(orgId) ?? 0) + 1);
  }

  const paymentsReadyByOrg = new Map<string, number>();
  for (const row of milestonesRes.data ?? []) {
    const orgId = row.org_id as string;
    const amount = typeof row.amount === "number" ? row.amount : 0;
    paymentsReadyByOrg.set(orgId, (paymentsReadyByOrg.get(orgId) ?? 0) + amount);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Organizations</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Platform-wide organization monitoring. Read-only.</p>
      </div>

      <Card interactive={false} className="p-4">
        <form className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Input
            id="q"
            name="q"
            label="Search by organization"
            placeholder="Type org name"
            defaultValue={q}
            helperText="Filter organizations by name"
          />
          <div className="self-end">
            <Button type="submit">Apply</Button>
          </div>
        </form>
      </Card>

      {(orgs ?? []).length === 0 ? (
        <EmptyState title="No organizations found" description="Try a different search term." />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {(orgs ?? []).map((org) => {
              const orgId = org.id as string;
              return (
                <Link key={orgId} href={`/super-admin/organizations/${orgId}`}>
                  <Card className="p-4">
                    <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{(org.name as string) ?? "Organization"}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Tier: {(org.tier as string) ?? "starter"}</p>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <dt className="text-slate-500 dark:text-slate-400">Influencers</dt>
                      <dd className="text-slate-700 dark:text-slate-200">{influencerCountByOrg.get(orgId) ?? 0}</dd>
                      <dt className="text-slate-500 dark:text-slate-400">Active campaigns</dt>
                      <dd className="text-slate-700 dark:text-slate-200">{campaignByOrg.get(orgId)?.active ?? 0}</dd>
                      <dt className="text-slate-500 dark:text-slate-400">Pending approvals</dt>
                      <dd className="text-slate-700 dark:text-slate-200">{pendingApprovalsByOrg.get(orgId) ?? 0}</dd>
                      <dt className="text-slate-500 dark:text-slate-400">Pending proofs</dt>
                      <dd className="text-slate-700 dark:text-slate-200">{pendingProofsByOrg.get(orgId) ?? 0}</dd>
                      <dt className="text-slate-500 dark:text-slate-400">Payments ready</dt>
                      <dd className="text-slate-700 dark:text-slate-200">{toCurrency(paymentsReadyByOrg.get(orgId) ?? 0)}</dd>
                    </dl>
                  </Card>
                </Link>
              );
            })}
          </div>

          <Card interactive={false} className="hidden overflow-x-auto p-0 md:block">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Organization</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Created At</th>
                  <th className="px-4 py-3">Influencers</th>
                  <th className="px-4 py-3">Active Campaigns</th>
                  <th className="px-4 py-3">Pending Approvals</th>
                  <th className="px-4 py-3">Pending Proofs</th>
                  <th className="px-4 py-3">Payments Ready</th>
                </tr>
              </thead>
              <tbody>
                {(orgs ?? []).map((org) => {
                  const orgId = org.id as string;
                  return (
                    <tr
                      key={orgId}
                      className="cursor-pointer border-t border-slate-200 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/70"
                    >
                      <td className="px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300">
                        <Link href={`/super-admin/organizations/${orgId}`}>{(org.name as string) ?? "Organization"}</Link>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{(org.tier as string) ?? "starter"}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                        {org.created_at ? new Date(org.created_at as string).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{influencerCountByOrg.get(orgId) ?? 0}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{campaignByOrg.get(orgId)?.active ?? 0}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{pendingApprovalsByOrg.get(orgId) ?? 0}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{pendingProofsByOrg.get(orgId) ?? 0}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{toCurrency(paymentsReadyByOrg.get(orgId) ?? 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
