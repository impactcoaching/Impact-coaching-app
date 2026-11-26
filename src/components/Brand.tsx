import Link from "next/link";

export function Brand({ sub, href = "/" }: { sub?: string; href?: string }) {
  return (
    <Link href={href} className="brand" aria-label="Impact Coaching home">
      IMPACT<b>.</b>
      {sub ? <small>{sub}</small> : null}
    </Link>
  );
}
