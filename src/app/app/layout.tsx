import { redirect } from "next/navigation";
import { Brand } from "@/components/Brand";
import { Icon } from "@/components/Icons";
import { NavLink } from "@/components/NavLink";
import { requireProfile } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";
import { IntroReel } from "@/components/IntroReel";
import { Tour } from "@/components/Tour";
import Link from "next/link";
import { trialOver } from "@/lib/trial";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile();
  if (profile.role === "coach") redirect("/coach");
  if (profile.status === "signing_up") redirect("/welcome");
  const first = (profile.full_name ?? "").split(" ")[0];
  return (
    <>
      {profile.intro_seen_at === null ? <IntroReel first={first} /> : null}
      <div className="capp">
        <div className="capp-top">
          <Brand href="/app" />
          <form action={signOut}>
            <button className="link small">Sign out</button>
          </form>
        </div>
        {trialOver(profile) ? (
          <Link href="/app/join-coaching" className="alert" style={{ textDecoration: "none", color: "var(--fg)" }}>
            Your free trial has finished, so you can look back at everything but not add anything new. <b>See coaching options ›</b>
          </Link>
        ) : null}
        {children}
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
      <Tour />
    </>
  );
}
