"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCoach } from "@/lib/auth";

const schema = z.object({
  id: z.string().uuid(),
  status: z.enum(["active", "paused", "ended", "pending"]),
});

export async function setClientStatus(form: FormData) {
  const { supabase } = await requireCoach();
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return;
  await supabase.from("profiles").update({ status: parsed.data.status }).eq("id", parsed.data.id).eq("role", "client");
  revalidatePath("/coach", "layout");
}
