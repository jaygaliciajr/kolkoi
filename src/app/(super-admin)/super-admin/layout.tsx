import { AppShell } from "@/components/layout/AppShell";
import { logoutAction } from "@/lib/auth/actions";
import { requireSuperAdmin } from "@/lib/super-admin/auth";

export default async function SuperAdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireSuperAdmin();

  return (
    <AppShell
      appName="Kolkoi Platform"
      userEmail={user.email ?? "super-admin@kolkoi"}
      contextLabel="Super Admin Monitor"
      logoutAction={logoutAction}
      navItems={[
        { href: "/super-admin/dashboard", label: "Dashboard", icon: "dashboard" },
        { href: "/super-admin/organizations", label: "Organizations", icon: "org" },
        { href: "/super-admin/users", label: "Users", icon: "users" },
        { href: "/super-admin/activity", label: "Activity", icon: "activity" },
        { href: "/super-admin/reports", label: "Reports", icon: "reports" },
      ]}
    >
      {children}
    </AppShell>
  );
}
