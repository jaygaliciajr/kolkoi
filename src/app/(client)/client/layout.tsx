import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { buildShellNavigation } from "@/components/layout/nav-config";
import { logoutAction } from "@/lib/auth/actions";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { getAppRole } from "@/lib/rbac/getAppRole";

export default async function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const appRole = await getAppRole();
  if (appRole !== "client") {
    redirect("/unauthorized");
  }

  const navigation = buildShellNavigation("client", "client");

  return (
    <AppShell
      appName="Kolkoi Client"
      userEmail={user.email ?? "client@kolkoi"}
      contextLabel="Brand Workspace"
      viewerRole="client"
      logoutAction={logoutAction}
      navSections={navigation.sections}
      mobileNavItems={navigation.mobileItems}
      mobileNavigation={navigation.mobileNavigation}
    >
      {children}
    </AppShell>
  );
}
