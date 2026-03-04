import { LinkInfluencerForm } from "@/components/influencer/LinkInfluencerForm";
import { getCurrentInfluencer } from "@/lib/influencers/getCurrentInfluencer";

function tagsToList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export default async function InfluencerProfilePage() {
  const influencer = await getCurrentInfluencer();

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>
        {influencer ? (
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-slate-500">Full Name</p>
              <p className="font-medium text-slate-900">{influencer.full_name as string}</p>
            </div>
            <div>
              <p className="text-slate-500">IG Handle</p>
              <p className="font-medium text-slate-900">
                {influencer.ig_handle ? `@${influencer.ig_handle}` : "-"}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-slate-500">Tags</p>
              <p className="font-medium text-slate-900">
                {tagsToList(influencer.tags).length > 0
                  ? tagsToList(influencer.tags).join(", ")
                  : "-"}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-600">
            Your account is not linked yet. Use a link code below.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Link my influencer record</h2>
        <p className="mt-1 text-sm text-slate-600">
          Ask your admin for a one-time link code, then submit it here.
        </p>
        <div className="mt-4">
          <LinkInfluencerForm />
        </div>
      </section>
    </div>
  );
}
