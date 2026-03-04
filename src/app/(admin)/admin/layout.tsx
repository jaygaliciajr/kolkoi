import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { logoutAction } from "@/lib/auth/actions";
import { getSessionUser } from "@/lib/auth/getSessionUser";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell
      appName="Kolkoi Admin"
      userEmail={user.email ?? "admin@kolkoi"}
      contextLabel="Admin Workspace"
      logoutAction={logoutAction}
      navItems={[
        { href: "/admin/dashboard", label: "Dashboard", icon: "dashboard" },
        { href: "/admin/select-org", label: "Select Org", icon: "org" },
        { href: "/admin/influencers", label: "Influencers", icon: "influencers" },
        { href: "/admin/campaigns", label: "Campaigns", icon: "campaigns" },
        { href: "/admin/approvals", label: "Approvals", icon: "approvals" },
        { href: "/admin/proofs", label: "Proofs", icon: "proofs" },
        { href: "/admin/payments", label: "Payments", icon: "payments" },
        { href: "/admin/reports", label: "Reports", icon: "reports" },
      ]}
    >
      {children}
    </AppShell>
  );
}
