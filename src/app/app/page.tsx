import { requireProfile } from "@/lib/auth";

export default async function ClientHome({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { profile } = await requireProfile();
  const sp = await searchParams;
  const first = (profile.full_name ?? "").split(" ")[0] || "there";
  return (
    <>
      <span className="eyebrow">Home</span>
      <h1>
        Hi {first}
        <span>{profile.status === "active" ? "let's go" : "nearly there"}</span>
      </h1>
      {sp.welcome ? <p className="alert ok">Thanks! Your answers are with Adam.</p> : null}
      {profile.status === "pending" ? (
        <div className="card">
          <h2>What happens next</h2>
          <p className="muted" style={{ margin: 0 }}>
            Adam reads your answers and builds your first training and nutrition plan. You&apos;ll get a message here when it&apos;s ready, usually within 2 working days.
          </p>
        </div>
      ) : (
        <div className="card">
          <h2>Your week</h2>
          <p className="muted" style={{ margin: 0 }}>
            Your goal, show or goal date countdown, weight trend and today&apos;s plan will show here.
          </p>
        </div>
      )}
    </>
  );
}
