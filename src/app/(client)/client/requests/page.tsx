import Link from "next/link";

import {
  ClientCreateChangeRequestForm,
  type LockedCampaignOption,
} from "@/components/campaigns/ClientCreateChangeRequestForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ campaign_id?: string }>;

type RequestRow = {
  id: string;
  campaign_id: string;
  request_note: string;
  status: string;
  created_at: string | null;
  reviewed_at: string | null;
  resolution_note: string | null;
  implemented_campaign_id: string | null;
  campaign: unknown;
};

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function campaignLabel(value: unknown) {
  if (!value || typeof value !== "object") return "Unknown campaign";

  const campaign = value as { title?: unknown; version_number?: unknown };
  const title = typeof campaign.title === "string" ? campaign.title : "Unknown campaign";
  const version = typeof campaign.version_number === "number" ? campaign.version_number : 1;
  return `${title} (v${version})`;
}

export default async function ClientRequestsPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const selectedCampaignId = typeof searchParams.campaign_id === "string" ? searchParams.campaign_id : null;

  const supabase = await createClient();
  const [{ data: lockedCampaigns }, { data: requests }] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id,title,version_number")
      .eq("is_locked", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("campaign_change_requests")
      .select(
        "id,campaign_id,request_note,status,created_at,reviewed_at,resolution_note,implemented_campaign_id,campaign:campaigns(id,title,version_number)",
      )
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const campaignOptions = (lockedCampaigns ?? []).map((campaign) => ({
    id: campaign.id as string,
    title: (campaign.title as string) ?? "Untitled campaign",
    versionNumber: (campaign.version_number as number) ?? 1,
  })) as LockedCampaignOption[];

  const requestRows = (requests ?? []) as unknown as RequestRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Change Requests"
        subtitle="Submit post-lock change requests and track manager review outcomes."
      />

      <Card interactive={false}>
        <CardHeader>
          <CardTitle>Create Request</CardTitle>
          <CardDescription>
            Change requests are allowed only for locked campaigns. Approved requests create a new version and cancel old invites.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientCreateChangeRequestForm
            campaigns={campaignOptions}
            initialCampaignId={selectedCampaignId}
          />
        </CardContent>
      </Card>

      <Card interactive={false}>
        <CardHeader>
          <CardTitle>Request History</CardTitle>
          <CardDescription>Latest requests and manager decisions for your campaigns.</CardDescription>
        </CardHeader>
        <CardContent>
          {requestRows.length === 0 ? (
            <EmptyState
              title="No requests yet"
              description="Submit a request when a locked campaign needs updates."
            />
          ) : (
            <div className="space-y-3">
              {requestRows.map((request) => (
                <article key={request.id} className="rounded-xl border border-border bg-surface/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={request.status} />
                      <p className="text-xs text-muted">{campaignLabel(request.campaign)}</p>
                    </div>
                    <p className="text-xs text-muted">Created {formatDate(request.created_at)}</p>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-text">{request.request_note}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
                    <span>Reviewed: {formatDate(request.reviewed_at)}</span>
                    {request.resolution_note ? <span>Note: {request.resolution_note}</span> : null}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Link
                      href={`/client/campaigns/${request.campaign_id}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Open source campaign
                    </Link>
                    {request.implemented_campaign_id ? (
                      <Link
                        href={`/client/campaigns/${request.implemented_campaign_id}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Open implemented version
                      </Link>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
