import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { ORG_COOKIE_NAME } from "@/lib/org/constants";

function requiredEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing Supabase env var: ${name}`);
  }
  return value;
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });
  const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response = NextResponse.next({
            request,
          });
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtectedPath =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/influencer") ||
    pathname.startsWith("/super-admin");
  const isAuthPath = pathname === "/login" || pathname === "/register";
  const isAdminPath = pathname.startsWith("/admin");
  const isSuperAdminPath = pathname.startsWith("/super-admin");

  let superAdmin = false;
  if (user) {
    const { data } = await supabase.rpc("is_super_admin");
    superAdmin = data === true;
  }

  if (!user && isProtectedPath) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isSuperAdminPath && !superAdmin) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  if (user && superAdmin && isAdminPath) {
    return NextResponse.redirect(new URL("/super-admin/dashboard", request.url));
  }

  if (user && isAuthPath) {
    return NextResponse.redirect(new URL(superAdmin ? "/super-admin/dashboard" : "/admin/dashboard", request.url));
  }

  if (user && isAdminPath) {
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
        if (pathname !== "/admin/create-org") {
          return NextResponse.redirect(new URL("/admin/create-org", request.url));
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

        if (pathname === "/admin/select-org" || pathname === "/admin/create-org") {
          return NextResponse.redirect(new URL("/admin/dashboard", request.url));
        }
      } else if (!hasValidSelectedOrg && pathname !== "/admin/select-org") {
        return NextResponse.redirect(new URL("/admin/select-org", request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
