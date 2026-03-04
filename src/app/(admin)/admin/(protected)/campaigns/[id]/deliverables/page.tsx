import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DeliverablesManager } from "@/components/admin/DeliverablesManager";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getSelectedOrgId } from "@/lib/org/getSelectedOrgId";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;

export default async function CampaignDeliverablesPage(props: { params: Params }) {
  const orgId = await getSelectedOrgId();
  if (!orgId) {
    redirect("/admin/select-org");
  }

  const { id } = await props.params;
  const supabase = await createClient();

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle();

  if (campaignError || !campaign) {
    notFound();
  }

  const { data: deliverables } = await supabase
    .from("campaign_deliverables")
    .select("*")
    .eq("campaign_id", id)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{campaign.title}</h1>
          <div className="mt-2">
            <StatusBadge status={campaign.status as string | null} />
          </div>
        </div>
        <Link
          href={`/admin/campaigns/${id}`}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          Back to campaign
        </Link>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link
            href={`/admin/campaigns/${id}`}
            className="rounded-md border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-100"
          >
            Overview
          </Link>
          <span className="rounded-md bg-slate-100 px-3 py-1 font-medium text-slate-800">
            Deliverables
          </span>
          <Link
            href={`/admin/campaigns/${id}/invite`}
            className="rounded-md border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-100"
          >
            Invites
          </Link>
        </div>
      </section>

      <DeliverablesManager
        campaignId={id}
        deliverables={(deliverables ?? []).map((deliverable) => ({
          id: deliverable.id as string,
          platform: (deliverable.platform as string | null) ?? null,
          required_post_count: (deliverable.required_post_count as number | null) ?? null,
          required_hashtags: (deliverable.required_hashtags as string[] | null) ?? null,
          talking_points: (deliverable.talking_points as string[] | null) ?? null,
          due_at: (deliverable.due_at as string | null) ?? null,
          payout_amount: (deliverable.payout_amount as number | null) ?? null,
        }))}
      />
    </div>
  );
}
