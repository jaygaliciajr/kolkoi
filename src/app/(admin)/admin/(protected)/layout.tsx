import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/getSessionUser";
import { ORG_COOKIE_NAME } from "@/lib/org/constants";
import { getMyOrgs } from "@/lib/org/getMyOrgs";
import { getAppRole } from "@/lib/rbac/getAppRole";
import { getMyRole } from "@/lib/rbac/getMyRole";

const ADMIN_ALLOWED_ROLES = new Set(["org_admin", "campaign_manager", "finance"]);

export default async function AdminProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const appRole = await getAppRole();
  if (appRole !== "manager") {
    redirect("/unauthorized");
  }

  const orgs = await getMyOrgs();
  if (orgs.length === 0) {
    redirect("/admin/create-org");
  }

  const cookieStore = await cookies();
  const selectedOrg = cookieStore.get(ORG_COOKIE_NAME)?.value;
  const hasValidSelectedOrg =
    typeof selectedOrg === "string" && orgs.some((membership) => membership.org_id === selectedOrg);

  if (orgs.length > 1 && !hasValidSelectedOrg) {
    redirect("/admin/select-org");
  }

  const role = orgs.length === 1 ? orgs[0].role : await getMyRole();
  if (!role) {
    redirect("/admin/select-org");
  }

  if (!ADMIN_ALLOWED_ROLES.has(role)) {
    redirect("/unauthorized");
  }

  return children;
}
