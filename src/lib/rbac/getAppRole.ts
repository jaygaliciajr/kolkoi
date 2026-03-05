import { getSessionUser } from "@/lib/auth/getSessionUser";
import { createClient } from "@/lib/supabase/server";

export type AppRole = "superadmin" | "client" | "manager" | "influencer";

function isAppRole(value: unknown): value is AppRole {
  return value === "superadmin" || value === "client" || value === "manager" || value === "influencer";
}

async function resolveLegacyRole(userId: string): Promise<AppRole | null> {
  const supabase = await createClient();

  const { data: isSuperAdminValue, error: superAdminError } = await supabase.rpc("is_super_admin");
  if (!superAdminError && isSuperAdminValue === true) {
    return "superadmin";
  }

  const [{ data: clientMembership }, { data: managerMembership }, { data: influencerMembership }] = await Promise.all([
    supabase.from("clients").select("id").eq("user_id", userId).maybeSingle(),
    supabase.from("org_members").select("org_id").eq("user_id", userId).limit(1),
    supabase.from("influencers").select("id").eq("user_id", userId).limit(1),
  ]);

  if (clientMembership) {
    return "client";
  }
  if ((managerMembership ?? []).length > 0) {
    return "manager";
  }
  if ((influencerMembership ?? []).length > 0) {
    return "influencer";
  }

  return null;
}

export async function getAppRole(): Promise<AppRole | null> {
  const user = await getSessionUser();
  if (!user) {
    return null;
  }

  const supabase = await createClient();
  const { data: roleFromRpc, error } = await supabase.rpc("current_app_role");

  if (!error && isAppRole(roleFromRpc)) {
    return roleFromRpc;
  }

  return resolveLegacyRole(user.id);
}

export function roleHomePath(role: AppRole): string {
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
