import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/super-admin/auth";

type SearchParams = Promise<{ q?: string }>;

export const revalidate = 60;

type UserRow = {
  userId: string;
  roles: string[];
  orgCount: number;
  orgIds: string[];
  influencerLinked: boolean;
  influencerNames: string[];
};

export default async function SuperAdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  await requireSuperAdmin();
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();

  const supabase = await createClient();
  const [membersRes, influencersRes] = await Promise.all([
    supabase.from("org_members").select("user_id, org_id, role, role_type"),
    supabase.from("influencers").select("id, user_id, full_name, org_id").not("user_id", "is", null),
  ]);

  const directory = new Map<string, UserRow>();

  for (const member of membersRes.data ?? []) {
    const userId = member.user_id as string;
    const orgId = member.org_id as string;
    const role =
      (typeof member.role === "string" ? member.role : null) ??
      (typeof member.role_type === "string" ? member.role_type : null) ??
      "member";

    const current = directory.get(userId) ?? {
      userId,
      roles: [],
      orgCount: 0,
      orgIds: [],
      influencerLinked: false,
      influencerNames: [],
    };

    if (!current.roles.includes(role)) {
      current.roles.push(role);
    }
    if (!current.orgIds.includes(orgId)) {
      current.orgIds.push(orgId);
      current.orgCount += 1;
    }

    directory.set(userId, current);
  }

  for (const influencer of influencersRes.data ?? []) {
    const userId = influencer.user_id as string;
    if (!userId) continue;

    const current = directory.get(userId) ?? {
      userId,
      roles: [],
      orgCount: 0,
      orgIds: [],
      influencerLinked: false,
      influencerNames: [],
    };

    current.influencerLinked = true;
    if (typeof influencer.full_name === "string" && influencer.full_name.length > 0) {
      current.influencerNames.push(influencer.full_name);
    }

    const orgId = influencer.org_id as string;
    if (orgId && !current.orgIds.includes(orgId)) {
      current.orgIds.push(orgId);
      current.orgCount += 1;
    }

    directory.set(userId, current);
  }

  const rows = Array.from(directory.values())
    .filter((row) => (q.length > 0 ? row.userId.toLowerCase().includes(q) : true))
    .sort((a, b) => a.userId.localeCompare(b.userId));

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Users Directory</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Derived from org memberships and linked influencer records (read-only).</p>
      </div>

      <Card className="p-4" interactive={false}>
        <form className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Input
            id="q"
            name="q"
            label="Search by user ID"
            placeholder="Paste full or partial user UUID"
            defaultValue={q}
            helperText="Email is not included unless you add user_profiles in your schema."
          />
          <button
            type="submit"
            className="self-end rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Apply
          </button>
        </form>
      </Card>

      {rows.length === 0 ? (
        <EmptyState title="No users found" description="Try a different user_id filter." />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {rows.map((row) => (
              <Card key={row.userId} className="p-4" interactive={false}>
                <p className="font-mono text-xs text-slate-700 dark:text-slate-300">{row.userId}</p>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <dt className="text-slate-500 dark:text-slate-400">Roles</dt>
                  <dd className="text-slate-700 dark:text-slate-200">{row.roles.join(", ") || "-"}</dd>
                  <dt className="text-slate-500 dark:text-slate-400">Org count</dt>
                  <dd className="text-slate-700 dark:text-slate-200">{row.orgCount}</dd>
                  <dt className="text-slate-500 dark:text-slate-400">Linked influencer</dt>
                  <dd className="text-slate-700 dark:text-slate-200">{row.influencerLinked ? "Yes" : "No"}</dd>
                </dl>
              </Card>
            ))}
          </div>

          <Card className="hidden overflow-x-auto p-0 md:block" interactive={false}>
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">User ID</th>
                  <th className="px-4 py-3">Roles</th>
                  <th className="px-4 py-3">Org Count</th>
                  <th className="px-4 py-3">Linked Influencer</th>
                  <th className="px-4 py-3">Influencer Names</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.userId} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">{row.userId}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{row.roles.join(", ") || "-"}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{row.orgCount}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{row.influencerLinked ? "Yes" : "No"}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{row.influencerNames.join(", ") || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
