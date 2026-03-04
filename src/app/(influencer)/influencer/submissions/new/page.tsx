import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SubmissionEditorForm } from "@/components/influencer/SubmissionEditorForm";
import { SubmissionStatusBadge } from "@/components/submissions/SubmissionStatusBadge";
import { getCurrentInfluencer } from "@/lib/influencers/getCurrentInfluencer";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{
  assignmentId?: string;
  deliverableId?: string;
}>;

export default async function NewSubmissionPage({
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

  const { data: deliverable } = await supabase
    .from("campaign_deliverables")
    .select("*")
    .eq("id", deliverableId)
    .eq("campaign_id", assignment.campaign_id)
    .eq("org_id", assignment.org_id)
    .maybeSingle();
  if (!deliverable) {
    notFound();
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, title")
    .eq("id", assignment.campaign_id)
    .maybeSingle();

  const { data: history } = await supabase
    .from("content_submissions")
    .select("id, version, status, updated_at")
    .eq("assignment_id", assignmentId)
    .eq("deliverable_id", deliverableId)
    .order("version", { ascending: false });

  const latest = history?.[0] ?? null;
  if (latest && latest.status !== "needs_revision") {
    redirect(`/influencer/submissions/${latest.id as string}`);
  }

  const isResubmission = latest?.status === "needs_revision";

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          {isResubmission ? "Resubmit Draft" : "New Draft Submission"}
        </h1>
        <div className="mt-2 grid gap-1 text-sm text-slate-700">
          <p>Campaign: {(campaign?.title as string) ?? "Campaign"}</p>
          <p>Platform: {(deliverable.platform as string) ?? "-"}</p>
          <p>
            Due date:{" "}
            {deliverable.due_at ? new Date(deliverable.due_at as string).toLocaleString() : "-"}
          </p>
        </div>
        {isResubmission ? (
          <div className="mt-3 flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
            <span>Latest status:</span>
            <SubmissionStatusBadge status={latest?.status as string | null} />
            <span>Submit a new version for review.</span>
          </div>
        ) : null}
      </section>

      <SubmissionEditorForm
        mode="create"
        assignmentId={assignmentId}
        deliverableId={deliverableId}
        existingMedia={[]}
        allowDraft={!isResubmission}
        versionHistory={(history ?? []).map((item) => ({
          id: item.id as string,
          version: typeof item.version === "number" ? item.version : 1,
          status: (item.status as string | null) ?? "draft",
          updated_at: (item.updated_at as string | null) ?? null,
        }))}
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
