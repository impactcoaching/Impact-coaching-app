import { redirect } from "next/navigation";
import { Brand } from "@/components/Brand";
import { Icon } from "@/components/Icons";
import { NavLink } from "@/components/NavLink";
import { requireClientView } from "@/lib/auth";
import { backToCoach } from "@/app/actions/modes";
import { signOut } from "@/app/actions/auth";
import { IntroReel } from "@/components/IntroReel";
import { Tour } from "@/components/Tour";
import Link from "next/link";
import { trialOver } from "@/lib/trial";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const { profile, mode } = await requireClientView();
  if (mode === "client" && profile.status === "signing_up") redirect("/welcome");
  if (mode === "client" && profile.status === "ended") redirect("/ended");
  const first = (profile.full_name ?? "").split(" ")[0];
  const name = profile.full_name || "this client";
  return (
    <>
      {mode === "client" && profile.intro_seen_at === null ? <IntroReel first={first} /> : null}
      <div className="capp">
        <div className="capp-top">
          <Brand href="/app" />
          {mode === "client" ? (
            <form action={signOut}>
              <button className="link small">Sign out</button>
            </form>
          ) : (
            <form action={backToCoach}>
              <input type="hidden" name="to" value={mode === "view" ? "client" : "coach"} />
              <button className="btn small">Back to coaching</button>
            </form>
          )}
        </div>
        {mode === "view" ? (
          <div className="modebar view">
            <b>Viewing as {name}.</b> This is exactly what they see. Read only, so nothing you tap changes their app.
          </div>
        ) : mode === "me" ? (
          <div className="modebar">
            <b>My training.</b> You&apos;re using the app as a client.{" "}
            <Link href={`/coach/clients/${profile.id}/training`}>Write my programme ›</Link>
          </div>
        ) : null}
        {mode !== "me" && trialOver(profile) ? (
          <Link href="/app/join-coaching" className="alert" style={{ textDecoration: "none", color: "var(--fg)" }}>
            Your free trial has finished, so you can look back at everything but not add anything new. <b>See coaching options ›</b>
          </Link>
        ) : null}
        {mode === "view" ? (
          <fieldset disabled className="readonly">
            {children}
          </fieldset>
        ) : (
          children
        )}
      </div>
      <div className="tabbar">
        <nav aria-label="Main">
          <NavLink href="/app" exact>{Icon.home}Home</NavLink>
          <NavLink href="/app/train">{Icon.train}Train</NavLink>
          <NavLink href="/app/food">{Icon.food}Nutrition</NavLink>
          <NavLink href="/app/checkin">{Icon.checkin}Check-in</NavLink>
          <NavLink href="/app/messages">{Icon.chat}Messages</NavLink>
        </nav>
      </div>
      {mode === "client" ? <Tour /> : null}
    </>
  );
}
