import Link from "next/link";
import { Brand } from "@/components/Brand";
import { AuthForm } from "@/components/AuthForm";
import { join } from "@/app/actions/auth";
import { TRIAL_DAYS } from "@/lib/trial";

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ start?: string }> }) {
  const { start } = await searchParams;
  const choice = start === "trial" || start === "apply" ? start : null;

  if (!choice) {
    return (
      <main className="narrow">
        <Brand sub="COACHING" />
        <span className="eyebrow">Welcome</span>
        <h1>
          How would you
          <span>like to start?</span>
        </h1>
        <Link href="/join?start=trial" className="card door door-main">
          <h2>Try it free for {TRIAL_DAYS} days</h2>
          <span className="muted">Start straight away with starter workouts, food logging and a check-in reply from Adam.</span>
          <span className="door-go">Start my free trial ›</span>
        </Link>
        <Link href="/join?start=apply" className="card door">
          <h2>Apply for coaching</h2>
          <span className="muted">Ready to go? Adam reads your answers and builds your plan, usually within 2 working days.</span>
          <span className="door-go">Apply ›</span>
        </Link>
        <div className="card small">
          <b>Both start with the same 7 quick steps</b>
          <span className="muted">
            About you, your goals, your gym, a few health questions to keep you safe, and your consent. <Link href="/coaching">See what&apos;s included and the prices</Link>.
          </span>
        </div>
        <p className="small muted" style={{ margin: 0, textAlign: "center" }}>
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </main>
    );
  }

  const trial = choice === "trial";
  return (
    <main className="narrow">
      <Brand sub="COACHING" />
      <Link href="/join" className="small">
        ← Back
      </Link>
      <h1>
        {trial ? "Your free trial" : "Let's get"}
        <span>{trial ? `${TRIAL_DAYS} days, on us` : "started"}</span>
      </h1>
      <p className="muted">
        {trial
          ? "Create your account, then answer a few questions so your starter workouts and check-in fit you. It takes about 10 minutes. No payment details needed."
          : "Create your account, then answer a few questions so Adam can build your plan around you. It takes about 10 minutes."}
      </p>
      <div className="card">
        <AuthForm
          action={join}
          submit="Create my account"
          hidden={{ start: choice }}
          fields={[
            { name: "full_name", label: "Your name", autoComplete: "name" },
            { name: "email", label: "Email", type: "email", autoComplete: "email" },
            { name: "password", label: "Password", type: "password", autoComplete: "new-password", hint: "At least 10 characters." },
          ]}
        />
        <p className="small muted" style={{ margin: 0 }}>
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
        <p className="small muted" style={{ margin: 0 }}>
          See how we look after your data in our <Link href="/privacy">privacy policy</Link>.
        </p>
      </div>
    </main>
  );
}
