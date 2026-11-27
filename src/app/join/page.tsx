import Link from "next/link";
import { Brand } from "@/components/Brand";
import { AuthForm } from "@/components/AuthForm";
import { join } from "@/app/actions/auth";

export default function JoinPage() {
  return (
    <main className="narrow">
      <Brand sub="COACHING" />
      <h1>
        Let&apos;s get
        <span>started</span>
      </h1>
      <p className="muted">Create your account, then answer a few questions so Adam can build your plan around you. It takes about 10 minutes.</p>
      <div className="card">
        <AuthForm
          action={join}
          submit="Create my account"
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
