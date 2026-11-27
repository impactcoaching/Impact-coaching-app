import { redirect } from "next/navigation";
import { Brand } from "@/components/Brand";
import { requireProfile } from "@/lib/auth";
import { IntakeForm } from "./IntakeForm";

export default async function WelcomePage() {
  const { profile, user } = await requireProfile();
  if (profile.role === "coach") redirect("/coach");
  if (profile.status !== "signing_up") redirect("/app");
  const firstName = (profile.full_name ?? "").split(" ")[0] || "there";
  return (
    <main className="narrow">
      <Brand sub="COACHING" />
      <IntakeForm firstName={firstName} trial={user.user_metadata?.start === "trial"} />
    </main>
  );
}
