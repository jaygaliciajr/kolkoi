import Link from "next/link";
import { redirect } from "next/navigation";

import { ProofStatusBadge } from "@/components/proofs/ProofStatusBadge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { NextActionPanel } from "@/components/ui/NextActionPanel";
import { getSelectedOrgId } from "@/lib/org/getSelectedOrgId";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ status?: string; campaign?: string }>;
export const revalidate = 10;

export default async function AdminProofsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const orgId = await getSelectedOrgId();
  if (!orgId) {
    redirect("/admin/select-org");
  }

  const { status, campaign } = await searchParams;
  const selectedStatus = status === "needs_url" ? "needs_url" : "posted_pending";
  const selectedCampaign = campaign ?? "";

  const supabase = await createClient();
  const [campaignsRes, rawProofsRes] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, title")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false }),
    supabase
      .from("post_proofs")
      .select("id, assignment_id, deliverable_id, status, posted_at")
      .eq("status", selectedStatus)
      .order("posted_at", { ascending: false }),
  ]);

  const campaigns = campaignsRes.data ?? [];
  const rawProofs = rawProofsRes.data ?? [];

  const assignmentIds = Array.from(new Set((rawProofs ?? []).map((item) => item.assignment_id as string)));
  const { data: allAssignments } = assignmentIds.length
    ? await supabase
        .from("campaign_assignments")
        .select("id, campaign_id, influencer_id, org_id")
        .in("id", assignmentIds)
    : { data: [] as Record<string, unknown>[] };
  const assignments = (allAssignments ?? []).filter((item) => item.org_id === orgId);
  const allowedAssignmentIds = new Set(assignments.map((item) => item.id as string));

  const proofs = (rawProofs ?? []).filter((item) => allowedAssignmentIds.has(item.assignment_id as string));

  const campaignIds = Array.from(new Set(assignments.map((item) => item.campaign_id as string)));
  const influencerIds = Array.from(new Set(assignments.map((item) => item.influencer_id as string)));
  const deliverableIds = Array.from(new Set(proofs.map((item) => item.deliverable_id as string)));
  const [proofCampaignsRes, influencersRes, deliverablesRes] = await Promise.all([
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

  const proofCampaigns = proofCampaignsRes.data ?? [];
  const influencers = influencersRes.data ?? [];
  const deliverables = deliverablesRes.data ?? [];

  const assignmentById = new Map(assignments.map((item) => [item.id as string, item]));
  const campaignById = new Map(proofCampaigns.map((item) => [item.id as string, item]));
  const influencerById = new Map(influencers.map((item) => [item.id as string, item]));
  const deliverableById = new Map(deliverables.map((item) => [item.id as string, item]));

  const filteredProofs = selectedCampaign
    ? proofs.filter((item) => {
        const assignment = assignmentById.get(item.assignment_id as string);
        return assignment?.campaign_id === selectedCampaign;
      })
    : proofs;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Proof Verification Queue</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Review submitted proof links/screenshots that need compliance checks.</p>
      </div>

      <NextActionPanel
        items={filteredProofs.length ? [{ label: "Verify now", href: `/admin/proofs/${filteredProofs[0].id as string}` }] : []}
      />

      <Card interactive={false}>
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
          <div>
            <label htmlFor="status" className="text-sm font-medium text-slate-800 dark:text-slate-200">Status</label>
            <select
              id="status"
              name="status"
              defaultValue={selectedStatus}
              className="ui-select mt-1"
            >
              <option value="posted_pending">posted_pending</option>
              <option value="needs_url">needs_url</option>
            </select>
          </div>

          <div>
            <label htmlFor="campaign" className="text-sm font-medium text-slate-800 dark:text-slate-200">Campaign</label>
            <select
              id="campaign"
              name="campaign"
              defaultValue={selectedCampaign}
              className="ui-select mt-1"
            >
              <option value="">All campaigns</option>
              {(campaigns ?? []).map((item) => (
                <option key={item.id as string} value={item.id as string}>
                  {item.title as string}
                </option>
              ))}
            </select>
          </div>

          <div className="self-end">
            <Button type="submit">Apply Filters</Button>
          </div>
        </form>
      </Card>

      {filteredProofs.length === 0 ? (
        <EmptyState
          title="No proofs in this queue"
          description="When influencers submit proof screenshots/URLs, they will appear here."
          ctaLabel="View Campaigns"
          ctaHref="/admin/campaigns"
        />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {filteredProofs.map((proof) => {
              const assignment = assignmentById.get(proof.assignment_id as string);
              const campaign = assignment ? campaignById.get(assignment.campaign_id as string) : null;
              const influencer = assignment ? influencerById.get(assignment.influencer_id as string) : null;
              const deliverable = deliverableById.get(proof.deliverable_id as string);

              return (
                <Card key={proof.id as string} className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{(campaign?.title as string) ?? "Campaign"}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{(influencer?.full_name as string) ?? "Influencer"}</p>
                    </div>
                    <ProofStatusBadge status={(proof.status as string | null) ?? "not_submitted"} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <dt className="text-slate-500 dark:text-slate-400">Platform</dt>
                    <dd className="text-slate-700 dark:text-slate-200">{(deliverable?.platform as string) ?? "-"}</dd>
                    <dt className="text-slate-500 dark:text-slate-400">Posted</dt>
                    <dd className="text-slate-700 dark:text-slate-200">{proof.posted_at ? new Date(proof.posted_at as string).toLocaleString() : "-"}</dd>
                  </dl>
                  <div className="mt-3">
                    <Link href={`/admin/proofs/${proof.id as string}`} className="inline-flex">
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
                  <th className="px-4 py-3">Created/Posted</th>
                  <th className="px-4 py-3">Influencer</th>
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Platform</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProofs.map((proof) => {
                  const assignment = assignmentById.get(proof.assignment_id as string);
                  const campaign = assignment ? campaignById.get(assignment.campaign_id as string) : null;
                  const influencer = assignment ? influencerById.get(assignment.influencer_id as string) : null;
                  const deliverable = deliverableById.get(proof.deliverable_id as string);

                  return (
                    <tr key={proof.id as string} className="border-t border-slate-200 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/70">
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{proof.posted_at ? new Date(proof.posted_at as string).toLocaleString() : "-"}</td>
                      <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{(influencer?.full_name as string) ?? "Influencer"}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{(campaign?.title as string) ?? "Campaign"}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{(deliverable?.platform as string) ?? "-"}</td>
                      <td className="px-4 py-3"><ProofStatusBadge status={(proof.status as string | null) ?? "not_submitted"} /></td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/proofs/${proof.id as string}`} className="inline-flex">
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
