import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CampaignInviteManager } from "@/components/admin/CampaignInviteManager";
import { removeCampaignInviteAction } from "@/lib/campaigns/assignmentActions";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getSelectedOrgId } from "@/lib/org/getSelectedOrgId";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;

function tagsToList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export default async function CampaignInvitePage(props: { params: Params }) {
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
    .eq("org_id", orgId);

  const deliverableCount = (deliverables ?? []).length;
  const earliestDueAt = (deliverables ?? [])
    .map((item) => (typeof item.due_at === "string" ? item.due_at : null))
    .filter((value): value is string => Boolean(value))
    .sort()[0];

  const { data: influencers } = await supabase
    .from("influencers")
    .select("*")
    .eq("org_id", orgId)
    .order("full_name", { ascending: true });

  const { data: invites } = await supabase
    .from("campaign_assignments")
    .select("*")
    .eq("campaign_id", id)
    .eq("org_id", orgId)
    .order("invited_at", { ascending: false });

  const inviteInfluencerIds = Array.from(new Set((invites ?? []).map((item) => item.influencer_id)));
  const { data: inviteInfluencers } = inviteInfluencerIds.length
    ? await supabase.from("influencers").select("id, full_name").in("id", inviteInfluencerIds)
    : { data: [] as { id: string; full_name: string }[] };
  const influencerNameMap = new Map(
    (inviteInfluencers ?? []).map((item) => [item.id as string, item.full_name as string]),
  );

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

      <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <p>
          Deliverables: <span className="font-medium">{deliverableCount}</span>
        </p>
        <p className="mt-1">
          Earliest due:{" "}
          <span className="font-medium">
            {earliestDueAt ? new Date(earliestDueAt).toLocaleString() : "-"}
          </span>
        </p>
      </section>

      <CampaignInviteManager
        campaignId={id}
        influencers={(influencers ?? []).map((item) => ({
          id: item.id as string,
          full_name: (item.full_name as string) ?? "Unnamed",
          tags: tagsToList(item.tags),
          ig_handle: (item.ig_handle as string | null) ?? null,
          fb_page_url: (item.fb_page_url as string | null) ?? null,
        }))}
      />

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-900">Current Invites</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Influencer</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Responded At</th>
                <th className="px-3 py-2">Decline Note</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {(invites ?? []).length === 0 ? (
                <tr>
                  <td className="px-3 py-5 text-center text-slate-500" colSpan={5}>
                    No invites yet.
                  </td>
                </tr>
              ) : (
                (invites ?? []).map((invite) => (
                  <tr key={invite.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-800">
                      {influencerNameMap.get(invite.influencer_id as string) ?? "Unknown"}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={invite.status as string | null} />
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {invite.responded_at
                        ? new Date(invite.responded_at as string).toLocaleString()
                        : "-"}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {(invite.decline_note as string | null) ?? "-"}
                    </td>
                    <td className="px-3 py-2">
                      <form action={removeCampaignInviteAction}>
                        <input type="hidden" name="campaign_id" value={id} />
                        <input type="hidden" name="assignment_id" value={invite.id as string} />
                        <button
                          type="submit"
                          className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                        >
                          Remove
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
