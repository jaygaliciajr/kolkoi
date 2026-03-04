import { getCurrentInfluencer } from "@/lib/influencers/getCurrentInfluencer";

export async function getInfluencerIdForUser() {
  const influencer = await getCurrentInfluencer();
  if (!influencer) {
    return null;
  }

  return influencer.id as string;
}
