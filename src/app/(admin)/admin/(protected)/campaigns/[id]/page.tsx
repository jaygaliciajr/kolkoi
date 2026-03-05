import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CampaignEditor } from "@/components/admin/CampaignEditor";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  CampaignChangeRequestReviewPanel,
  type CampaignChangeRequestItem,
} from "@/components/campaigns/CampaignChangeRequestReviewPanel";
import { ManagerLockCampaignButton } from "@/components/campaigns/ManagerLockCampaignButton";
import { NextActionPanel } from "@/components/ui/NextActionPanel";
import { getSelectedOrgId } from "@/lib/org/getSelectedOrgId";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export default async function CampaignDetailPage(props: { params: Params }) {
  const orgId = await getSelectedOrgId();
  if (!orgId) {
    redirect("/admin/select-org");
  }

  const { id } = await props.params;
  const supabase = await createClient();
  const [{ data: campaign, error }, { data: requests }] = await Promise.all([
    supabase.from("campaigns").select("*").eq("id", id).eq("org_id", orgId).maybeSingle(),
    supabase
      .from("campaign_change_requests")
      .select(
        "id,campaign_id,request_note,status,created_at,reviewed_at,resolution_note,implemented_campaign_id",
      )
      .eq("campaign_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (error || !campaign) {
    notFound();
  }

  const requestRows: CampaignChangeRequestItem[] = ((requests ?? []) as Array<{
    id: string;
    campaign_id: string;
    request_note: string;
    status: string;
    created_at: string | null;
    reviewed_at: string | null;
    resolution_note: string | null;
    implemented_campaign_id: string | null;
  }>).map((request) => ({
    id: request.id,
    campaignId: request.campaign_id,
    requestNote: request.request_note,
    status: request.status,
    createdAt: request.created_at,
    reviewedAt: request.reviewed_at,
    resolutionNote: request.resolution_note,
    implementedCampaignId: request.implemented_campaign_id,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{campaign.title}</h1>
          <div className="mt-2">
            <StatusBadge status={campaign.status as string | null} />
          </div>
        </div>
        <Link
          href="/admin/campaigns"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          Back to campaigns
        </Link>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-md bg-slate-100 px-3 py-1 font-medium text-slate-800">
            Overview
          </span>
          <Link
            href={`/admin/campaigns/${id}/deliverables`}
            className="rounded-md border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-100"
          >
            Deliverables
          </Link>
          <Link
            href={`/admin/campaigns/${id}/invite`}
            className="rounded-md border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-100"
          >
            Invites
          </Link>
        </div>
      </section>

      <NextActionPanel
        items={[
          { label: "Manage deliverables", href: `/admin/campaigns/${id}/deliverables` },
          { label: "Invite influencers", href: `/admin/campaigns/${id}/invite` },
        ]}
      />

      <section className="space-y-3 rounded-xl border border-border bg-surface/80 p-4">
        <div>
          <h2 className="text-lg font-semibold text-text">Lock Controls</h2>
          <p className="text-sm text-muted">
            Manager lock is available only after client approval. Locking is irreversible.
          </p>
        </div>

        <div className="grid gap-2 text-sm text-muted sm:grid-cols-2">
          <p>Client approved at: {formatDateTime((campaign.client_approved_at as string | null) ?? null)}</p>
          <p>Locked at: {formatDateTime((campaign.locked_at as string | null) ?? null)}</p>
        </div>

        <ManagerLockCampaignButton
          campaignId={campaign.id as string}
          isLocked={Boolean(campaign.is_locked)}
          lockedAt={(campaign.locked_at as string | null) ?? null}
          clientApprovedAt={(campaign.client_approved_at as string | null) ?? null}
        />

        <p className="text-xs text-amber-600 dark:text-amber-300">
          Post-lock changes require client change requests. Approved requests create a new version and require re-invite.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-surface/80 p-4">
        <div>
          <h2 className="text-lg font-semibold text-text">Change Requests</h2>
          <p className="text-sm text-muted">
            Review open client requests. Approve to create a new campaign version and cancel active invites.
          </p>
        </div>
        <CampaignChangeRequestReviewPanel requests={requestRows} />
      </section>

      {campaign.is_locked ? (
        <section className="rounded-xl border border-dashed border-border bg-surface/70 p-4 text-sm text-muted">
          This campaign is locked. Direct edits are blocked; use change requests and versioning.
        </section>
      ) : (
        <CampaignEditor
          campaign={{
            id: campaign.id as string,
            title: campaign.title as string,
            description: (campaign.description as string | null) ?? null,
            objectives: (campaign.objectives as string | null) ?? null,
            status: (campaign.status as string | null) ?? null,
            start_date: (campaign.start_date as string | null) ?? null,
            end_date: (campaign.end_date as string | null) ?? null,
          }}
        />
      )}
    </div>
  );
}
