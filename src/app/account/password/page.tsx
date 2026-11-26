import { Brand } from "@/components/Brand";
import { AuthForm } from "@/components/AuthForm";
import { setPassword } from "@/app/actions/account";

export default function NewPasswordPage() {
  return (
    <main className="narrow">
      <Brand sub="COACHING" />
      <h1>
        New
        <span>password</span>
      </h1>
      <div className="card">
        <AuthForm action={setPassword} submit="Save password" fields={[{ name: "password", label: "New password", type: "password", autoComplete: "new-password", hint: "At least 10 characters." }]} />
      </div>
    </main>
  );
}
