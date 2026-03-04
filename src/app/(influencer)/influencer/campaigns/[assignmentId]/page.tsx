import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProofStatusBadge } from "@/components/proofs/ProofStatusBadge";
import { SubmissionStatusBadge } from "@/components/submissions/SubmissionStatusBadge";
import { Accordion } from "@/components/ui/Accordion";
import { NextActionPanel } from "@/components/ui/NextActionPanel";
import { getCurrentInfluencer } from "@/lib/influencers/getCurrentInfluencer";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ assignmentId: string }>;

function tagsToList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function deliverableSubmissionCta(input: {
  assignmentId: string;
  deliverableId: string;
  submission: Record<string, unknown> | null;
}) {
  const submissionStatus =
    input.submission && typeof input.submission.status === "string"
      ? input.submission.status
      : null;

  if (!input.submission) {
    return (
      <Link
        href={`/influencer/submissions/new?assignmentId=${input.assignmentId}&deliverableId=${input.deliverableId}`}
        className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
      >
        Create Draft
      </Link>
    );
  }

  if (submissionStatus === "needs_revision") {
    return (
      <Link
        href={`/influencer/submissions/new?assignmentId=${input.assignmentId}&deliverableId=${input.deliverableId}`}
        className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
      >
        Resubmit (New Version)
      </Link>
    );
  }

  if (submissionStatus === "submitted") {
    return (
      <Link
        href={`/influencer/submissions/${input.submission.id as string}`}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
      >
        Waiting Approval
      </Link>
    );
  }

  if (submissionStatus === "approved") {
    return (
      <Link
        href={`/influencer/submissions/${input.submission.id as string}`}
        className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
      >
        Approved ✅
      </Link>
    );
  }

  return (
    <Link
      href={`/influencer/submissions/${input.submission.id as string}`}
      className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
    >
      Edit Draft
    </Link>
  );
}

