import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/getSessionUser";
import { getAppRole } from "@/lib/rbac/getAppRole";

export async function isSuperAdmin(): Promise<boolean> {
  return (await getAppRole()) === "superadmin";
}

export async function requireSuperAdmin() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const allowed = await isSuperAdmin();
  if (!allowed) {
    redirect("/manager/dashboard");
  }

  return user;
}
