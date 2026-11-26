"use server";

import { revalidatePath } from "next/cache";
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
