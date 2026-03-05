import Link from "next/link";
import { notFound } from "next/navigation";

import { ClientApproveCampaignButton } from "@/components/campaigns/ClientApproveCampaignButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;

type CampaignRow = {
  id: string;
  title: string;
  description: string | null;
  objectives: string | null;
  status: string | null;
  version_number: number | null;
  timezone: string | null;
  is_locked: boolean | null;
  client_approved_at: string | null;
  locked_at: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
  brand: unknown;
};

type RequestRow = {
  id: string;
  status: string;
  request_note: string;
  created_at: string | null;
  reviewed_at: string | null;
  implemented_campaign_id: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function getBrandName(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const name = (value as { name?: unknown }).name;
    return typeof name === "string" && name.length > 0 ? name : "Unassigned brand";
  }

  if (Array.isArray(value) && value.length > 0) {
    const first = value[0];
    if (first && typeof first === "object") {
      const name = (first as { name?: unknown }).name;
      if (typeof name === "string" && name.length > 0) {
        return name;
      }
    }
  }

  return "Unassigned brand";
}

export default async function ClientCampaignDetailPage(props: { params: Params }) {
  const { id } = await props.params;
  const supabase = await createClient();

  const [{ data: campaign, error: campaignError }, { data: requests }] = await Promise.all([
    supabase
      .from("campaigns")
      .select(
        "id,title,description,objectives,status,version_number,timezone,is_locked,client_approved_at,locked_at,start_date,end_date,created_at,brand:brands(name)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("campaign_change_requests")
      .select("id,status,request_note,created_at,reviewed_at,implemented_campaign_id")
      .eq("campaign_id", id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (campaignError || !campaign) {
    notFound();
  }

  const campaignData = campaign as unknown as CampaignRow;
  const requestRows = (requests ?? []) as unknown as RequestRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title={campaignData.title}
        subtitle={`Brand: ${getBrandName(campaignData.brand)} • Campaign version ${campaignData.version_number ?? 1}`}
        breadcrumbs={[
          { label: "Campaigns", href: "/client/campaigns" },
          { label: campaignData.title },
        ]}
        actions={
          <Link
            href="/client/campaigns"
            className="rounded-xl border border-border px-3 py-2 text-sm text-text hover:bg-surface-2"
          >
            Back to Campaigns
          </Link>
        }
      />

      <Card interactive={false}>
        <CardHeader>
          <CardTitle>Approval and Lock</CardTitle>
          <CardDescription>
            Client approval is required before the manager can lock this campaign.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={campaignData.status} />
            <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-muted">
              {campaignData.is_locked ? "Locked" : "Unlocked"}
            </span>
          </div>

          <div className="grid gap-2 text-sm text-muted sm:grid-cols-2">
            <p>Client approved: {formatDate(campaignData.client_approved_at)}</p>
            <p>Locked at: {formatDate(campaignData.locked_at)}</p>
            <p>Start date: {campaignData.start_date ?? "-"}</p>
            <p>End date: {campaignData.end_date ?? "-"}</p>
            <p>Timezone: {campaignData.timezone ?? "Asia/Manila"}</p>
            <p>Created: {formatDate(campaignData.created_at)}</p>
          </div>

          <ClientApproveCampaignButton
            campaignId={campaignData.id}
            approvedAt={campaignData.client_approved_at}
          />

          {campaignData.is_locked ? (
            <Link
              href={`/client/requests?campaign_id=${campaignData.id}`}
              className="inline-flex rounded-xl border border-border px-3 py-2 text-sm text-text hover:bg-surface-2"
            >
              Request Campaign Change
            </Link>
          ) : null}
        </CardContent>
      </Card>

      <Card interactive={false}>
        <CardHeader>
          <CardTitle>Campaign Brief</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Description</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-text">{campaignData.description ?? "No description"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Objectives</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-text">{campaignData.objectives ?? "No objectives"}</p>
          </div>
        </CardContent>
      </Card>

      <Card interactive={false}>
        <CardHeader>
          <CardTitle>Recent Change Requests</CardTitle>
          <CardDescription>Post-lock requests are reviewed by the campaign manager.</CardDescription>
        </CardHeader>
        <CardContent>
          {requestRows.length === 0 ? (
            <EmptyState
              title="No change requests yet"
              description="Once a locked campaign needs updates, submit a request from the Requests page."
              ctaHref={`/client/requests?campaign_id=${campaignData.id}`}
              ctaLabel="Open Requests"
            />
          ) : (
            <div className="space-y-3">
              {requestRows.map((request) => (
                <div key={request.id} className="rounded-xl border border-border bg-surface/70 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StatusBadge status={request.status} />
                    <p className="text-xs text-muted">Created {formatDate(request.created_at)}</p>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-text">{request.request_note}</p>
                  {request.implemented_campaign_id ? (
                    <Link
                      href={`/client/campaigns/${request.implemented_campaign_id}`}
                      className="mt-2 inline-flex text-xs font-medium text-primary hover:underline"
                    >
                      Open implemented campaign version
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
