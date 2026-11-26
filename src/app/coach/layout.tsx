import { Brand } from "@/components/Brand";
import { Icon } from "@/components/Icons";
import { NavLink } from "@/components/NavLink";
import { requireCoach } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";

const NAV = [
  { href: "/coach", label: "Dashboard", icon: Icon.dash, exact: true },
  { href: "/coach/clients", label: "Clients", icon: Icon.clients },
  { href: "/coach/checkins", label: "Check-ins", icon: Icon.checkin },
  { href: "/coach/messages", label: "Messages", icon: Icon.chat },
  { href: "/coach/library", label: "Library", icon: Icon.library },
];

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireCoach();
  return (
    <div className="coach">
      <aside className="side">
        <Brand sub="COACH" href="/coach" />
        <nav aria-label="Coach menu">
          {NAV.map((n) => (
            <NavLink key={n.href} href={n.href} exact={n.exact}>
              {n.icon}
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="foot stack" style={{ gap: 8 }}>
          <span className="small muted">Signed in as {profile.full_name || "Coach"}</span>
          <form action={signOut}>
            <button className="link small">Sign out</button>
          </form>
        </div>
      </aside>
      <div>
        <div className="coach-mtop">
          <Brand sub="COACH" href="/coach" />
          <form action={signOut}>
            <button className="link small">Sign out</button>
          </form>
        </div>
        <main className="coach-main">{children}</main>
      </div>
      <div className="tabbar coach-tabbar">
        <nav aria-label="Coach menu">
          {NAV.map((n) => (
            <NavLink key={n.href} href={n.href} exact={n.exact}>
              {n.icon}
              {n.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
