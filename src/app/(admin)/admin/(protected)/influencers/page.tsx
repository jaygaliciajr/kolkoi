import Link from "next/link";
import { redirect } from "next/navigation";

import { getSelectedOrgId } from "@/lib/org/getSelectedOrgId";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{
  q?: string;
  tag?: string;
}>;

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function tagsToList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export default async function InfluencersPage(props: { searchParams: SearchParams }) {
  const orgId = await getSelectedOrgId();
  if (!orgId) {
    redirect("/admin/select-org");
  }

  const searchParams = await props.searchParams;
  const q = (searchParams.q ?? "").trim();
  const tag = (searchParams.tag ?? "").trim();

  const supabase = await createClient();
  let query = supabase
    .from("influencers")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (q.length > 0) {
    query = query.ilike("full_name", `%${q}%`);
  }
  if (tag.length > 0) {
    query = query.contains("tags", [tag]);
  }

  const { data: influencers } = await query;
  const { data: tagRows } = await supabase
    .from("influencers")
    .select("tags")
    .eq("org_id", orgId)
    .limit(500);

  const allTags = Array.from(
    new Set((tagRows ?? []).flatMap((row) => tagsToList(row.tags))),
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Influencer Database</h1>
          <p className="text-sm text-slate-600">Manage influencers in your selected org.</p>
        </div>
        <Link
          href="/admin/influencers/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Add Influencer
        </Link>
      </div>

      <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by full name"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring sm:col-span-2"
        />
        <div className="flex gap-2">
          <select
            name="tag"
            defaultValue={tag}
            className="ui-select"
          >
            <option value="">All tags</option>
            {allTags.map((item) => (
              <option key={item} value={item}>
                {item}
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
              <th className="px-3 py-3">Full Name</th>
              <th className="px-3 py-3">FB Page URL</th>
              <th className="px-3 py-3">IG Handle</th>
              <th className="px-3 py-3">Follower Count</th>
              <th className="px-3 py-3">Engagement Rate</th>
              <th className="px-3 py-3">Tags</th>
              <th className="px-3 py-3">Linked User?</th>
              <th className="px-3 py-3">Created At</th>
            </tr>
          </thead>
          <tbody>
            {(influencers ?? []).length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-slate-500" colSpan={8}>
                  No influencers found.
                </td>
              </tr>
            ) : (
              (influencers ?? []).map((influencer) => (
                <tr key={influencer.id} className="border-t border-slate-100">
                  <td className="px-3 py-3 font-medium text-slate-900">
                    <Link href={`/admin/influencers/${influencer.id}`} className="hover:underline">
                      {influencer.full_name}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {influencer.fb_page_url ? (
                      <a
                        href={influencer.fb_page_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-900 underline"
                      >
                        Open
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {influencer.ig_handle ? `@${influencer.ig_handle}` : "-"}
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {typeof influencer.follower_count === "number"
                      ? influencer.follower_count.toLocaleString()
                      : "-"}
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {typeof influencer.engagement_rate === "number"
                      ? `${influencer.engagement_rate}%`
                      : "-"}
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {tagsToList(influencer.tags).length > 0
                      ? tagsToList(influencer.tags).join(", ")
                      : "-"}
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {influencer.user_id ? "Yes" : "No"}
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {formatDate(influencer.created_at as string | null)}
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
