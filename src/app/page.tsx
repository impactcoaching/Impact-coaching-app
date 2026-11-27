import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/Brand";
import { createClient } from "@/lib/supabase/server";
import { homeFor, type Profile } from "@/lib/auth";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
    if (profile) redirect(homeFor(profile));
  }
  return (
    <main className="narrow" style={{ minHeight: "100dvh", justifyContent: "center" }}>
      <Brand sub="COACHING" />
      <h1>
        Train. Eat. Check in.
        <span>With Adam.</span>
      </h1>
      <p className="muted">Your training, nutrition, check-ins and progress, all in one place.</p>
      <div className="stack" style={{ gap: 10 }}>
        <Link className="btn primary block" href="/login">
          Sign in
        </Link>
        <Link className="btn block" href="/join">
          I&apos;m new here
        </Link>
        <Link className="small" href="/coaching" style={{ textAlign: "center", padding: "10px 0" }}>
          Coaching options and the free trial ›
        </Link>
      </div>
    </main>
  );
}
