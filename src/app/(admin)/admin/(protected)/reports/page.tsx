import Link from "next/link";
import { redirect } from "next/navigation";

import { getSelectedOrgId } from "@/lib/org/getSelectedOrgId";
import { createClient } from "@/lib/supabase/server";

export default async function AdminReportsPage() {
  const orgId = await getSelectedOrgId();
  if (!orgId) {
    redirect("/admin/select-org");
  }

  const supabase = await createClient();
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, title")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Campaign Performance Export</h2>
        <p className="mt-1 text-sm text-slate-600">
          Export campaign-level influencer delivery and payout status.
        </p>

        <form action="/api/reports/campaign.csv" method="GET" className="mt-3 flex flex-wrap gap-2">
          <select
            name="campaignId"
            required
            className="min-w-64 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            defaultValue=""
          >
            <option value="" disabled>
              Select campaign
            </option>
            {(campaigns ?? []).map((campaign) => (
              <option key={campaign.id as string} value={campaign.id as string}>
                {campaign.title as string}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Download Campaign CSV
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Influencer Summary Export</h2>
        <p className="mt-1 text-sm text-slate-600">
          Export organization-wide influencer activity, proof, and payout summary.
        </p>

        <Link
          href="/api/reports/influencers.csv"
          className="mt-3 inline-flex rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Download Influencer CSV
        </Link>
      </section>
    </div>
  );
}
