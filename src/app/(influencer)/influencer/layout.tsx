import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { logoutAction } from "@/lib/auth/actions";
import { getSessionUser } from "@/lib/auth/getSessionUser";

export default async function InfluencerLayout({
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
      appName="Kolkoi Influencer"
      userEmail={user.email ?? "influencer@kolkoi"}
      contextLabel="Influencer Workspace"
      logoutAction={logoutAction}
      navItems={[
        { href: "/influencer/campaigns", label: "Dashboard", icon: "dashboard" },
        { href: "/influencer/inbox", label: "Inbox", icon: "inbox" },
        { href: "/influencer/submissions", label: "Submissions", icon: "submissions" },
        { href: "/influencer/proofs", label: "Proofs", icon: "proofs" },
        { href: "/influencer/payments", label: "Payments", icon: "payments" },
        { href: "/influencer/profile", label: "Profile", icon: "profile" },
      ]}
    >
      {children}
    </AppShell>
  );
}
