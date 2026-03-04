import { NextResponse } from "next/server";

import { isSuperAdmin } from "@/lib/super-admin/auth";

export async function requireSuperAdminApi() {
  const allowed = await isSuperAdmin();
  if (!allowed) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return null;
}

export function escapeCsv(value: string | number | null | undefined) {
  const str = value === null || value === undefined ? "" : String(value);
  if (str.includes(",") || str.includes("\n") || str.includes("\"")) {
    return `"${str.replaceAll("\"", "\"\"")}"`;
  }
  return str;
}
