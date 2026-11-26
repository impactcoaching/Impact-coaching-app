"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { homeFor, type Profile } from "@/lib/auth";

export type FormState = { error?: string; ok?: string } | undefined;

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { error: "That email and password don't match. Try again, or reset your password." };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single<Profile>();
  if (!profile) {
    await supabase.auth.signOut();
    return { error: "You're signed in, but your account isn't fully set up yet. Please message Adam so he can sort it out." };
  }
  redirect(homeFor(profile));
}

const joinSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your name").max(120),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(10, "Use at least 10 characters for your password").max(200),
});

export async function join(_: FormState, form: FormData): Promise<FormState> {
  const parsed = joinSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.full_name }, emailRedirectTo: `${site}/auth/callback?next=/welcome` },
  });
  if (error) return { error: error.message };
  // If email confirmation is on, there's no session yet.
  if (!data.session) return { ok: "Check your email for a link to confirm your address, then you can carry on." };
  redirect("/welcome");
}

const resetSchema = z.object({ email: z.string().trim().email("Enter a valid email address") });

export async function sendReset(_: FormState, form: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${site}/auth/callback?next=/account/password` });
  // Same message either way, so the form doesn't reveal who has an account.
  return { ok: "If that email has an account, a reset link is on its way." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
