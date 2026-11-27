import { requireProfile } from "@/lib/auth";
import { TrialEnd } from "../TrialHome";

export default async function JoinCoachingPage() {
  const { supabase, profile } = await requireProfile();
  return <TrialEnd supabase={supabase} profile={profile} />;
}
