import Link from "next/link";

const TABS = [
  { key: "overview", label: "Overview", path: "" },
  { key: "training", label: "Training", path: "/training" },
  { key: "nutrition", label: "Nutrition", path: "/nutrition" },
];

export function ClientTabs({ id, active }: { id: string; active: string }) {
  return (
    <nav className="ptabs" aria-label="Client sections">
      {TABS.map((t) => (
        <Link key={t.key} href={`/coach/clients/${id}${t.path}`} aria-current={active === t.key ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
