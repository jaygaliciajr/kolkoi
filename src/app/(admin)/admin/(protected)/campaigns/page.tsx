import Link from "next/link";
import { redirect } from "next/navigation";

import { StatusBadge } from "@/components/admin/StatusBadge";
import { getSelectedOrgId } from "@/lib/org/getSelectedOrgId";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ q?: string; status?: string }>;
export const revalidate = 30;

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

const FILTER_STATUSES = ["all", "draft", "active", "completed", "archived"] as const;
type FilterStatus = (typeof FILTER_STATUSES)[number];

export default async function CampaignsPage(props: { searchParams: SearchParams }) {
  const orgId = await getSelectedOrgId();
  if (!orgId) {
    redirect("/admin/select-org");
  }

  const searchParams = await props.searchParams;
  const q = (searchParams.q ?? "").trim();
  const requestedStatus = searchParams.status ?? "all";
  const status: FilterStatus = FILTER_STATUSES.includes(requestedStatus as FilterStatus)
    ? (requestedStatus as FilterStatus)
    : "all";

  const supabase = await createClient();
  let query = supabase
    .from("campaigns")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (q.length > 0) {
    query = query.ilike("title", `%${q}%`);
  }
  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data: campaigns } = await query;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Campaigns</h1>
          <p className="text-sm text-slate-600">Create and manage campaign lifecycles.</p>
        </div>
        <Link
          href="/admin/campaigns/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Create Campaign
        </Link>
      </div>

      <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by title"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring sm:col-span-2"
        />
        <div className="flex gap-2">
          <select
            name="status"
            defaultValue={status}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
          >
            {FILTER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Filter
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3">Title</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Start Date</th>
              <th className="px-3 py-3">End Date</th>
              <th className="px-3 py-3">Created At</th>
            </tr>
          </thead>
          <tbody>
            {(campaigns ?? []).length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-slate-500" colSpan={5}>
                  No campaigns found.
                </td>
              </tr>
            ) : (
              (campaigns ?? []).map((campaign) => (
                <tr key={campaign.id} className="border-t border-slate-100">
                  <td className="px-3 py-3 font-medium text-slate-900">
                    <Link href={`/admin/campaigns/${campaign.id}`} className="hover:underline">
                      {campaign.title}
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={campaign.status as string | null} />
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {formatDate(campaign.start_date as string | null)}
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {formatDate(campaign.end_date as string | null)}
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {formatDate(campaign.created_at as string | null)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
