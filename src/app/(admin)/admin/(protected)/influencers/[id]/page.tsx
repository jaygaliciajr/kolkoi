import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { InfluencerEditForm } from "@/components/admin/InfluencerEditForm";
import { LinkCodeGenerator } from "@/components/admin/LinkCodeGenerator";
import { getSelectedOrgId } from "@/lib/org/getSelectedOrgId";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ edit?: string }>;

function statusFromRow(row: { used_at: string | null; expires_at: string } | null) {
  if (!row) return null;
  if (row.used_at) return "Used" as const;
  if (new Date(row.expires_at).getTime() < Date.now()) return "Expired" as const;
  return "Active" as const;
}

function tagsToList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export default async function InfluencerDetailPage(props: {
  params: Params;
  searchParams: SearchParams;
}) {
  const orgId = await getSelectedOrgId();
  if (!orgId) {
    redirect("/admin/select-org");
  }

  const { id } = await props.params;
  const { edit } = await props.searchParams;
  const supabase = await createClient();

  const { data: influencer, error } = await supabase
    .from("influencers")
    .select("*")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle();

  if (error) {
    notFound();
  }
  if (!influencer) {
    notFound();
  }

  const { data: latestCode } = await supabase
    .from("influencer_link_codes")
    .select("code, expires_at, used_at, created_at")
    .eq("org_id", orgId)
    .eq("influencer_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{influencer.full_name}</h1>
          <p className="text-sm text-slate-600">Influencer profile details and account linking.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/influencers"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            Back
          </Link>
          <Link
            href={`/admin/influencers/${id}?edit=${edit === "1" ? "0" : "1"}`}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            {edit === "1" ? "Close Edit" : "Edit"}
          </Link>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-900">Profile Info</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Email</dt>
            <dd className="text-slate-800">{influencer.email ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Phone</dt>
            <dd className="text-slate-800">{influencer.phone ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Location</dt>
            <dd className="text-slate-800">{influencer.location ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">IG Handle</dt>
            <dd className="text-slate-800">
              {influencer.ig_handle ? `@${influencer.ig_handle}` : "-"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">FB Page</dt>
            <dd className="text-slate-800">
              {influencer.fb_page_url ? (
                <a
                  href={influencer.fb_page_url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {influencer.fb_page_url}
                </a>
              ) : (
                "-"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Follower Count</dt>
            <dd className="text-slate-800">
              {typeof influencer.follower_count === "number"
                ? influencer.follower_count.toLocaleString()
                : "-"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Engagement Rate</dt>
            <dd className="text-slate-800">
              {typeof influencer.engagement_rate === "number"
                ? `${influencer.engagement_rate}%`
                : "-"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Linked User</dt>
            <dd className="text-slate-800">{influencer.user_id ? "Yes" : "No"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Tags</dt>
            <dd className="text-slate-800">
              {tagsToList(influencer.tags).length > 0
                ? tagsToList(influencer.tags).join(", ")
                : "-"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Notes</dt>
            <dd className="text-slate-800">{influencer.notes ?? "-"}</dd>
          </div>
        </dl>
      </section>

      {edit === "1" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-base font-semibold text-slate-900">Edit Influencer</h2>
          <InfluencerEditForm
            influencer={{
              id: influencer.id as string,
              full_name: (influencer.full_name as string) ?? "",
              email: (influencer.email as string | null) ?? null,
              phone: (influencer.phone as string | null) ?? null,
              location: (influencer.location as string | null) ?? null,
              notes: (influencer.notes as string | null) ?? null,
              fb_page_url: (influencer.fb_page_url as string | null) ?? null,
              ig_handle: (influencer.ig_handle as string | null) ?? null,
              follower_count: (influencer.follower_count as number | null) ?? null,
              engagement_rate: (influencer.engagement_rate as number | null) ?? null,
              tags: tagsToList(influencer.tags),
            }}
          />
        </section>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-base font-semibold text-slate-900">Account Link</h2>
        <p className="mb-3 text-sm text-slate-600">
          Generate a one-time code for the influencer to use in their app profile.
        </p>
        <LinkCodeGenerator
          influencerId={id}
          latestStatus={statusFromRow(
            latestCode
              ? {
                  used_at: latestCode.used_at as string | null,
                  expires_at: latestCode.expires_at as string,
                }
              : null,
          )}
          latestCode={(latestCode?.code as string | null) ?? null}
          latestExpiresAt={
            typeof latestCode?.expires_at === "string"
              ? new Date(latestCode.expires_at).toLocaleString()
              : null
          }
        />
      </section>
    </div>
  );
}
