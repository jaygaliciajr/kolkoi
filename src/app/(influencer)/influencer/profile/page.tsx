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
      <section className="rounded-[var(--radius-2xl)] border border-border/70 bg-surface/80 p-6 text-text shadow-[var(--shadow-soft)] backdrop-blur-md">
        <h1 className="text-2xl font-semibold text-text">Profile</h1>
        {influencer ? (
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-muted">Full Name</p>
              <p className="font-medium text-text">{influencer.full_name as string}</p>
            </div>
            <div>
              <p className="text-muted">IG Handle</p>
              <p className="font-medium text-text">
                {influencer.ig_handle ? `@${influencer.ig_handle}` : "-"}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-muted">Tags</p>
              <p className="font-medium text-text">
                {tagsToList(influencer.tags).length > 0
                  ? tagsToList(influencer.tags).join(", ")
                  : "-"}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">
            Your account is not linked yet. Use a link code below.
          </p>
        )}
      </section>

      <section className="rounded-[var(--radius-2xl)] border border-border/70 bg-surface/80 p-6 text-text shadow-[var(--shadow-soft)] backdrop-blur-md">
        <h2 className="text-lg font-semibold text-text">Link my influencer record</h2>
        <p className="mt-1 text-sm text-muted">
          Ask your manager (Admin Portal) for a one-time link code, then submit it here.
        </p>
        <div className="mt-4">
          <LinkInfluencerForm />
        </div>
      </section>
    </div>
  );
}
