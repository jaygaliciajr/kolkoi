import Link from "next/link";

import { ClientApproveCampaignButton } from "@/components/campaigns/ClientApproveCampaignButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ q?: string; status?: string }>;

const FILTER_STATUSES = ["all", "draft", "active", "completed", "archived"] as const;
type FilterStatus = (typeof FILTER_STATUSES)[number];

type CampaignRow = {
  id: string;
  title: string;
  status: string | null;
  version_number: number | null;
  is_locked: boolean | null;
  client_approved_at: string | null;
  created_at: string | null;
  start_date: string | null;
  end_date: string | null;
  brand: unknown;
};

function asFilterStatus(value: string | undefined): FilterStatus {
  if (value && FILTER_STATUSES.includes(value as FilterStatus)) {
    return value as FilterStatus;
  }
  return "all";
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
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

export default async function ClientCampaignsPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const q = (searchParams.q ?? "").trim();
  const status = asFilterStatus(searchParams.status);

  const supabase = await createClient();
  let query = supabase
    .from("campaigns")
    .select(
      "id,title,status,version_number,is_locked,client_approved_at,created_at,start_date,end_date,brand:brands(name)",
    )
    .order("created_at", { ascending: false });

  if (q.length > 0) {
    query = query.ilike("title", `%${q}%`);
  }
  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data } = await query;
  const campaigns = (data ?? []) as unknown as CampaignRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        subtitle="Review campaign status, approve campaigns for locking, and open campaign details."
        filters={
          <form className="grid gap-3 sm:grid-cols-3">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search campaign title"
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-primary/30 sm:col-span-2"
            />
            <div className="flex gap-2">
              <select
                name="status"
                defaultValue={status}
                className="ui-select"
              >
                {FILTER_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-2"
              >
                Filter
              </button>
            </div>
          </form>
        }
      />

      {campaigns.length === 0 ? (
        <EmptyState
          title="No campaigns found"
          description="No campaigns match your filters yet. Ask your manager to create or assign campaign briefs."
        />
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} interactive={false}>
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{campaign.title}</CardTitle>
                    <CardDescription>
                      {getBrandName(campaign.brand)} • Version {campaign.version_number ?? 1}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={campaign.status} />
                    <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-muted">
                      {campaign.is_locked ? "Locked" : "Unlocked"}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 text-xs text-muted sm:grid-cols-3">
                  <p>Start: {formatDate(campaign.start_date)}</p>
                  <p>End: {formatDate(campaign.end_date)}</p>
                  <p>Created: {formatDate(campaign.created_at)}</p>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/client/campaigns/${campaign.id}`}
                    className="rounded-xl border border-border px-3 py-2 text-sm text-text hover:bg-surface-2"
                  >
                    View Details
                  </Link>
                  <ClientApproveCampaignButton
                    campaignId={campaign.id}
                    approvedAt={campaign.client_approved_at}
                    compact
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
