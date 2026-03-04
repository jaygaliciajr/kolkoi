import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/super-admin/auth";

export const revalidate = 30;

type ActivityRow = {
  id: string;
  type: "submission" | "proof" | "payment";
  at: string;
  orgName: string;
  campaignTitle: string;
  influencerName: string;
  summary: string;
};

function toCurrency(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function SuperAdminActivityPage() {
  await requireSuperAdmin();

  const supabase = await createClient();
  const [submissionsRes, proofsRes, txRes] = await Promise.all([
    supabase
      .from("content_submissions")
      .select("id, org_id, assignment_id, submitted_at")
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false })
      .limit(50),
    supabase
      .from("post_proofs")
      .select("id, org_id, assignment_id, posted_at")
      .not("posted_at", "is", null)
      .order("posted_at", { ascending: false })
      .limit(50),
    supabase
      .from("payment_transactions")
      .select("id, org_id, assignment_id, amount, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const submissions = submissionsRes.data ?? [];
  const proofs = proofsRes.data ?? [];
  const transactions = txRes.data ?? [];

  const assignmentIds = Array.from(
    new Set([
      ...submissions.map((row) => row.assignment_id as string),
      ...proofs.map((row) => row.assignment_id as string),
      ...transactions.map((row) => row.assignment_id as string),
    ]),
  );

  const [assignmentsRes, orgsRes] = await Promise.all([
    assignmentIds.length
      ? supabase
          .from("campaign_assignments")
          .select("id, campaign_id, influencer_id")
          .in("id", assignmentIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    supabase.from("organizations").select("id, name"),
  ]);

  const assignments = assignmentsRes.data ?? [];
  const assignmentMap = new Map(assignments.map((row) => [row.id as string, row]));

  const campaignIds = Array.from(new Set(assignments.map((row) => row.campaign_id as string)));
  const influencerIds = Array.from(new Set(assignments.map((row) => row.influencer_id as string)));

  const [campaignsRes, influencersRes] = await Promise.all([
    campaignIds.length
      ? supabase.from("campaigns").select("id, title").in("id", campaignIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    influencerIds.length
      ? supabase.from("influencers").select("id, full_name").in("id", influencerIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ]);

  const orgMap = new Map((orgsRes.data ?? []).map((row) => [row.id as string, row.name as string]));
  const campaignMap = new Map((campaignsRes.data ?? []).map((row) => [row.id as string, row.title as string]));
  const influencerMap = new Map((influencersRes.data ?? []).map((row) => [row.id as string, row.full_name as string]));

  const activity: ActivityRow[] = [
    ...submissions.map((row) => {
      const assignment = assignmentMap.get(row.assignment_id as string);
      return {
        id: `sub-${row.id as string}`,
        type: "submission" as const,
        at: row.submitted_at as string,
        orgName: orgMap.get(row.org_id as string) ?? "Organization",
        campaignTitle: assignment ? campaignMap.get(assignment.campaign_id as string) ?? "Campaign" : "Campaign",
        influencerName: assignment ? influencerMap.get(assignment.influencer_id as string) ?? "Influencer" : "Influencer",
        summary: "Draft submitted",
      };
    }),
    ...proofs.map((row) => {
      const assignment = assignmentMap.get(row.assignment_id as string);
      return {
        id: `proof-${row.id as string}`,
        type: "proof" as const,
        at: row.posted_at as string,
        orgName: orgMap.get(row.org_id as string) ?? "Organization",
        campaignTitle: assignment ? campaignMap.get(assignment.campaign_id as string) ?? "Campaign" : "Campaign",
        influencerName: assignment ? influencerMap.get(assignment.influencer_id as string) ?? "Influencer" : "Influencer",
        summary: "Proof posted",
      };
    }),
    ...transactions.map((row) => {
      const assignment = assignmentMap.get(row.assignment_id as string);
      const amount = typeof row.amount === "number" ? row.amount : 0;
      return {
        id: `payment-${row.id as string}`,
        type: "payment" as const,
        at: row.created_at as string,
        orgName: orgMap.get(row.org_id as string) ?? "Organization",
        campaignTitle: assignment ? campaignMap.get(assignment.campaign_id as string) ?? "Campaign" : "Campaign",
        influencerName: assignment ? influencerMap.get(assignment.influencer_id as string) ?? "Influencer" : "Influencer",
        summary: `Payment recorded: PHP ${toCurrency(amount)}`,
      };
    }),
  ]
    .filter((row) => Boolean(row.at))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 50);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Global Activity Feed</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Latest 50 submissions, proofs, and payments across all organizations.</p>
      </div>

      <Card className="p-4" interactive={false}>
        {activity.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No activity found yet.</p>
        ) : (
          <div className="space-y-2">
            {activity.map((row) => (
              <article key={row.id} className="rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-900/70">
                <div className="flex items-center justify-between gap-3">
                  <StatusBadge status={row.type} />
                  <time className="text-xs text-slate-500 dark:text-slate-400">{new Date(row.at).toLocaleString()}</time>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">{row.summary}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {row.orgName} • {row.campaignTitle} • {row.influencerName}
                </p>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
