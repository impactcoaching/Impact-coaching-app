import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { ClientTabs } from "@/components/ClientTabs";
import { StatusControl } from "@/components/StatusControl";
import { COUNTRIES, EQUIPMENT, EXPERIENCE, GOALS, NUTRITION_STYLES, SCREENING, type EquipmentKey } from "@/lib/options";

const label = <T extends { value: string; label: string }>(list: readonly T[], v: string | null) => list.find((x) => x.value === v)?.label ?? v ?? "–";
const fmtDate = (d: string | null) => (d ? new Date(d + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "–");
const age = (dob: string | null) => {
  if (!dob) return null;
  const b = new Date(dob + "T12:00:00"),
    n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--;
  return a;
};

const CONSENT_LABEL: Record<string, string> = {
  privacy_policy: "Privacy policy",
  health_data: "Use of health details",
  progress_photos: "Progress photos stored",
  marketing_photos: "Asked before marketing use",
  cycle_data: "Cycle tracking",
  marketing_contact: "Contact after the trial",
};

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireCoach();
  const { data: c } = await supabase.from("profiles").select("*").eq("id", id).eq("role", "client").maybeSingle();
  if (!c) notFound();
  const [{ data: intake }, { data: gyms }, { data: consents }] = await Promise.all([
    supabase.from("client_intake").select("*").eq("client_id", id).maybeSingle(),
    supabase.from("gyms").select("*, custom_equipment(*)").eq("client_id", id).order("is_main", { ascending: false }),
    supabase.from("consents").select("kind, granted, created_at").eq("client_id", id).order("created_at", { ascending: false }),
  ]);
  // Latest answer per consent kind
  const latest = new Map<string, { granted: boolean; created_at: string }>();
  for (const r of consents ?? []) if (!latest.has(r.kind)) latest.set(r.kind, r);
  const yes = intake ? SCREENING.filter((s) => (intake.screening as Record<string, boolean>)[s.key]) : [];

  return (
    <>
      <Link href="/coach/clients" className="small">
        ← All clients
      </Link>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
        <div className="stack" style={{ gap: 6 }}>
          <span className="eyebrow">{intake ? label(GOALS, intake.goal) : "Still signing up"}</span>
          <h1>{c.full_name || "No name yet"}</h1>
        </div>
        <StatusControl key={c.status} id={c.id} status={c.status} />
      </div>

      <ClientTabs id={c.id} active="overview" />
      {!intake ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            This person has made an account but hasn&apos;t finished the sign-up form yet.
          </p>
        </div>
      ) : (
        <>
          {yes.length ? (
            <div className="alert">
              <b>Health check: {yes.length} yes {yes.length === 1 ? "answer" : "answers"}.</b> Consider asking them to check with their GP before starting.
              <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                {yes.map((s) => (
                  <li key={s.key}>{s.q}</li>
                ))}
              </ul>
              {intake.screening_details ? <p style={{ margin: "8px 0 0" }}>“{intake.screening_details}”</p> : null}
            </div>
          ) : null}

          <div className="grid2">
            <section className="card">
              <h2>About</h2>
              <dl className="facts">
                <dt>Sex</dt>
                <dd>{intake.sex === "female" ? "Female" : intake.sex === "male" ? "Male" : "–"}</dd>
                <dt>Age</dt>
                <dd>{age(intake.date_of_birth) ?? "–"}</dd>
                <dt>Lives in</dt>
                <dd>
                  {label(COUNTRIES, c.country)}
                  {c.time_zone ? <span className="muted"> · {c.time_zone}</span> : null}
                </dd>
                <dt>Mobile</dt>
                <dd>{intake.phone ?? "–"}</dd>
                <dt>Height</dt>
                <dd>{intake.height_cm ? `${intake.height_cm} cm` : "–"}</dd>
                <dt>Starting weight</dt>
                <dd>{intake.start_weight_kg ? `${intake.start_weight_kg} kg` : "–"}</dd>
              </dl>
            </section>
            <section className="card">
              <h2>Goal</h2>
              <dl className="facts">
                <dt>Goal</dt>
                <dd>{label(GOALS, intake.goal)}</dd>
                <dt>In their words</dt>
                <dd>{intake.goal_detail ?? "–"}</dd>
                <dt>Working towards</dt>
                <dd>{fmtDate(intake.goal_date)}</dd>
                <dt>Competes</dt>
                <dd>{intake.competes ? [intake.federation, intake.division].filter(Boolean).join(" · ") || "Yes, not decided yet" : "No"}</dd>
              </dl>
            </section>
            <section className="card">
              <h2>Training</h2>
              <dl className="facts">
                <dt>Availability</dt>
                <dd>
                  {intake.days_per_week ?? "–"} days a week, {intake.session_minutes ?? "–"} minutes
                </dd>
                <dt>Experience</dt>
                <dd>{label(EXPERIENCE, intake.experience)}</dd>
                <dt>Injuries</dt>
                <dd>{intake.injuries ?? "None mentioned"}</dd>
              </dl>
            </section>
            <section className="card">
              <h2>Food</h2>
              <dl className="facts">
                <dt>Prefers</dt>
                <dd>{label(NUTRITION_STYLES, intake.nutrition_style)}</dd>
                <dt>Needs and dislikes</dt>
                <dd>{intake.dietary_needs ?? "None mentioned"}</dd>
                <dt>Cycle tracking</dt>
                <dd>{intake.cycle_tracking ? "On" : "Off"}</dd>
              </dl>
            </section>
          </div>

          {(gyms ?? []).map((g) => (
            <section key={g.id} className="card">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div>
                  <span className="eyebrow">{g.is_main ? "Main gym" : "Gym"}</span>
                  <h2>{g.name}</h2>
                </div>
                <span className="chip">
                  {g.equipment.length} of {Object.keys(EQUIPMENT).length} kinds of kit
                </span>
              </div>
              <p className="small" style={{ margin: 0 }}>
                <span className="muted">Doesn&apos;t have: </span>
                {(Object.keys(EQUIPMENT) as EquipmentKey[])
                  .filter((k) => !g.equipment.includes(k))
                  .map((k) => EQUIPMENT[k])
                  .join(", ") || "Has everything on the list."}
              </p>
            </section>
          ))}

          <section className="card">
            <h2>Consent</h2>
            <dl className="facts">
              {Object.entries(CONSENT_LABEL).map(([k, l]) => {
                const r = latest.get(k);
                return (
                  <div key={k} style={{ display: "contents" }}>
                    <dt>{l}</dt>
                    <dd>
                      {r ? (r.granted ? "Yes" : "No") : "–"}
                      {r ? <span className="muted small"> · {new Date(r.created_at).toLocaleDateString("en-GB")}</span> : null}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        </>
      )}
    </>
  );
}
