import { AppShell } from "@/components/layout/AppShell";
import { buildShellNavigation } from "@/components/layout/nav-config";
import { logoutAction } from "@/lib/auth/actions";
import { requireSuperAdmin } from "@/lib/super-admin/auth";

export default async function SuperAdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireSuperAdmin();
  const navigation = buildShellNavigation("super_admin", "super_admin");

  return (
    <AppShell
      appName="Kolkoi Platform"
      userEmail={user.email ?? "super-admin@kolkoi"}
      contextLabel="Super Admin Monitor"
      viewerRole="super_admin"
      logoutAction={logoutAction}
      navSections={navigation.sections}
      mobileNavItems={navigation.mobileItems}
      mobileNavigation={navigation.mobileNavigation}
    >
      {children}
    </AppShell>
  );
}
