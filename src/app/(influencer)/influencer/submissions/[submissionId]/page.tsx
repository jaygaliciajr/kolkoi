import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SubmissionComments } from "@/components/influencer/SubmissionComments";
import { SubmissionEditorForm } from "@/components/influencer/SubmissionEditorForm";
import { SubmissionStatusBadge } from "@/components/submissions/SubmissionStatusBadge";
import { getCurrentInfluencer } from "@/lib/influencers/getCurrentInfluencer";
import { getSignedSubmissionMediaUrls } from "@/lib/submissions/media";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ submissionId: string }>;

export default async function InfluencerSubmissionDetailPage({
  params,
}: {
  params: Params;
}) {
  const influencer = await getCurrentInfluencer();
  if (!influencer) {
    redirect("/influencer/profile");
  }

  const { submissionId } = await params;
  const supabase = await createClient();

  const { data: submission } = await supabase
    .from("content_submissions")
    .select("*")
    .eq("id", submissionId)
    .maybeSingle();
  if (!submission) {
    notFound();
  }

  const { data: assignment } = await supabase
    .from("campaign_assignments")
    .select("*")
    .eq("id", submission.assignment_id)
    .eq("influencer_id", influencer.id)
    .maybeSingle();
  if (!assignment) {
    notFound();
  }

  const { data: deliverable } = await supabase
    .from("campaign_deliverables")
    .select("*")
    .eq("id", submission.deliverable_id)
    .eq("campaign_id", assignment.campaign_id)
    .maybeSingle();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, title")
    .eq("id", assignment.campaign_id)
    .maybeSingle();

  const { data: history } = await supabase
    .from("content_submissions")
    .select("id, version, status, updated_at")
    .eq("assignment_id", submission.assignment_id)
    .eq("deliverable_id", submission.deliverable_id)
    .order("version", { ascending: false });

  const mediaPaths = Array.isArray(submission.media_urls)
    ? submission.media_urls.filter((item: unknown): item is string => typeof item === "string")
    : [];
  const signedMedia = await getSignedSubmissionMediaUrls(mediaPaths);

  const { data: comments } = await supabase
    .from("submission_comments")
    .select("id, user_id, body, created_at")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: true });

  const isEditable = submission.status === "draft";
  const needsRevision = submission.status === "needs_revision";

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">Submission v{submission.version as number}</h1>
          <SubmissionStatusBadge status={submission.status as string | null} />
        </div>
        <div className="mt-2 grid gap-1 text-sm text-slate-700">
          <p>Campaign: {(campaign?.title as string) ?? "Campaign"}</p>
          <p>Platform: {(deliverable?.platform as string) ?? "-"}</p>
          <p>Last updated: {submission.updated_at ? new Date(submission.updated_at as string).toLocaleString() : "-"}</p>
        </div>

        {needsRevision ? (
          <Link
            href={`/influencer/submissions/new?assignmentId=${assignment.id as string}&deliverableId=${submission.deliverable_id as string}`}
            className="mt-3 inline-flex rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Resubmit (New Version)
          </Link>
        ) : null}
      </section>

      {isEditable ? (
        <SubmissionEditorForm
          mode="edit"
          assignmentId={assignment.id as string}
          deliverableId={submission.deliverable_id as string}
          submissionId={submissionId}
          defaultCaption={(submission.caption as string | null) ?? ""}
          defaultNotes={(submission.notes as string | null) ?? ""}
          existingMedia={signedMedia}
          versionHistory={(history ?? []).map((item) => ({
            id: item.id as string,
            version: typeof item.version === "number" ? item.version : 1,
            status: (item.status as string | null) ?? "draft",
            updated_at: (item.updated_at as string | null) ?? null,
          }))}
        />
      ) : (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Submission Content</h2>
          <div className="space-y-2 text-sm text-slate-700">
            <p className="whitespace-pre-wrap">{(submission.caption as string | null) ?? "No caption."}</p>
            <p className="whitespace-pre-wrap text-slate-600">{(submission.notes as string | null) ?? ""}</p>
          </div>

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
            <p className="text-sm text-slate-500">No media uploaded.</p>
          )}

          <section className="space-y-2 rounded-md border border-slate-200 p-3">
            <h3 className="text-sm font-semibold text-slate-900">Version History</h3>
            <ul className="space-y-1 text-sm text-slate-700">
              {(history ?? []).map((item) => (
                <li key={item.id as string}>
                  <Link href={`/influencer/submissions/${item.id as string}`} className="hover:underline">
                    v{typeof item.version === "number" ? item.version : 1} |{" "}
                    {(item.status as string | null) ?? "draft"}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </section>
      )}

      <SubmissionComments
        submissionId={submissionId}
        comments={(comments ?? []).map((item) => ({
          id: item.id as string,
          user_id: (item.user_id as string | null) ?? null,
          body: (item.body as string | null) ?? null,
          created_at: (item.created_at as string | null) ?? null,
        }))}
      />
    </div>
  );
}
