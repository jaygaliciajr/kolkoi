
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/getSessionUser";
import { type CreateOrgActionState } from "@/lib/org/action-state";
import { ORG_COOKIE_NAME } from "@/lib/org/constants";
import { createClient } from "@/lib/supabase/server";

export async function selectOrgAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const orgId = formData.get("org_id");
  if (typeof orgId !== "string" || orgId.length === 0) {
    redirect("/admin/select-org");
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .maybeSingle();

  if (!data) {
    redirect("/admin/select-org");
  }

  const cookieStore = await cookies();
  cookieStore.set(ORG_COOKIE_NAME, orgId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/admin/dashboard?info=org-selected");
}

export async function createOrganizationAction(
  _: CreateOrgActionState,
  formData: FormData,
): Promise<CreateOrgActionState> {
  const user = await getSessionUser();
  if (!user) {
    return {
      error: "Your session expired. Please log in again.",
    };
  }

  const supabase = await createClient();
  const { data: existingMemberships } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id);

  const existingOrgIds = (existingMemberships ?? [])
    .map((membership) => membership.org_id as string)
    .filter(Boolean);

  if (existingOrgIds.length === 1) {
    const cookieStore = await cookies();
    cookieStore.set(ORG_COOKIE_NAME, existingOrgIds[0], {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    redirect("/admin/dashboard");
  }

  if (existingOrgIds.length > 1) {
    redirect("/admin/select-org");
  }

  const name = formData.get("name");
  const tier = formData.get("tier");
  const logoFile = formData.get("logo");

  if (typeof name !== "string" || name.trim().length === 0) {
    return {
      error: "Organization name is required.",
    };
  }

  const allowedTiers = new Set(["starter", "pro", "enterprise"]);
  const safeTier =
    typeof tier === "string" && allowedTiers.has(tier) ? tier : "starter";

  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name: name.trim(),
      tier: safeTier,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (orgError || !organization) {
    return {
      error: "Could not create organization. Please try again.",
    };
  }

  const orgId = organization.id as string;
  let logoUrl: string | null = null;

  if (logoFile instanceof File && logoFile.size > 0) {
    const timestamp = Date.now();
    const safeFileName = logoFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const objectPath = `${orgId}/${timestamp}-${safeFileName}`;
    const fileBytes = new Uint8Array(await logoFile.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("org-logos")
      .upload(objectPath, fileBytes, {
        contentType: logoFile.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      return {
        error: "Organization created, but logo upload failed. Please try again later.",
      };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("org-logos").getPublicUrl(objectPath);
    logoUrl = publicUrl;

    const { error: updateError } = await supabase
      .from("organizations")
      .update({ logo_url: logoUrl })
      .eq("id", orgId);

    if (updateError) {
      return {
        error: "Organization created, but logo URL could not be saved.",
      };
    }
  }

  const membershipPayloads = [
    {
      org_id: orgId,
      user_id: user.id,
      role: "org_admin",
    },
    {
      org_id: orgId,
      user_id: user.id,
      role_type: "org_admin",
    },
  ];

  let memberInsertSucceeded = false;
  for (const payload of membershipPayloads) {
    const { error } = await supabase.from("org_members").insert(payload);
    if (!error) {
      memberInsertSucceeded = true;
      break;
    }
  }

  if (!memberInsertSucceeded) {
    return {
      error: "Organization created, but membership could not be created.",
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(ORG_COOKIE_NAME, orgId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/admin/dashboard");
}
