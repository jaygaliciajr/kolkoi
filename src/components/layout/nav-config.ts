export type ShellIcon =
  | "dashboard"
  | "org"
  | "brands"
  | "influencers"
  | "campaigns"
  | "approvals"
  | "proofs"
  | "payments"
  | "reports"
  | "inbox"
  | "submissions"
  | "profile"
  | "users"
  | "activity"
  | "requests";

export type ShellContext = "admin" | "manager" | "client" | "super_admin" | "influencer";
export type ShellViewerRole =
  | "super_admin"
  | "admin"
  | "staff"
  | "officer"
  | "creator"
  | "manager"
  | "client"
  | "influencer";

export type ShellNavItem = {
  href: string;
  label: string;
  icon: ShellIcon;
  roles?: ShellViewerRole[];
  prefetchOnMount?: boolean;
};

export type ShellNavSection = {
  id: string;
  title: string;
  items: ShellNavItem[];
};

type NavigationResult = {
  sections: ShellNavSection[];
  mobileItems: ShellNavItem[];
  mobileNavigation: "drawer" | "bottom";
};

const ADMIN_SECTIONS: ShellNavSection[] = [
  {
    id: "general",
    title: "General",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: "dashboard", roles: ["admin", "staff", "officer"] },
      { href: "/admin/select-org", label: "Select Org", icon: "org", roles: ["admin", "staff", "officer"] },
    ],
  },
  {
    id: "operations",
    title: "Operations",
    items: [
      { href: "/admin/influencers", label: "Influencers", icon: "influencers", roles: ["admin", "staff"] },
      { href: "/admin/campaigns", label: "Campaigns", icon: "campaigns", roles: ["admin", "staff"] },
      { href: "/admin/approvals", label: "Approvals", icon: "approvals", roles: ["admin", "staff"] },
      { href: "/admin/proofs", label: "Proofs", icon: "proofs", roles: ["admin", "staff"] },
    ],
  },
  {
    id: "finance",
    title: "Finance",
    items: [
      { href: "/admin/payments", label: "Payments", icon: "payments", roles: ["admin", "officer"] },
      { href: "/admin/reports", label: "Reports", icon: "reports", roles: ["admin", "staff", "officer"] },
    ],
  },
];

const MANAGER_SECTIONS: ShellNavSection[] = [
  {
    id: "general",
    title: "General",
    items: [
      { href: "/manager/dashboard", label: "Dashboard", icon: "dashboard", roles: ["manager"] },
      { href: "/manager/select-org", label: "Select Org", icon: "org", roles: ["manager"] },
    ],
  },
  {
    id: "operations",
    title: "Operations",
    items: [
      { href: "/manager/influencers", label: "Influencers", icon: "influencers", roles: ["manager"] },
      { href: "/manager/campaigns", label: "Campaigns", icon: "campaigns", roles: ["manager"] },
      { href: "/manager/approvals", label: "Approvals", icon: "approvals", roles: ["manager"] },
      { href: "/manager/proofs", label: "Proofs", icon: "proofs", roles: ["manager"] },
    ],
  },
  {
    id: "finance",
    title: "Payouts",
    items: [
      { href: "/manager/payments", label: "Payments", icon: "payments", roles: ["manager"] },
      { href: "/manager/reports", label: "Reports", icon: "reports", roles: ["manager"] },
    ],
  },
];

const CLIENT_SECTIONS: ShellNavSection[] = [
  {
    id: "workspace",
    title: "Workspace",
    items: [
      { href: "/client/dashboard", label: "Dashboard", icon: "dashboard", roles: ["client"] },
      { href: "/client/brands", label: "Brands", icon: "brands", roles: ["client"] },
      { href: "/client/campaigns", label: "Campaigns", icon: "campaigns", roles: ["client"] },
      { href: "/client/requests", label: "Change Requests", icon: "requests", roles: ["client"] },
      { href: "/client/reports", label: "Reports", icon: "reports", roles: ["client"] },
    ],
  },
];

const SUPER_ADMIN_SECTIONS: ShellNavSection[] = [
  {
    id: "monitoring",
    title: "Monitoring",
    items: [
      { href: "/super-admin/dashboard", label: "Dashboard", icon: "dashboard", roles: ["super_admin"] },
      { href: "/super-admin/organizations", label: "Organizations", icon: "org", roles: ["super_admin"] },
      { href: "/super-admin/users", label: "Users", icon: "users", roles: ["super_admin"] },
      { href: "/super-admin/activity", label: "Activity", icon: "activity", roles: ["super_admin"] },
    ],
  },
  {
    id: "intelligence",
    title: "Intelligence",
    items: [{ href: "/super-admin/reports", label: "Reports", icon: "reports", roles: ["super_admin"] }],
  },
];

const INFLUENCER_SECTIONS: ShellNavSection[] = [
  {
    id: "workspace",
    title: "Workspace",
    items: [
      { href: "/influencer/campaigns", label: "Dashboard", icon: "dashboard", roles: ["creator", "influencer"] },
      { href: "/influencer/inbox", label: "Inbox", icon: "inbox", roles: ["creator", "influencer"] },
      { href: "/influencer/submissions", label: "Submissions", icon: "submissions", roles: ["creator", "influencer"] },
      { href: "/influencer/proofs", label: "Proofs", icon: "proofs", roles: ["creator", "influencer"] },
      { href: "/influencer/payments", label: "Payments", icon: "payments", roles: ["creator", "influencer"] },
      { href: "/influencer/profile", label: "Profile", icon: "profile", roles: ["creator", "influencer"] },
    ],
  },
];

function roleAllowed(item: ShellNavItem, viewerRole: ShellViewerRole) {
  if (!item.roles || item.roles.length === 0) {
    return true;
  }
  return item.roles.includes(viewerRole);
}

function filterSections(sections: ShellNavSection[], viewerRole: ShellViewerRole) {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => roleAllowed(item, viewerRole)),
    }))
    .filter((section) => section.items.length > 0);
}

export function mapOrgRoleToViewerRole(role: string | null | undefined): ShellViewerRole {
  if (role === "finance") return "officer";
  if (role === "campaign_manager") return "staff";
  if (role === "org_admin") return "admin";
  if (role === "manager") return "manager";
  if (role === "client") return "client";
  if (role === "influencer") return "influencer";
  return "manager";
}

export function buildShellNavigation(
  context: ShellContext,
  viewerRole: ShellViewerRole,
): NavigationResult {
  const base =
    context === "super_admin"
      ? SUPER_ADMIN_SECTIONS
      : context === "client"
        ? CLIENT_SECTIONS
        : context === "manager"
          ? MANAGER_SECTIONS
      : context === "influencer"
        ? INFLUENCER_SECTIONS
        : ADMIN_SECTIONS;

  const sections = filterSections(base, viewerRole);
  const flatItems = sections.flatMap((section) => section.items);

  if (context === "influencer") {
    const mobileItems = [
      flatItems.find((item) => item.href === "/influencer/campaigns"),
      flatItems.find((item) => item.href === "/influencer/inbox"),
      flatItems.find((item) => item.href === "/influencer/submissions"),
      flatItems.find((item) => item.href === "/influencer/proofs"),
      flatItems.find((item) => item.href === "/influencer/profile"),
    ].filter((item): item is ShellNavItem => Boolean(item));

    return {
      sections,
      mobileItems,
      mobileNavigation: "bottom",
    };
  }

  return {
    sections,
    mobileItems: flatItems.slice(0, 6),
    mobileNavigation: "drawer",
  };
}
