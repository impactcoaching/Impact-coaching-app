import Link from "next/link";
import { Brand } from "@/components/Brand";
import { AuthForm } from "@/components/AuthForm";
import { signIn, sendReset } from "@/app/actions/auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; reset?: string }> }) {
  const sp = await searchParams;
  const reset = sp.reset === "1";
  return (
    <main className="narrow">
      <Brand sub="COACHING" />
      <h1>
        {reset ? "Reset" : "Welcome"}
        <span>{reset ? "password" : "back"}</span>
      </h1>
      {sp.error === "profile" ? <p className="alert">Your account isn&apos;t fully set up yet. Please message Adam so he can sort it out.</p> : null}
      {sp.error === "link" ? <p className="alert">That link couldn&apos;t sign you in, but your email is most likely confirmed. Sign in below. If it says your email isn&apos;t confirmed, sign up again to get a new link.</p> : null}
      <div className="card">
        {reset ? (
          <AuthForm action={sendReset} submit="Send reset link" fields={[{ name: "email", label: "Email", type: "email", autoComplete: "email" }]} />
        ) : (
          <AuthForm
            action={signIn}
            submit="Sign in"
            fields={[
              { name: "email", label: "Email", type: "email", autoComplete: "email" },
              { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
            ]}
          />
        )}
        <div className="row small" style={{ justifyContent: "space-between" }}>
          {reset ? <Link href="/login">Back to sign in</Link> : <Link href="/login?reset=1">Forgotten your password?</Link>}
          <Link href="/join">New client? Join here</Link>
        </div>
      </div>
      <p className="small muted" style={{ textAlign: "center", margin: 0 }}>
        <Link href="/privacy">Privacy policy</Link>
      </p>
    </main>
  );
}
