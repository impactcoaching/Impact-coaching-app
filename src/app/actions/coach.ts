"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireCoach } from "@/lib/auth";

const schema = z.object({
  id: z.string().uuid(),
  status: z.enum(["active", "paused", "ended", "pending"]),
});

export type StatusResult = { error?: string };

export async function setClientStatus(_prev: StatusResult, form: FormData): Promise<StatusResult> {
  const { supabase } = await requireCoach();
  const parsed = schema.safeParse({ id: form.get("id"), status: form.get("status") });
  if (!parsed.success) return { error: "Something went wrong. Please refresh and try again." };
  const { data, error } = await supabase
    .from("profiles")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id)
    .eq("role", "client")
    .select("id");
  if (error) {
    console.error("setClientStatus", error);
    return { error: `Couldn't save: ${error.message}` };
  }
  if (!data?.length) return { error: "Couldn't save that change. Please refresh and try again." };
  revalidatePath("/coach", "layout");
  return {};
}

const BUCKETS = ["set-videos", "menu-photos", "progress-photos", "checkin-replies", "message-files"] as const;

export type DeleteResult = { error?: string };

/** Permanently delete a client: their files in every bucket, then their account and all linked rows. */
export async function deleteClient(_prev: DeleteResult, form: FormData): Promise<DeleteResult> {
  const { supabase } = await requireCoach();
  const id = z.string().uuid().safeParse(form.get("id"));
  if (!id.success) return { error: "Something went wrong. Please refresh and try again." };
  const { data: client } = await supabase.from("profiles").select("full_name, role").eq("id", id.data).single();
  if (!client || client.role !== "client") return { error: "Couldn't find that client." };
  const typed = String(form.get("confirm") ?? "").trim().toLowerCase();
  const name = (client.full_name ?? "").trim().toLowerCase();
  if (!name || typed !== name) return { error: "The name you typed doesn't match. Nothing was deleted." };

  for (const bucket of BUCKETS) {
    // Files sit directly in a folder named after the client.
    for (;;) {
      const { data: files, error } = await supabase.storage.from(bucket).list(id.data, { limit: 100 });
      if (error) return { error: `Couldn't remove their files (${bucket}). Nothing else was deleted. Please try again.` };
      if (!files?.length) break;
      const { data: gone, error: rmErr } = await supabase.storage.from(bucket).remove(files.map((f) => `${id.data}/${f.name}`));
      // An empty result means the delete was refused (usually the 0010 SQL hasn't been run yet).
      if (rmErr || !gone?.length) return { error: `Couldn't remove their files (${bucket}). Has the 0010 SQL been run? Nothing else was deleted.` };
    }
  }

  const { error } = await supabase.rpc("delete_client", { target: id.data });
  if (error) {
    console.error("deleteClient", error);
    return { error: `Their files are gone, but the account couldn't be deleted: ${error.message}` };
  }
  revalidatePath("/coach", "layout");
  redirect("/coach/clients?deleted=1");
}
