import { getSessionUser } from "@/lib/auth/getSessionUser";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentInfluencer() {
  const user = await getSessionUser();
  if (!user) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("influencers")
    .select("*")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}
