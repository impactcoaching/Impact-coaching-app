import { requireClientView } from "@/lib/auth";
import { TrialEnd } from "../TrialHome";

export default async function JoinCoachingPage() {
  const { supabase, profile } = await requireClientView();
  return <TrialEnd supabase={supabase} profile={profile} />;
}
