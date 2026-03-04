import { getSessionUser } from "@/lib/auth/getSessionUser";
import { createClient } from "@/lib/supabase/server";

export type OrgMembership = {
  org_id: string;
  role: string | null;
};

export async function getMyOrgs(): Promise<OrgMembership[]> {
  const user = await getSessionUser();
  if (!user) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("org_members")
    .select("*")
    .eq("user_id", user.id);

  if (error || !data) {
    return [];
  }

  return data.map((membership) => ({
    org_id: membership.org_id as string,
    role:
      (typeof membership.role === "string" ? membership.role : null) ??
      (typeof membership.role_type === "string" ? membership.role_type : null),
  }));
}
