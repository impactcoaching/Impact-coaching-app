import Link from "next/link";

const TABS = [
  { key: "overview", label: "Overview", href: (id: string) => `/coach/clients/${id}` },
  { key: "training", label: "Training", href: (id: string) => `/coach/clients/${id}/training` },
  { key: "nutrition", label: "Nutrition", href: (id: string) => `/coach/clients/${id}/nutrition` },
  { key: "peak", label: "Peak week", href: (id: string) => `/coach/clients/${id}/peak` },
  { key: "checkins", label: "Check-ins", href: (id: string) => `/coach/clients/${id}/checkins` },
  { key: "messages", label: "Messages", href: (id: string) => `/coach/messages/${id}` },
];

export function ClientTabs({ id, active }: { id: string; active: string }) {
  return (
    <nav className="ptabs" aria-label="Client sections">
      {TABS.map((t) => (
        <Link key={t.key} href={t.href(id)} aria-current={active === t.key ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
