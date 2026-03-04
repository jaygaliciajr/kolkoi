"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PageTransition } from "@/components/motion/PageTransition";
import { PrefetchLink } from "@/components/nav/PrefetchLink";
import { RouteProgress } from "@/components/nav/RouteProgress";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { RouteToast } from "@/components/ui/RouteToast";

type NavItem = {
  href: string;
  label: string;
  icon:
    | "dashboard"
    | "org"
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
    | "activity";
};

type AppShellProps = {
  appName: string;
  userEmail: string;
  contextLabel: string;
  navItems: NavItem[];
  logoutAction: () => Promise<void>;
  children: React.ReactNode;
};

function Icon({ name }: { name: NavItem["icon"] }) {
  const common = "h-4 w-4";
  switch (name) {
    case "dashboard":
      return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" /></svg>;
    case "campaigns":
      return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6h16M4 12h16M4 18h10" /></svg>;
    case "influencers":
      return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case "approvals":
      return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
    case "proofs":
      return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19.5V4.5A1.5 1.5 0 0 1 5.5 3h13A1.5 1.5 0 0 1 20 4.5v15a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5z"/><path d="M8 14l2-2 3 3 3-4"/></svg>;
    case "payments":
      return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>;
    case "reports":
      return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3v18h18"/><path d="M7 13l4-4 3 3 5-5"/></svg>;
    case "org":
      return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/></svg>;
    case "inbox":
      return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/></svg>;
    case "submissions":
      return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>;
    case "profile":
      return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>;
    case "users":
      return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="7" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M15 20a4 4 0 0 1 6 0"/></svg>;
    case "activity":
      return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 12h4l2-6 4 12 2-6h6"/></svg>;
    default:
      return null;
  }
}

export function AppShell({ appName, userEmail, contextLabel, navItems, logoutAction, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const mainPadding = useMemo(() => (collapsed ? "lg:pl-28" : "lg:pl-72"), [collapsed]);

  useEffect(() => {
    const hotRoutes = pathname.startsWith("/super-admin")
      ? [
          "/super-admin/dashboard",
          "/super-admin/organizations",
          "/super-admin/users",
          "/super-admin/activity",
          "/super-admin/reports",
        ]
      : pathname.startsWith("/admin")
        ? [
            "/admin/dashboard",
            "/admin/campaigns",
            "/admin/approvals",
            "/admin/proofs",
            "/admin/payments",
          ]
        : [];

    for (const route of hotRoutes) {
      router.prefetch(route);
    }
  }, [pathname, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-indigo-50/40 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <RouteProgress />
      <RouteToast />
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-white/70 bg-white/70 p-4 backdrop-blur-md transition-all duration-200 ease-in-out dark:border-slate-800 dark:bg-slate-900/70 lg:flex lg:flex-col ${collapsed ? "w-24" : "w-72"}`}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              <Icon name="dashboard" />
            </span>
            {!collapsed ? <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{appName}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition-all duration-200 ease-in-out hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Toggle sidebar"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <PrefetchLink
                key={item.href}
                href={item.href}
                prefetchOnMount
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-in-out ${
                  active
                    ? "bg-indigo-100 text-indigo-700 shadow-sm dark:bg-indigo-950 dark:text-indigo-300"
                    : "text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                }`}
              >
                <Icon name={item.icon} />
                {!collapsed ? <span>{item.label}</span> : null}
              </PrefetchLink>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl border border-white/80 bg-white/80 p-3 text-xs text-slate-500 shadow-lg shadow-slate-200/30 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:shadow-none">
          {!collapsed ? <p>{contextLabel}</p> : <p className="text-center">K</p>}
        </div>
      </aside>

      <div className={`min-h-screen transition-all duration-200 ease-in-out ${mainPadding}`}>
        <header className="sticky top-0 z-30 border-b border-white/80 bg-white/65 px-4 py-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/65 sm:px-6">
          <div className="mx-auto flex max-w-[1400px] items-center gap-3">
            <div className="flex-1">
              <label className="relative block">
                <span className="pointer-events-none absolute inset-y-0 left-3 inline-flex items-center text-slate-400">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </span>
                <input
                  type="search"
                  placeholder="Search campaigns, influencers, payments..."
                  className="w-full rounded-xl border border-slate-200 bg-white/80 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition-all duration-200 ease-in-out placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-indigo-700 dark:focus:ring-indigo-900/40"
                />
              </label>
            </div>

            <ThemeToggle />

            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all duration-200 ease-in-out hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Notifications"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5"/><path d="M9 17a3 3 0 0 0 6 0"/></svg>
            </button>

            <div className="hidden rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-right dark:border-slate-700 dark:bg-slate-900 sm:block">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{userEmail}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{contextLabel}</p>
            </div>

            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-all duration-200 ease-in-out hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                Logout
              </button>
            </form>
          </div>
        </header>

        <main className="mx-auto max-w-[1400px] space-y-6 p-4 pb-24 sm:p-6 lg:p-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/85 px-2 py-2 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/85 lg:hidden">
        <div className="grid grid-cols-4 gap-1">
          {navItems.slice(0, 4).map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <PrefetchLink
                key={item.href}
                href={item.href}
                prefetchOnMount
                className={`rounded-lg px-2 py-2 text-center text-xs font-medium transition-all duration-200 ease-in-out ${
                  active
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                    : "text-slate-600 dark:text-slate-300"
                }`}
              >
                <span className="mb-1 inline-flex items-center justify-center">
                  <Icon name={item.icon} />
                </span>
                <span className="block truncate">{item.label}</span>
              </PrefetchLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
