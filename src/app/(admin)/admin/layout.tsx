import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { buildShellNavigation } from "@/components/layout/nav-config";
import { logoutAction } from "@/lib/auth/actions";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { getAppRole } from "@/lib/rbac/getAppRole";

export default async function AdminLayout({
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

  const navigation = buildShellNavigation("manager", "manager");

  return (
    <AppShell
      appName="Kolkoi Manager"
      userEmail={user.email ?? "manager@kolkoi"}
      contextLabel="Manager Workspace"
      viewerRole="manager"
      logoutAction={logoutAction}
      navSections={navigation.sections}
      mobileNavItems={navigation.mobileItems}
      mobileNavigation={navigation.mobileNavigation}
    >
      {children}
    </AppShell>
  );
}
