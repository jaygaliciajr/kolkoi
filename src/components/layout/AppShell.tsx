"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { PageTransition } from "@/components/motion/PageTransition";
import { PrefetchLink } from "@/components/nav/PrefetchLink";
import { RouteProgress } from "@/components/nav/RouteProgress";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { RouteToast } from "@/components/ui/RouteToast";
import type { ShellIcon, ShellNavItem, ShellNavSection, ShellViewerRole } from "@/components/layout/nav-config";
import { focusRing, transitionFast, transitionMed } from "@/lib/ui/tokens";

type AppShellProps = {
  appName: string;
  userEmail: string;
  contextLabel: string;
  viewerRole: ShellViewerRole;
  navSections: ShellNavSection[];
  mobileNavItems: ShellNavItem[];
  mobileNavigation: "drawer" | "bottom";
  logoutAction: () => Promise<void>;
  children: React.ReactNode;
};

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

function Icon({ name }: { name: ShellIcon }) {
  const common = "h-4 w-4";
  switch (name) {
    case "dashboard":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" />
        </svg>
      );
    case "campaigns":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
      );
    case "influencers":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "approvals":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      );
    case "proofs":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 19.5V4.5A1.5 1.5 0 0 1 5.5 3h13A1.5 1.5 0 0 1 20 4.5v15a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5z" />
          <path d="M8 14l2-2 3 3 3-4" />
        </svg>
      );
    case "payments":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        </svg>
      );
    case "reports":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 3v18h18" />
          <path d="M7 13l4-4 3 3 5-5" />
        </svg>
      );
    case "org":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 21h18" />
          <path d="M5 21V7l7-4 7 4v14" />
        </svg>
      );
    case "brands":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 7a2 2 0 0 1 2-2h12l2 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
          <path d="M4 9h16" />
        </svg>
      );
    case "inbox":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M22 12h-6l-2 3h-4l-2-3H2" />
          <path d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
        </svg>
      );
    case "requests":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 3v18" />
          <path d="m5 8 7-5 7 5" />
          <path d="m5 16 7 5 7-5" />
        </svg>
      );
    case "submissions":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
      );
    case "profile":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      );
    case "users":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="9" cy="7" r="3" />
          <circle cx="17" cy="9" r="2" />
          <path d="M3 20a6 6 0 0 1 12 0" />
          <path d="M15 20a4 4 0 0 1 6 0" />
        </svg>
      );
    case "activity":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 12h4l2-6 4 12 2-6h6" />
        </svg>
      );
    default:
      return null;
  }
}

function isRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function humanizeSegment(segment: string) {
  if (!segment) return "";
  if (/^[0-9a-f-]{8,}$/i.test(segment)) {
    return `${segment.slice(0, 8)}...`;
  }
  return segment
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function roleLabel(role: ShellViewerRole) {
  switch (role) {
    case "super_admin":
      return "Super Admin";
    case "client":
      return "Client";
    case "manager":
      return "Manager";
    case "influencer":
      return "Influencer";
    case "admin":
      return "Admin";
    case "staff":
      return "Staff";
    case "officer":
      return "Officer";
    case "creator":
      return "Creator";
    default:
      return "User";
  }
}

export function AppShell({
  appName,
  userEmail,
  contextLabel,
  viewerRole,
  navSections,
  mobileNavItems,
  mobileNavigation,
  logoutAction,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  const allNavItems = useMemo(() => navSections.flatMap((section) => section.items), [navSections]);

  const breadcrumbData = useMemo(() => {
    const navLookup = new Map(allNavItems.map((item) => [item.href, item.label]));
    const parts = pathname.split("/").filter(Boolean);
    const crumbs: Array<{ href: string; label: string }> = [];

    for (let index = 0; index < parts.length; index += 1) {
      const href = `/${parts.slice(0, index + 1).join("/")}`;
      const label = navLookup.get(href) ?? humanizeSegment(parts[index]);
      crumbs.push({ href, label });
    }

    const currentTitle = crumbs[crumbs.length - 1]?.label ?? "Overview";
    return { crumbs, currentTitle };
  }, [allNavItems, pathname]);

  useEffect(() => {
    const hotRoutes = allNavItems.slice(0, 6);
    for (const route of hotRoutes) {
      router.prefetch(route.href);
    }
  }, [allNavItems, router]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const desktopPadding = collapsed ? "lg:pl-[6.5rem]" : "lg:pl-[18.5rem]";
  const contentBottomPadding = mobileNavigation === "bottom" ? "pb-28 sm:pb-24" : "pb-12";
  const profileDestination = pathname.startsWith("/influencer")
    ? "/influencer/profile"
    : pathname.startsWith("/super-admin")
      ? "/super-admin/users"
      : pathname.startsWith("/client")
        ? "/client/dashboard"
        : pathname.startsWith("/manager")
          ? "/manager/select-org"
          : "/admin/select-org";

  const itemClass = (active: boolean) =>
    cx(
      "group relative flex items-center gap-3 rounded-[var(--radius-lg)] px-3 py-2.5 text-sm font-medium",
      transitionMed,
      active
        ? "bg-primary/14 text-primary"
        : "text-muted hover:bg-surface-2 hover:text-text",
    );

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] text-text">
      <RouteProgress />
      <RouteToast />

      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-border/80 bg-surface/80 backdrop-blur-xl lg:flex lg:flex-col",
          transitionMed,
          collapsed ? "w-[5.5rem]" : "w-[17.5rem]",
        )}
      >
        <div className="mb-5 flex items-center justify-between px-4 pt-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] bg-primary/15 text-primary">
              <Icon name="dashboard" />
            </span>
            {!collapsed ? <p className="text-lg font-semibold text-text">{appName}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((current) => !current)}
            className={cx(
              "inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-surface text-muted hover:text-text",
              transitionFast,
              focusRing,
            )}
            aria-label="Toggle sidebar width"
          >
            <svg viewBox="0 0 24 24" className={cx("h-4 w-4", transitionFast, collapsed && "rotate-180")} fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>

        <nav className="space-y-5 overflow-y-auto px-3 pb-4">
          {navSections.map((section) => (
            <div key={section.id}>
              {!collapsed ? (
                <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted/80">
                  {section.title}
                </p>
              ) : null}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = isRouteActive(pathname, item.href);
                  return (
                    <PrefetchLink
                      key={item.href}
                      href={item.href}
                      prefetchOnMount={item.prefetchOnMount ?? true}
                      className={itemClass(active)}
                    >
                      <span className="inline-flex h-4 w-4 items-center justify-center">
                        <Icon name={item.icon} />
                      </span>
                      {!collapsed ? <span>{item.label}</span> : null}
                    </PrefetchLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto px-3 pb-4">
          <div className="rounded-[var(--radius-xl)] border border-border bg-surface-2/70 p-3 text-xs text-muted">
            {collapsed ? <p className="text-center">K</p> : <p>{contextLabel}</p>}
          </div>
        </div>
      </aside>

      <AnimatePresence>
        {mobileNavigation === "drawer" && mobileMenuOpen ? (
          <motion.div
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.aside
              className="h-full w-[84%] max-w-[340px] border-r border-border bg-surface/95 p-4 shadow-[var(--shadow-elevated)]"
              initial={{ x: -28, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -22, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-5 flex items-center justify-between">
                <p className="text-base font-semibold text-text">{appName}</p>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cx("rounded-[var(--radius-sm)] border border-border px-2 py-1 text-sm text-muted", focusRing, transitionFast)}
                  aria-label="Close menu"
                >
                  Close
                </button>
              </div>

              <div className="space-y-5">
                {navSections.map((section) => (
                  <div key={`mobile-${section.id}`}>
                    <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted/80">
                      {section.title}
                    </p>
                    <div className="space-y-1">
                      {section.items.map((item) => {
                        const active = isRouteActive(pathname, item.href);
                        return (
                          <PrefetchLink
                            key={`mobile-${item.href}`}
                            href={item.href}
                            className={itemClass(active)}
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <span className="inline-flex h-4 w-4 items-center justify-center">
                              <Icon name={item.icon} />
                            </span>
                            <span>{item.label}</span>
                          </PrefetchLink>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className={cx("min-h-screen", desktopPadding, transitionMed)}>
        <header className="sticky top-0 z-30 border-b border-border/80 bg-surface/70 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            {mobileNavigation === "drawer" ? (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className={cx(
                  "inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] border border-border bg-surface text-muted hover:text-text lg:hidden",
                  focusRing,
                  transitionFast,
                )}
                aria-label="Open menu"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </button>
            ) : null}

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted/80">{contextLabel}</p>
              <h1 className="truncate text-lg font-semibold text-text sm:text-xl">{breadcrumbData.currentTitle}</h1>
              <nav aria-label="Breadcrumbs" className="mt-0.5 hidden items-center gap-1.5 text-xs text-muted sm:flex">
                {breadcrumbData.crumbs.map((crumb, index) => {
                  const isLast = index === breadcrumbData.crumbs.length - 1;
                  if (isLast) {
                    return (
                      <span key={crumb.href} className="text-text/80">
                        {crumb.label}
                      </span>
                    );
                  }

                  return (
                    <span key={crumb.href} className="inline-flex items-center gap-1.5">
                      <PrefetchLink href={crumb.href} className="hover:text-text">
                        {crumb.label}
                      </PrefetchLink>
                      <span>/</span>
                    </span>
                  );
                })}
              </nav>
            </div>

            <div className="hidden max-w-[360px] flex-1 md:block">
              <label className="relative block">
                <span className="pointer-events-none absolute inset-y-0 left-3 inline-flex items-center text-muted/80">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </span>
                <input
                  type="search"
                  placeholder="Search workspace"
                  className={cx(
                    "w-full rounded-[var(--radius-lg)] border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-text placeholder:text-muted",
                    "focus:outline-none focus:ring-2 focus:ring-primary/25",
                    transitionFast,
                  )}
                />
              </label>
            </div>

            <ThemeToggle compact={false} className="hidden sm:inline-flex" />
            <ThemeToggle compact className="sm:hidden" />

            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((current) => !current)}
                className={cx(
                  "inline-flex h-10 items-center gap-2 rounded-[var(--radius-lg)] border border-border bg-surface px-2.5 text-sm text-text",
                  "hover:bg-surface-2",
                  focusRing,
                  transitionFast,
                )}
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                aria-label="Open profile menu"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {(userEmail[0] ?? "U").toUpperCase()}
                </span>
                <span className="hidden max-w-44 truncate text-left md:block">
                  <span className="block text-sm font-semibold text-text">{userEmail}</span>
                  <span className="block text-xs text-muted">{roleLabel(viewerRole)}</span>
                </span>
                <svg
                  viewBox="0 0 24 24"
                  className={cx("h-4 w-4 text-muted", transitionFast, profileOpen && "rotate-180")}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              <AnimatePresence>
                {profileOpen ? (
                  <motion.div
                    key="profile-menu"
                    role="menu"
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                    className="absolute right-0 z-50 mt-2 w-64 rounded-[var(--radius-xl)] border border-border bg-surface p-2 shadow-[var(--shadow-elevated)]"
                  >
                    <div className="rounded-[var(--radius-md)] px-2 py-2">
                      <p className="truncate text-sm font-semibold text-text">{userEmail}</p>
                      <p className="text-xs text-muted">{contextLabel}</p>
                    </div>

                    <div className="my-1 h-px bg-border/80" />

                    <PrefetchLink
                      href={profileDestination}
                      onClick={() => setProfileOpen(false)}
                      className={cx(
                        "flex items-center gap-2 rounded-[var(--radius-md)] px-2 py-2 text-sm text-text hover:bg-surface-2",
                        transitionFast,
                      )}
                      role="menuitem"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 21a8 8 0 0 1 16 0" />
                      </svg>
                      Open Profile
                    </PrefetchLink>

                    <form action={logoutAction}>
                      <button
                        type="submit"
                        className={cx(
                          "mt-1 flex w-full items-center gap-2 rounded-[var(--radius-md)] px-2 py-2 text-left text-sm text-danger hover:bg-danger/10",
                          transitionFast,
                        )}
                        role="menuitem"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <path d="M16 17l5-5-5-5" />
                          <path d="M21 12H9" />
                        </svg>
                        Logout
                      </button>
                    </form>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className={cx("mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8", contentBottomPadding)}>
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      {mobileNavigation === "bottom" ? (
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface/90 px-2 py-2 backdrop-blur-xl lg:hidden">
          <div className="grid grid-cols-5 gap-1">
            {mobileNavItems.map((item) => {
              const active = isRouteActive(pathname, item.href);
              return (
                <PrefetchLink
                  key={`bottom-${item.href}`}
                  href={item.href}
                  className={cx(
                    "rounded-[var(--radius-md)] px-2 py-2 text-center text-xs font-medium",
                    transitionFast,
                    active ? "bg-primary/14 text-primary" : "text-muted",
                  )}
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
      ) : null}
    </div>
  );
}
