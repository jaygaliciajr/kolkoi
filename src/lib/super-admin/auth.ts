import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/getSessionUser";
import { createClient } from "@/lib/supabase/server";

export async function isSuperAdmin(): Promise<boolean> {
  const user = await getSessionUser();
  if (!user) {
    return false;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_super_admin");

  if (error) {
    return false;
  }

  return data === true;
}

export async function requireSuperAdmin() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const allowed = await isSuperAdmin();
  if (!allowed) {
    redirect("/admin/dashboard");
  }

  return user;
}
