import Link from "next/link";
import { redirect } from "next/navigation";

import { SubmissionStatusBadge } from "@/components/submissions/SubmissionStatusBadge";
import { getCurrentInfluencer } from "@/lib/influencers/getCurrentInfluencer";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ q?: string }>;

export default async function InfluencerSubmissionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const influencer = await getCurrentInfluencer();
  if (!influencer) {
    redirect("/influencer/profile");
  }

  const { q } = await searchParams;
  const query = (q ?? "").trim().toLowerCase();

  const supabase = await createClient();
  const { data: assignments } = await supabase
    .from("campaign_assignments")
    .select("id, campaign_id, influencer_id")
    .eq("influencer_id", influencer.id);

  const assignmentIds = (assignments ?? []).map((item) => item.id as string);
  const { data: submissions } = assignmentIds.length
    ? await supabase
        .from("content_submissions")
        .select("*")
        .in("assignment_id", assignmentIds)
        .order("updated_at", { ascending: false })
    : { data: [] as Record<string, unknown>[] };

  const campaignIds = Array.from(
    new Set((assignments ?? []).map((item) => item.campaign_id as string)),
  );
  const { data: campaigns } = campaignIds.length
    ? await supabase.from("campaigns").select("id, title").in("id", campaignIds)
    : { data: [] as Record<string, unknown>[] };
  const campaignTitleById = new Map(
    (campaigns ?? []).map((item) => [item.id as string, (item.title as string) ?? "Campaign"]),
  );

  const deliverableIds = Array.from(
    new Set((submissions ?? []).map((item) => item.deliverable_id as string)),
  );
  const { data: deliverables } = deliverableIds.length
    ? await supabase
        .from("campaign_deliverables")
        .select("id, platform")
        .in("id", deliverableIds)
    : { data: [] as Record<string, unknown>[] };
  const platformByDeliverableId = new Map(
    (deliverables ?? []).map((item) => [item.id as string, (item.platform as string) ?? "-"]),
  );

  const campaignByAssignmentId = new Map(
    (assignments ?? []).map((item) => [item.id as string, item.campaign_id as string]),
  );

  const rows = (submissions ?? [])
    .map((submission) => {
      const assignmentId = submission.assignment_id as string;
      const campaignId = campaignByAssignmentId.get(assignmentId) ?? "";
      const campaignTitle = campaignTitleById.get(campaignId) ?? "Campaign";

      return {
        id: submission.id as string,
        campaignTitle,
        platform: platformByDeliverableId.get(submission.deliverable_id as string) ?? "-",
        version: typeof submission.version === "number" ? submission.version : 1,
        status: (submission.status as string | null) ?? "draft",
        updatedAt: (submission.updated_at as string | null) ?? null,
      };
    })
    .filter((row) => query.length === 0 || row.campaignTitle.toLowerCase().includes(query));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Submissions</h1>
      </div>

      <form className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label htmlFor="q" className="text-sm font-medium text-slate-800">
          Search by campaign title
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="q"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Campaign name"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
          />
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Search
          </button>
        </div>
      </form>

      {rows.length === 0 ? (
        <section className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
          No submissions found.
        </section>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <Link
              key={row.id}
              href={`/influencer/submissions/${row.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">{row.campaignTitle}</p>
                <SubmissionStatusBadge status={row.status} />
              </div>
              <div className="mt-2 grid gap-1 text-sm text-slate-700 sm:grid-cols-3">
                <p>Platform: {row.platform}</p>
                <p>Version: v{row.version}</p>
                <p>Last updated: {row.updatedAt ? new Date(row.updatedAt).toLocaleString() : "-"}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
