import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProofStatusBadge } from "@/components/proofs/ProofStatusBadge";
import { ProofSubmitForm } from "@/components/influencer/ProofSubmitForm";
import { getCurrentInfluencer } from "@/lib/influencers/getCurrentInfluencer";
import { getSignedProofScreenshotUrls } from "@/lib/proofs/media";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{
  assignmentId?: string;
  deliverableId?: string;
}>;

export default async function InfluencerProofSubmitPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const influencer = await getCurrentInfluencer();
  if (!influencer) {
    redirect("/influencer/profile");
  }

  const { assignmentId, deliverableId } = await searchParams;
  if (!assignmentId || !deliverableId) {
    notFound();
  }

  const supabase = await createClient();
  const { data: assignment } = await supabase
    .from("campaign_assignments")
    .select("*")
    .eq("id", assignmentId)
    .eq("influencer_id", influencer.id)
    .eq("status", "accepted")
    .maybeSingle();
  if (!assignment) {
    notFound();
  }

  const [campaignRes, deliverableRes, proofRes] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, title")
      .eq("id", assignment.campaign_id)
      .eq("org_id", assignment.org_id)
      .maybeSingle(),
    supabase
      .from("campaign_deliverables")
      .select("id, platform, due_at")
      .eq("id", deliverableId)
      .eq("campaign_id", assignment.campaign_id)
      .eq("org_id", assignment.org_id)
      .maybeSingle(),
    supabase
      .from("post_proofs")
      .select("*")
      .eq("assignment_id", assignmentId)
      .eq("deliverable_id", deliverableId)
      .maybeSingle(),
  ]);

  const campaign = campaignRes.data;
  const deliverable = deliverableRes.data;
  const proof = proofRes.data;

  if (!deliverable || !proof) {
    notFound();
  }

  const screenshotPaths = Array.isArray(proof.screenshot_urls)
    ? proof.screenshot_urls.filter((item: unknown): item is string => typeof item === "string")
    : [];
  const signedScreenshots = await getSignedProofScreenshotUrls(screenshotPaths);

  return (
    <div className="space-y-4">
      <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Submit Proof</h1>
        <div className="grid gap-1 text-sm text-slate-700">
          <p>Campaign: {(campaign?.title as string) ?? "Campaign"}</p>
          <p>Platform: {(deliverable.platform as string) ?? "-"}</p>
          <p>
            Due: {deliverable.due_at ? new Date(deliverable.due_at as string).toLocaleString() : "-"}
          </p>
          <div className="flex items-center gap-2">
            <span>Current status:</span>
            <ProofStatusBadge status={(proof.status as string | null) ?? "not_submitted"} />
          </div>
        </div>

        {proof.reject_reason ? (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Rejection reason: {proof.reject_reason as string}
          </p>
        ) : null}

        {proof.posted_at || proof.post_url ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Previous submission</p>
            <p className="mt-1">
              Posted at: {proof.posted_at ? new Date(proof.posted_at as string).toLocaleString() : "-"}
            </p>
            <p className="mt-1">
              Post URL:{" "}
              {proof.post_url ? (
                <a
                  href={proof.post_url as string}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-900 underline"
                >
                  Open link
                </a>
              ) : (
                "-"
              )}
            </p>
          </div>
        ) : null}
      </section>

      <ProofSubmitForm
        assignmentId={assignmentId}
        deliverableId={deliverableId}
        defaultPostUrl={(proof.post_url as string | null) ?? null}
        existingScreenshots={signedScreenshots}
      />

      <Link
        href={`/influencer/campaigns/${assignmentId}`}
        className="inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
      >
        Back to Campaign
      </Link>
    </div>
  );
}
