import { cookies } from "next/headers";

import { getSessionUser } from "@/lib/auth/getSessionUser";
import { ORG_COOKIE_NAME } from "@/lib/org/constants";
import { createClient } from "@/lib/supabase/server";

export async function getSelectedOrgId() {
  const user = await getSessionUser();
  if (!user) {
    return null;
  }

  const cookieStore = await cookies();
  const orgId = cookieStore.get(ORG_COOKIE_NAME)?.value;
  if (!orgId) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return orgId;
}
