import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { ORG_COOKIE_NAME } from "@/lib/org/constants";

type AppRole = "superadmin" | "client" | "manager" | "influencer";

function requiredEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing Supabase env var: ${name}`);
  }
  return value;
}

function isAppRole(value: unknown): value is AppRole {
  return value === "superadmin" || value === "client" || value === "manager" || value === "influencer";
}

function roleHomePath(role: AppRole | null): string {
  switch (role) {
    case "superadmin":
      return "/super-admin/dashboard";
    case "client":
      return "/client/dashboard";
    case "manager":
      return "/manager/dashboard";
    case "influencer":
      return "/influencer/campaigns";
    default:
      return "/login";
  }
}

async function resolveAppRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
): Promise<AppRole | null> {
  const roleFromRpcRes = await supabase.rpc("current_app_role");
  if (!roleFromRpcRes.error && isAppRole(roleFromRpcRes.data)) {
    return roleFromRpcRes.data;
  }

  const superAdminRes = await supabase.rpc("is_super_admin");
  if (!superAdminRes.error && superAdminRes.data === true) {
    return "superadmin";
  }

  const [clientRes, managerRes, influencerRes] = await Promise.all([
    supabase.from("clients").select("id").eq("user_id", userId).maybeSingle(),
    supabase.from("org_members").select("org_id").eq("user_id", userId).limit(1),
    supabase.from("influencers").select("id").eq("user_id", userId).limit(1),
  ]);

  if (clientRes.data) {
    return "client";
  }

  if ((managerRes.data ?? []).length > 0) {
    return "manager";
  }

  if ((influencerRes.data ?? []).length > 0) {
    return "influencer";
  }

  return null;
}

function applyCookieMutations(base: NextResponse, source: NextResponse) {
  for (const cookie of source.cookies.getAll()) {
    base.cookies.set(cookie);
  }
  return base;
}

function redirectWithCookies(request: NextRequest, source: NextResponse, pathname: string) {
  const url = new URL(pathname, request.url);
  return applyCookieMutations(NextResponse.redirect(url), source);
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response = NextResponse.next({ request });
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthPath = pathname === "/login" || pathname === "/register";

  const isManagerPath = pathname.startsWith("/manager") || pathname.startsWith("/admin");
  const isClientPath = pathname.startsWith("/client");
  const isInfluencerPath = pathname.startsWith("/influencer");
  const isSuperAdminPath = pathname.startsWith("/super-admin");
  const isProtectedPath = isManagerPath || isClientPath || isInfluencerPath || isSuperAdminPath;

  if (!user && isProtectedPath) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return applyCookieMutations(NextResponse.redirect(loginUrl), response);
  }

  let appRole: AppRole | null = null;
  if (user) {
    appRole = await resolveAppRole(supabase, user.id);
  }

  if (user && isAuthPath) {
    return redirectWithCookies(request, response, roleHomePath(appRole));
  }

  if (!user) {
    return response;
  }

  if (!appRole && isProtectedPath) {
    return redirectWithCookies(request, response, "/unauthorized");
  }

  if (isSuperAdminPath && appRole !== "superadmin") {
    return redirectWithCookies(request, response, roleHomePath(appRole));
  }

  if (isClientPath && appRole !== "client") {
    return redirectWithCookies(request, response, roleHomePath(appRole));
  }

  if (isInfluencerPath && appRole !== "influencer") {
    return redirectWithCookies(request, response, roleHomePath(appRole));
  }

  if (isManagerPath && appRole !== "manager") {
    return redirectWithCookies(request, response, roleHomePath(appRole));
  }

  if (appRole === "manager" && pathname.startsWith("/admin")) {
    const managerPath = pathname === "/admin" ? "/manager/dashboard" : pathname.replace("/admin", "/manager");
    const target = `${managerPath}${request.nextUrl.search}`;
    return redirectWithCookies(request, response, target);
  }

  if (appRole === "manager") {
    const managerPathname = pathname.startsWith("/manager") ? pathname : pathname.replace("/admin", "/manager");

    const { data: memberships, error: membershipsError } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id);

    if (!membershipsError) {
      const orgIds = (memberships ?? [])
        .map((entry) => entry.org_id as string)
        .filter(Boolean);
      const selectedOrg = request.cookies.get(ORG_COOKIE_NAME)?.value;
      const hasValidSelectedOrg =
        typeof selectedOrg === "string" && orgIds.includes(selectedOrg);

      if (orgIds.length === 0) {
        if (managerPathname !== "/manager/create-org") {
          return redirectWithCookies(request, response, "/manager/create-org");
        }
      } else if (orgIds.length === 1) {
        if (selectedOrg !== orgIds[0]) {
          request.cookies.set(ORG_COOKIE_NAME, orgIds[0]);
          response.cookies.set(ORG_COOKIE_NAME, orgIds[0], {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 24 * 30,
          });
        }

        if (managerPathname === "/manager/select-org" || managerPathname === "/manager/create-org") {
          return redirectWithCookies(request, response, "/manager/dashboard");
        }
      } else if (!hasValidSelectedOrg && managerPathname !== "/manager/select-org") {
        return redirectWithCookies(request, response, "/manager/select-org");
      }
    }

    if (pathname.startsWith("/manager")) {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = pathname === "/manager" ? "/admin/dashboard" : pathname.replace("/manager", "/admin");
      const rewritten = NextResponse.rewrite(rewriteUrl);
      return applyCookieMutations(rewritten, response);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
