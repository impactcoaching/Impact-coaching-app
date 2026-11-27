import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { PLANS, TRIAL_DAYS, TRIAL_INCLUDES, bookingUrl, tenPercentOff } from "@/lib/trial";

export const metadata: Metadata = {
  title: "Coaching with Adam | Impact Coaching",
  description: "Training, nutrition and habits, planned by Adam and adjusted every week. Try the app free for 14 days.",
};

export default function CoachingPage() {
  const book = bookingUrl();
  return (
    <main className="narrow">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <Brand sub="COACHING" />
        <Link href="/login" className="small">
          Sign in
        </Link>
      </div>
      <span className="eyebrow">Coaching with Adam</span>
      <h1>
        Coaching built
        <span>around you</span>
      </h1>
      <p className="muted" style={{ margin: 0 }}>
        Training, nutrition and habits, planned by me and adjusted every week. Try the app free for {TRIAL_DAYS} days first and see how it feels.
      </p>
      <Link href="/join?start=trial" className="btn primary block">
        Try it free for {TRIAL_DAYS} days
      </Link>
      <p className="small muted" style={{ margin: "-8px 0 0", textAlign: "center" }}>
        No payment details needed.
      </p>

      <div className="card">
        <h2>In your free trial</h2>
        <ul className="ticks">
          {TRIAL_INCLUDES.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>

      <h2>Coaching options</h2>
      {PLANS.map((p, i) => (
        <div key={p.key} className={`card plan${i === 0 ? " plan-main" : ""}`}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
            <h3>{p.name}</h3>
            <span>
              <b className="num">£{p.monthly}</b>
              <span className="muted small"> / month</span>
            </span>
          </div>
          <span className="muted small">Or £{tenPercentOff(p.monthly) * 3} for 3 months up front (£{tenPercentOff(p.monthly)} a month). Overseas: {p.approx} a month.</span>
          <ul className="ticks">
            {p.includes.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      ))}

      <div className="offer">
        <b>10%</b>
        <span>Join when your trial ends and save 10% on your first month, or pay 3 months up front and save 10% every month. One discount per client.</span>
      </div>

      <p className="small muted" style={{ margin: 0 }}>
        Paid by bank transfer in pounds. Not sure which fits?{" "}
        {book ? (
          <a href={book} target="_blank" rel="noopener">
            Book a free 15 minute call
          </a>
        ) : (
          <Link href="/join?start=trial">Start a trial and message me</Link>
        )}{" "}
        and we&apos;ll work it out together.
      </p>
      <p className="small muted" style={{ margin: 0 }}>
        Already sure? <Link href="/join?start=apply">Apply for coaching</Link>. If you don&apos;t join after a trial, your account and data are deleted 30 days after it ends. See the <Link href="/privacy">privacy policy</Link>.
      </p>
    </main>
  );
}
