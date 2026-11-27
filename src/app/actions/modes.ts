"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MODE_COOKIE, VIEW_COOKIE, requireCoach } from "@/lib/auth";

const opts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };

/** Coach: use the client app for your own training. */
export async function startMyTraining() {
  await requireCoach();
  const jar = await cookies();
  jar.delete(VIEW_COOKIE);
  jar.set(MODE_COOKIE, "me", { ...opts, maxAge: 60 * 60 * 24 * 365 });
  redirect("/app");
}

/** Coach: see the app exactly as one client sees it, read only. */
export async function viewAsClient(form: FormData) {
  await requireCoach();
  const id = String(form.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/coach/clients");
  const jar = await cookies();
  jar.set(VIEW_COOKIE, id, { ...opts, maxAge: 60 * 60 * 4 });
  redirect("/app");
}

/** Coach: back to the coach app. Leaves "my training" switched off too. */
export async function backToCoach(form: FormData) {
  await requireCoach();
  const jar = await cookies();
  const viewing = jar.get(VIEW_COOKIE)?.value;
  jar.delete(VIEW_COOKIE);
  jar.delete(MODE_COOKIE);
  const to = String(form.get("to") ?? "");
  redirect(viewing && to === "client" ? `/coach/clients/${viewing}` : "/coach");
}
