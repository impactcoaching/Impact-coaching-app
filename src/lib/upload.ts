import { createClient } from "@/lib/supabase/client";

/** Upload a file from the browser into a private bucket, in the given folder. Returns its path. */
export async function uploadFile(bucket: string, folder: string, file: File, maxMb: number): Promise<{ path?: string; error?: string }> {
  if (file.size > maxMb * 1024 * 1024) return { error: `That file is too big (the limit is ${maxMb} MB).` };
  const ext = ((file.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "") || (file.type.startsWith("video") ? "mp4" : "jpg")).slice(0, 5);
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await createClient().storage.from(bucket).upload(path, file, { contentType: file.type || undefined });
  if (error) return { error: "The upload didn't work. Check your signal and try again." };
  return { path };
}
