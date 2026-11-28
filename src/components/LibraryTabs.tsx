import Link from "next/link";

const TABS = [
  { key: "exercises", label: "Exercises", href: "/coach/library" },
  { key: "programmes", label: "Programmes", href: "/coach/library/programmes" },
  { key: "nutrition", label: "Nutrition plans", href: "/coach/library/nutrition" },
];

export function LibraryTabs({ active }: { active: "exercises" | "programmes" | "nutrition" }) {
  return (
    <nav className="ptabs" aria-label="Library sections">
      {TABS.map((t) => (
        <Link key={t.key} href={t.href} aria-current={active === t.key ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