export default async function InfluencerCampaignDetailPage(props: { params: Params }) {
  const influencer = await getCurrentInfluencer();
  if (!influencer) {
    redirect("/influencer/profile");
  }

  const { assignmentId } = await props.params;
  const supabase = await createClient();

  const { data: assignment } = await supabase
    .from("campaign_assignments")
    .select("*")
    .eq("id", assignmentId)
    .eq("influencer_id", influencer.id)
    .maybeSingle();
  if (!assignment) {
    notFound();
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", assignment.campaign_id)
    .eq("org_id", assignment.org_id)
    .maybeSingle();
  if (!campaign) {
    notFound();
  }

  const { data: deliverables } = await supabase
    .from("campaign_deliverables")
    .select("*")
    .eq("campaign_id", assignment.campaign_id)
    .eq("org_id", assignment.org_id)
    .order("due_at", { ascending: true });

  const deliverableIds = (deliverables ?? []).map((item) => item.id as string);

  const { data: proofs } = deliverableIds.length
    ? await supabase
        .from("post_proofs")
        .select("id, deliverable_id, status, reject_reason")
        .eq("assignment_id", assignmentId)
        .in("deliverable_id", deliverableIds)
    : { data: [] as Record<string, unknown>[] };

  const { data: submissions } = deliverableIds.length
    ? await supabase
        .from("content_submissions")
        .select("id, deliverable_id, status, version, updated_at")
        .eq("assignment_id", assignmentId)
        .in("deliverable_id", deliverableIds)
        .order("version", { ascending: false })
    : { data: [] as Record<string, unknown>[] };

  const proofMap = new Map((proofs ?? []).map((item) => [item.deliverable_id as string, item]));
  const latestSubmissionByDeliverable = new Map<string, Record<string, unknown>>();
  for (const item of submissions ?? []) {
    const deliverableId = item.deliverable_id as string;
    if (!latestSubmissionByDeliverable.has(deliverableId)) {
      latestSubmissionByDeliverable.set(deliverableId, item);
    }
  }

  const pendingSubmissionDeliverable = (deliverables ?? []).find((deliverable) => {
    const latest = latestSubmissionByDeliverable.get(deliverable.id as string);
    const status = latest?.status as string | undefined;
    return !latest || status === "needs_revision";
  });
  const pendingProofDeliverable = (deliverables ?? []).find((deliverable) => {
    const proof = proofMap.get(deliverable.id as string);
    const status = (proof?.status as string | undefined) ?? "not_submitted";
    return status === "not_submitted" || status === "needs_url" || status === "rejected";
  });

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">{campaign.title as string}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {(campaign.description as string | null) ?? "No campaign description."}
        </p>
        <p className="mt-2 text-sm text-slate-700">
          <span className="font-medium">Objectives:</span>{" "}
          {(campaign.objectives as string | null) ?? "-"}
        </p>
      </section>

      <NextActionPanel
        items={[
          ...(pendingSubmissionDeliverable
            ? [
                {
                  label: "Update draft",
                  href: `/influencer/submissions/new?assignmentId=${assignmentId}&deliverableId=${pendingSubmissionDeliverable.id as string}`,
                },
              ]
            : []),
          ...(pendingProofDeliverable
            ? [
                {
                  label: "Submit proof",
                  href: `/influencer/proofs/submit?assignmentId=${assignmentId}&deliverableId=${pendingProofDeliverable.id as string}`,
                },
              ]
            : []),
        ]}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Deliverables</h2>
        {(deliverables ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
            No deliverables configured.
          </div>
        ) : (
          (deliverables ?? []).map((deliverable) => {
            const proof = proofMap.get(deliverable.id as string) ?? null;
            const proofStatus = (proof?.status as string | null) ?? "not_submitted";
            const latestSubmission = latestSubmissionByDeliverable.get(deliverable.id as string) ?? null;

            return (
              <Accordion
                key={deliverable.id as string}
                title={deliverable.platform as string}
                subtitle={deliverable.due_at ? `Due ${new Date(deliverable.due_at as string).toLocaleString()}` : "No due date"}
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Draft:</span>
                      {latestSubmission ? (
                        <SubmissionStatusBadge status={latestSubmission.status as string | null} />
                      ) : (
                        <SubmissionStatusBadge status="draft" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Proof:</span>
                      <ProofStatusBadge status={proofStatus} />
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                    <p>
                      Due: {deliverable.due_at ? new Date(deliverable.due_at as string).toLocaleString() : "-"}
                    </p>
                    <p>
                      Payout:{" "}
                      {typeof deliverable.payout_amount === "number"
                        ? deliverable.payout_amount.toLocaleString()
                        : "0"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {tagsToList(deliverable.required_hashtags).length === 0 ? (
                      <span className="text-sm text-slate-500">No hashtags</span>
                    ) : (
                      tagsToList(deliverable.required_hashtags).map((item, index) => (
                        <span
                          key={`${deliverable.id as string}-tag-${index}`}
                          className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700"
                        >
                          #{item}
                        </span>
                      ))
                    )}
                  </div>

                  <ul className="space-y-1 text-sm text-slate-700">
                    {tagsToList(deliverable.talking_points).length === 0 ? (
                      <li>- No talking points</li>
                    ) : (
                      tagsToList(deliverable.talking_points).map((point, index) => (
                        <li key={`${deliverable.id as string}-point-${index}`}>- {point}</li>
                      ))
                    )}
                  </ul>

                  {proofStatus === "needs_url" ? (
                    <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
                      URL required to be fully compliant (allowed temporarily).
                    </p>
                  ) : null}

                  {proofStatus === "rejected" && proof?.reject_reason ? (
                    <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      Proof rejected: {proof.reject_reason as string}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    {deliverableSubmissionCta({
                      assignmentId,
                      deliverableId: deliverable.id as string,
                      submission: latestSubmission,
                    })}
                    <Link
                      href={`/influencer/proofs/submit?assignmentId=${assignmentId}&deliverableId=${deliverable.id as string}`}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      Submit Proof
                    </Link>
                  </div>
                </div>
              </Accordion>
            );
          })
        )}
      </section>
    </div>
  );
}
