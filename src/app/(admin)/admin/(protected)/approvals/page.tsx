import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { NextActionPanel } from "@/components/ui/NextActionPanel";
import { SubmissionStatusBadge } from "@/components/submissions/SubmissionStatusBadge";
import { getSelectedOrgId } from "@/lib/org/getSelectedOrgId";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ status?: string }>;
export const revalidate = 10;

export default async function AdminApprovalsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const orgId = await getSelectedOrgId();
  if (!orgId) {
    redirect("/admin/select-org");
  }

  const { status } = await searchParams;
  const selectedStatus = status === "needs_revision" ? "needs_revision" : "submitted";

  const supabase = await createClient();
  const { data: submissions } = await supabase
    .from("content_submissions")
    .select("id, assignment_id, deliverable_id, status, version, submitted_at")
    .eq("org_id", orgId)
    .eq("status", selectedStatus)
    .order("submitted_at", { ascending: false })
    .order("updated_at", { ascending: false });

  const assignmentIds = Array.from(new Set((submissions ?? []).map((item) => item.assignment_id as string)));
  const { data: assignments } = assignmentIds.length
    ? await supabase
        .from("campaign_assignments")
        .select("id, campaign_id, influencer_id")
        .in("id", assignmentIds)
    : { data: [] as Record<string, unknown>[] };

  const campaignIds = Array.from(new Set((assignments ?? []).map((item) => item.campaign_id as string)));
  const influencerIds = Array.from(new Set((assignments ?? []).map((item) => item.influencer_id as string)));
  const deliverableIds = Array.from(new Set((submissions ?? []).map((item) => item.deliverable_id as string)));

  const [campaignsRes, influencersRes, deliverablesRes] = await Promise.all([
    campaignIds.length
      ? supabase.from("campaigns").select("id, title").in("id", campaignIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    influencerIds.length
      ? supabase.from("influencers").select("id, full_name").in("id", influencerIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    deliverableIds.length
      ? supabase
          .from("campaign_deliverables")
          .select("id, platform")
          .in("id", deliverableIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ]);

  const campaigns = campaignsRes.data ?? [];
  const influencers = influencersRes.data ?? [];
  const deliverables = deliverablesRes.data ?? [];

  const assignmentById = new Map((assignments ?? []).map((item) => [item.id as string, item]));
  const campaignById = new Map((campaigns ?? []).map((item) => [item.id as string, item]));
  const influencerById = new Map((influencers ?? []).map((item) => [item.id as string, item]));
  const deliverableById = new Map((deliverables ?? []).map((item) => [item.id as string, item]));

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Approvals Queue</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Review drafts that are waiting for campaign manager action.</p>
      </div>

      <NextActionPanel
        items={(submissions?.length ?? 0) > 0 ? [{ label: "Review now", href: `/admin/approvals/${submissions?.[0]?.id as string}` }] : []}
      />

      <Card interactive={false}>
        <form className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <label htmlFor="status" className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Filter status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={selectedStatus}
              className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="submitted">Submitted</option>
              <option value="needs_revision">Needs Revision</option>
            </select>
          </div>
          <div className="self-end">
            <Button type="submit">Apply</Button>
          </div>
        </form>
      </Card>

      {(submissions ?? []).length === 0 ? (
        <EmptyState
          title="No submissions in this queue"
          description="Drafts will appear here when influencers submit content for review."
          ctaLabel="Go to Campaigns"
          ctaHref="/admin/campaigns"
        />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {(submissions ?? []).map((submission) => {
              const assignment = assignmentById.get(submission.assignment_id as string);
              const campaign = assignment ? campaignById.get(assignment.campaign_id as string) : null;
              const influencer = assignment ? influencerById.get(assignment.influencer_id as string) : null;
              const deliverable = deliverableById.get(submission.deliverable_id as string);

              return (
                <Card key={submission.id as string} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{(campaign?.title as string) ?? "Campaign"}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{(influencer?.full_name as string) ?? "Influencer"}</p>
                    </div>
                    <SubmissionStatusBadge status={submission.status as string | null} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <dt className="text-slate-500 dark:text-slate-400">Platform</dt>
                    <dd className="text-slate-700 dark:text-slate-200">{(deliverable?.platform as string) ?? "-"}</dd>
                    <dt className="text-slate-500 dark:text-slate-400">Version</dt>
                    <dd className="text-slate-700 dark:text-slate-200">v{typeof submission.version === "number" ? submission.version : 1}</dd>
                    <dt className="text-slate-500 dark:text-slate-400">Submitted</dt>
                    <dd className="text-slate-700 dark:text-slate-200">{submission.submitted_at ? new Date(submission.submitted_at as string).toLocaleString() : "-"}</dd>
                  </dl>
                  <div className="mt-3">
                    <Link href={`/admin/approvals/${submission.id as string}`} className="inline-flex">
                      <Button size="sm" variant="secondary">Review</Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="hidden overflow-x-auto p-0 md:block" interactive={false}>
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Submitted At</th>
                  <th className="px-4 py-3">Influencer</th>
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Platform</th>
                  <th className="px-4 py-3">Version</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {(submissions ?? []).map((submission) => {
                  const assignment = assignmentById.get(submission.assignment_id as string);
                  const campaign = assignment ? campaignById.get(assignment.campaign_id as string) : null;
                  const influencer = assignment ? influencerById.get(assignment.influencer_id as string) : null;
                  const deliverable = deliverableById.get(submission.deliverable_id as string);

                  return (
                    <tr key={submission.id as string} className="border-t border-slate-200 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/70">
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                        {submission.submitted_at ? new Date(submission.submitted_at as string).toLocaleString() : "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{(influencer?.full_name as string) ?? "Influencer"}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{(campaign?.title as string) ?? "Campaign"}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{(deliverable?.platform as string) ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">v{typeof submission.version === "number" ? submission.version : 1}</td>
                      <td className="px-4 py-3"><SubmissionStatusBadge status={submission.status as string | null} /></td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/approvals/${submission.id as string}`} className="inline-flex">
                          <Button size="sm" variant="secondary">Review</Button>
                        </Link>
                      </td>
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
