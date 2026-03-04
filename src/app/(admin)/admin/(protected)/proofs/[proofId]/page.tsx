import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProofReviewActions } from "@/components/admin/ProofReviewActions";
import { ProofStatusBadge } from "@/components/proofs/ProofStatusBadge";
import { getSelectedOrgId } from "@/lib/org/getSelectedOrgId";
import { getSignedProofScreenshotUrls } from "@/lib/proofs/media";
import { getMyRole } from "@/lib/rbac/getMyRole";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ proofId: string }>;

function toList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export default async function AdminProofDetailPage({
  params,
}: {
  params: Params;
}) {
  const orgId = await getSelectedOrgId();
  if (!orgId) {
    redirect("/admin/select-org");
  }

  const { proofId } = await params;
  const supabase = await createClient();

  const { data: proof } = await supabase
    .from("post_proofs")
    .select("*")
    .eq("id", proofId)
    .maybeSingle();
  if (!proof) {
    notFound();
  }

  const { data: assignment } = await supabase
    .from("campaign_assignments")
    .select("*")
    .eq("id", proof.assignment_id)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!assignment) {
    notFound();
  }

  const [campaignRes, influencerRes, deliverableRes] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, title, description, objectives")
      .eq("id", assignment.campaign_id)
      .eq("org_id", orgId)
      .maybeSingle(),
    supabase
      .from("influencers")
      .select("id, full_name, ig_handle, fb_page_url")
      .eq("id", assignment.influencer_id)
      .maybeSingle(),
    supabase
      .from("campaign_deliverables")
      .select("*")
      .eq("id", proof.deliverable_id)
      .eq("org_id", orgId)
      .maybeSingle(),
  ]);

  const campaign = campaignRes.data;
  const influencer = influencerRes.data;
  const deliverable = deliverableRes.data;

  const screenshotPaths = Array.isArray(proof.screenshot_urls)
    ? proof.screenshot_urls.filter((item: unknown): item is string => typeof item === "string")
    : [];
  const signedScreenshots = await getSignedProofScreenshotUrls(screenshotPaths);

  const role = await getMyRole();
  const canReview = role === "campaign_manager";

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">Proof Review</h1>
            <ProofStatusBadge status={(proof.status as string | null) ?? "not_submitted"} />
          </div>

          <div className="grid gap-1 text-sm text-slate-700">
            <p>Campaign: {(campaign?.title as string) ?? "Campaign"}</p>
            <p>Influencer: {(influencer?.full_name as string) ?? "-"}</p>
            <p>Platform: {(deliverable?.platform as string) ?? "-"}</p>
            <p>Posted at: {proof.posted_at ? new Date(proof.posted_at as string).toLocaleString() : "-"}</p>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Campaign Summary</p>
            <p className="mt-1 whitespace-pre-wrap">{(campaign?.description as string) ?? "No description."}</p>
            <p className="mt-2 whitespace-pre-wrap">{(campaign?.objectives as string) ?? "No objectives."}</p>
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Deliverable Requirements</h2>
          <div className="grid gap-1 text-sm text-slate-700">
            <p>
              Due: {deliverable?.due_at ? new Date(deliverable.due_at as string).toLocaleString() : "-"}
            </p>
            <p>
              Payout: {typeof deliverable?.payout_amount === "number" ? deliverable.payout_amount.toLocaleString() : "0"}
            </p>
          </div>

          <div className="flex flex-wrap gap-1">
            {toList(deliverable?.required_hashtags).length === 0 ? (
              <span className="text-sm text-slate-500">No hashtags</span>
            ) : (
              toList(deliverable?.required_hashtags).map((tag, index) => (
                <span key={`${tag}-${index}`} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                  #{tag}
                </span>
              ))
            )}
          </div>

          <ul className="space-y-1 text-sm text-slate-700">
            {toList(deliverable?.talking_points).length === 0 ? (
              <li>- No talking points</li>
            ) : (
              toList(deliverable?.talking_points).map((point, index) => <li key={`${point}-${index}`}>- {point}</li>)
            )}
          </ul>
        </section>

        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Proof Data</h2>
          <p className="text-sm text-slate-700">
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
              "Not provided"
            )}
          </p>

          {proof.reject_reason ? (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
              Reject reason: {proof.reject_reason as string}
            </p>
          ) : null}

          {signedScreenshots.length === 0 ? (
            <p className="text-sm text-slate-500">No screenshots uploaded.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {signedScreenshots.map((item) => (
                <a
                  key={item.path}
                  href={item.signedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="h-36 rounded-md border border-slate-200 bg-cover bg-center"
                  style={{ backgroundImage: `url(${item.signedUrl})` }}
                />
              ))}
            </div>
          )}
        </section>

        <Link
          href="/admin/proofs"
          className="inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          Back to Proof Queue
        </Link>
      </div>

      <div className="space-y-4">
        {canReview ? (
          <ProofReviewActions proofId={proofId} />
        ) : (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Only users with campaign_manager role can verify or reject proofs.
          </section>
        )}
      </div>
    </div>
  );
}
