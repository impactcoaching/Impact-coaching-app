"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "./auth";

const schema = z.object({ password: z.string().min(10, "Use at least 10 characters").max(200) });

export async function setPassword(_: FormState, form: FormData): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "That didn't work. The link may have expired, so ask for a new one." };
  redirect("/");
}
