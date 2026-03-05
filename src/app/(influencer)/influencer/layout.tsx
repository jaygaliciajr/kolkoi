import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { buildShellNavigation } from "@/components/layout/nav-config";
import { logoutAction } from "@/lib/auth/actions";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { getAppRole } from "@/lib/rbac/getAppRole";

export default async function InfluencerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const appRole = await getAppRole();
  if (appRole !== "influencer") {
    redirect("/unauthorized");
  }

  const navigation = buildShellNavigation("influencer", "influencer");

  return (
    <AppShell
      appName="Kolkoi Influencer"
      userEmail={user.email ?? "influencer@kolkoi"}
      contextLabel="Influencer Workspace"
      viewerRole="influencer"
      logoutAction={logoutAction}
      navSections={navigation.sections}
      mobileNavItems={navigation.mobileItems}
      mobileNavigation={navigation.mobileNavigation}
    >
      {children}
    </AppShell>
  );
}
