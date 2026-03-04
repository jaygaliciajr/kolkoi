import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SubmissionReviewActions } from "@/components/admin/SubmissionReviewActions";
import { SubmissionComments } from "@/components/influencer/SubmissionComments";
import { SubmissionStatusBadge } from "@/components/submissions/SubmissionStatusBadge";
import { getSelectedOrgId } from "@/lib/org/getSelectedOrgId";
import { getMyRole } from "@/lib/rbac/getMyRole";
import { getSignedSubmissionMediaUrls } from "@/lib/submissions/media";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ submissionId: string }>;

export default async function AdminSubmissionReviewPage({
  params,
}: {
  params: Params;
}) {
  const orgId = await getSelectedOrgId();
  if (!orgId) {
    redirect("/admin/select-org");
  }

  const { submissionId } = await params;
  const supabase = await createClient();

  const { data: submission } = await supabase
    .from("content_submissions")
    .select("*")
    .eq("id", submissionId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!submission) {
    notFound();
  }

  const { data: assignment } = await supabase
    .from("campaign_assignments")
    .select("*")
    .eq("id", submission.assignment_id)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!assignment) {
    notFound();
  }

  const [campaignRes, deliverableRes, influencerRes, commentsRes, historyRes] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, title, description, objectives, end_date")
      .eq("id", assignment.campaign_id)
      .eq("org_id", orgId)
      .maybeSingle(),
    supabase
      .from("campaign_deliverables")
      .select("id, platform, due_at, payout_amount")
      .eq("id", submission.deliverable_id)
      .eq("org_id", orgId)
      .maybeSingle(),
    supabase
      .from("influencers")
      .select("id, full_name, ig_handle, fb_page_url, follower_count, engagement_rate")
      .eq("id", assignment.influencer_id)
      .maybeSingle(),
    supabase
      .from("submission_comments")
      .select("id, user_id, body, created_at")
      .eq("submission_id", submissionId)
      .order("created_at", { ascending: true }),
    supabase
      .from("content_submissions")
      .select("id, version, status, updated_at")
      .eq("assignment_id", submission.assignment_id)
      .eq("deliverable_id", submission.deliverable_id)
      .order("version", { ascending: false }),
  ]);

  const campaign = campaignRes.data;
  const deliverable = deliverableRes.data;
  const influencer = influencerRes.data;
  const comments = commentsRes.data ?? [];
  const history = historyRes.data ?? [];

  const mediaPaths = Array.isArray(submission.media_urls)
    ? submission.media_urls.filter((item: unknown): item is string => typeof item === "string")
    : [];
  const signedMedia = await getSignedSubmissionMediaUrls(mediaPaths);

  const role = await getMyRole();
  const canReview = role === "campaign_manager";

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">Submission Review</h1>
            <SubmissionStatusBadge status={submission.status as string | null} />
          </div>

          <div className="grid gap-2 text-sm text-slate-700">
            <p>Campaign: {(campaign?.title as string) ?? "Campaign"}</p>
            <p>Version: v{typeof submission.version === "number" ? submission.version : 1}</p>
            <p>Platform: {(deliverable?.platform as string) ?? "-"}</p>
            <p>
              Submitted: {submission.submitted_at ? new Date(submission.submitted_at as string).toLocaleString() : "-"}
            </p>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Campaign Brief</p>
            <p className="mt-1 whitespace-pre-wrap">{(campaign?.description as string) ?? "No description."}</p>
            <p className="mt-2 whitespace-pre-wrap">{(campaign?.objectives as string) ?? "No objectives."}</p>
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Influencer</h2>
          <div className="grid gap-1 text-sm text-slate-700">
            <p>Name: {(influencer?.full_name as string) ?? "-"}</p>
            <p>IG: {(influencer?.ig_handle as string) ?? "-"}</p>
            <p>FB Page: {(influencer?.fb_page_url as string) ?? "-"}</p>
            <p>
              Followers: {typeof influencer?.follower_count === "number" ? influencer.follower_count.toLocaleString() : "-"}
            </p>
            <p>
              Engagement: {typeof influencer?.engagement_rate === "number" ? `${influencer.engagement_rate}%` : "-"}
            </p>
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Submission Content</h2>
          <p className="whitespace-pre-wrap text-sm text-slate-700">
            {(submission.caption as string | null) ?? "No caption."}
          </p>
          <p className="whitespace-pre-wrap text-sm text-slate-600">
            {(submission.notes as string | null) ?? ""}
          </p>

          {signedMedia.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {signedMedia.map((item) => (
                <a
                  key={item.path}
                  href={item.signedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Open media file
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No media attached.</p>
          )}
        </section>

        <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Version History</h2>
          <ul className="space-y-1 text-sm text-slate-700">
            {history.map((item) => (
              <li key={item.id as string}>
                <Link
                  href={`/admin/approvals/${item.id as string}`}
                  className="inline-flex items-center gap-2 hover:underline"
                >
                  <span>v{typeof item.version === "number" ? item.version : 1}</span>
                  <SubmissionStatusBadge status={(item.status as string | null) ?? "draft"} />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <SubmissionComments
          submissionId={submissionId}
          comments={comments.map((item) => ({
            id: item.id as string,
            user_id: (item.user_id as string | null) ?? null,
            body: (item.body as string | null) ?? null,
            created_at: (item.created_at as string | null) ?? null,
          }))}
        />
      </div>

      <div className="space-y-4">
        {canReview ? (
          <SubmissionReviewActions submissionId={submissionId} />
        ) : (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Only users with campaign_manager role can approve or request revisions.
          </section>
        )}
      </div>
    </div>
  );
}
