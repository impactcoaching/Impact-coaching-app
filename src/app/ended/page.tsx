import { redirect } from "next/navigation";
import { Brand } from "@/components/Brand";
import { requireProfile } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";

export const metadata = { title: "Coaching ended · Impact Coaching" };

export default async function EndedPage() {
  const { profile } = await requireProfile();
  if (profile.role === "coach") redirect("/coach");
  if (profile.status !== "ended") redirect("/app");
  const first = (profile.full_name ?? "").split(" ")[0] || "there";
  return (
    <main className="narrow">
      <Brand sub="COACHING" />
      <section className="card stack">
        <h1 style={{ margin: 0 }}>
          Thanks, {first}
          <span>your coaching has ended</span>
        </h1>
        <p className="muted" style={{ margin: 0 }}>
          It&apos;s been a pleasure working with you. Your account is closed for now, so the app is locked.
        </p>
        <p className="muted" style={{ margin: 0 }}>
          Fancy coming back? Just get in touch with Adam and he can switch everything back on, with all your history still here. We keep your data for 12 months after
          you leave, then delete it. You can ask for it to be deleted sooner.
        </p>
        <form action={signOut}>
          <button className="btn">Sign out</button>
        </form>
      </section>
    </main>
  );
}
