import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/getSessionUser";
import { selectOrgAction } from "@/lib/org/actions";
import { getMyOrgs } from "@/lib/org/getMyOrgs";

export default async function SelectOrgPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const orgs = await getMyOrgs();

  if (orgs.length === 0) {
    redirect("/admin/create-org");
  }

  if (orgs.length === 1) {
    redirect("/admin/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Select organization</h1>
        <p className="mt-2 text-sm text-slate-600">
          Choose the organization to use in the admin portal.
        </p>

        <div className="mt-6 space-y-3">
          {orgs.map((membership) => (
            <form key={membership.org_id} action={selectOrgAction}>
              <input type="hidden" name="org_id" value={membership.org_id} />
              <button
                type="submit"
                className="flex w-full items-center justify-between rounded-md border border-slate-200 px-4 py-3 text-left hover:bg-slate-50"
              >
                <span className="text-sm font-medium text-slate-900">
                  Org ID: {membership.org_id}
                </span>
                <span className="text-xs uppercase text-slate-500">
                  {membership.role ?? "member"}
                </span>
              </button>
            </form>
          ))}
        </div>
      </section>
    </main>
  );
}
