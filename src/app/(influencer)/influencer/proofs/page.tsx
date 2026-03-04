import Link from "next/link";
import { redirect } from "next/navigation";

import { ProofStatusBadge } from "@/components/proofs/ProofStatusBadge";
import { getCurrentInfluencer } from "@/lib/influencers/getCurrentInfluencer";
import { createClient } from "@/lib/supabase/server";

export default async function InfluencerProofsPage() {
  const influencer = await getCurrentInfluencer();
  if (!influencer) {
    redirect("/influencer/profile");
  }

  const supabase = await createClient();
  const { data: assignments } = await supabase
    .from("campaign_assignments")
    .select("id, campaign_id, influencer_id")
    .eq("influencer_id", influencer.id);

  const assignmentIds = (assignments ?? []).map((item) => item.id as string);
  const { data: proofs } = assignmentIds.length
    ? await supabase
        .from("post_proofs")
        .select("*")
        .in("assignment_id", assignmentIds)
        .order("posted_at", { ascending: false })
    : { data: [] as Record<string, unknown>[] };

  const campaignIds = Array.from(new Set((assignments ?? []).map((item) => item.campaign_id as string)));
  const { data: campaigns } = campaignIds.length
    ? await supabase.from("campaigns").select("id, title").in("id", campaignIds)
    : { data: [] as Record<string, unknown>[] };

  const deliverableIds = Array.from(new Set((proofs ?? []).map((item) => item.deliverable_id as string)));
  const { data: deliverables } = deliverableIds.length
    ? await supabase
        .from("campaign_deliverables")
        .select("id, platform, due_at")
        .in("id", deliverableIds)
    : { data: [] as Record<string, unknown>[] };

  const campaignByAssignmentId = new Map(
    (assignments ?? []).map((item) => [item.id as string, item.campaign_id as string]),
  );
  const campaignById = new Map((campaigns ?? []).map((item) => [item.id as string, item]));
  const deliverableById = new Map((deliverables ?? []).map((item) => [item.id as string, item]));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Proofs</h1>

      {(proofs ?? []).length === 0 ? (
        <section className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
          No proofs available yet.
        </section>
      ) : (
        <div className="space-y-3">
          {(proofs ?? []).map((proof) => {
            const assignmentId = proof.assignment_id as string;
            const deliverableId = proof.deliverable_id as string;
            const campaignId = campaignByAssignmentId.get(assignmentId) ?? "";
            const campaign = campaignById.get(campaignId);
            const deliverable = deliverableById.get(deliverableId);
            const status = (proof.status as string | null) ?? "not_submitted";
            const isSubmitCta =
              status === "not_submitted" || status === "rejected" || status === "needs_url";

            return (
              <article
                key={proof.id as string}
                className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-lg font-semibold text-slate-900">
                    {(campaign?.title as string) ?? "Campaign"}
                  </p>
                  <ProofStatusBadge status={status} />
                </div>

                <div className="grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
                  <p>Platform: {(deliverable?.platform as string) ?? "-"}</p>
                  <p>
                    Due: {deliverable?.due_at ? new Date(deliverable.due_at as string).toLocaleString() : "-"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {isSubmitCta ? (
                    <Link
                      href={`/influencer/proofs/submit?assignmentId=${assignmentId}&deliverableId=${deliverableId}`}
                      className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
                    >
                      Submit / Update Proof
                    </Link>
                  ) : status === "posted_pending" ? (
                    <span className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700">
                      Waiting verification
                    </span>
                  ) : (
                    <span className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                      Verified ✅
                    </span>
                  )}
                </div>

                {status === "rejected" && proof.reject_reason ? (
                  <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    Rejection reason: {proof.reject_reason as string}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
