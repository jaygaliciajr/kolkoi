import { createClient } from "@/lib/supabase/server";

const PROOF_BUCKET = "proof-screenshots";

export async function uploadProofScreenshotFiles(input: {
  orgId: string;
  assignmentId: string;
  files: File[];
}) {
  const supabase = await createClient();
  const uploadedPaths: string[] = [];

  for (const file of input.files) {
    if (!(file instanceof File) || file.size === 0) {
      continue;
    }

    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${input.orgId}/${input.assignmentId}/${Date.now()}-${safeFileName}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error } = await supabase.storage
      .from(PROOF_BUCKET)
      .upload(path, bytes, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (error) {
      throw new Error("Failed to upload screenshot.");
    }

    uploadedPaths.push(path);
  }

  return uploadedPaths;
}

export async function getSignedProofScreenshotUrls(paths: string[]) {
  if (paths.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(PROOF_BUCKET)
    .createSignedUrls(paths, 60 * 60);

  if (error || !data) {
    return [];
  }

  return data
    .map((item, index) => ({
      path: paths[index],
      signedUrl: item.signedUrl,
    }))
    .filter((item): item is { path: string; signedUrl: string } => Boolean(item.signedUrl));
}
