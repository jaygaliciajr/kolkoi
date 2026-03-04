import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CampaignEditor } from "@/components/admin/CampaignEditor";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { NextActionPanel } from "@/components/ui/NextActionPanel";
import { getSelectedOrgId } from "@/lib/org/getSelectedOrgId";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;

export default async function CampaignDetailPage(props: { params: Params }) {
  const orgId = await getSelectedOrgId();
  if (!orgId) {
    redirect("/admin/select-org");
  }

  const { id } = await props.params;
  const supabase = await createClient();
  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle();

  if (error || !campaign) {
    notFound();
  }

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
    </div>
  );
}
