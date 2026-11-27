import Link from "next/link";
import { requireClientView } from "@/lib/auth";
import { todayIn } from "@/lib/nutrition";
import { daysUntil, litres, peakDate, peakLabel, shortDate, type PeakDay } from "@/lib/peak";
import { currentPeakWeek } from "@/lib/peak-server";

function Nums({ d }: { d: PeakDay }) {
  const items = [
    ["Carbs", d.carbs_g, "g"],
    ["Protein", d.protein_g, "g"],
    ["Fat", d.fat_g, "g"],
    ["Water", litres(d.water_ml), "L"],
    ["Sodium", d.sodium_mg, "mg"],
  ] as const;
  const shown = items.filter(([, v]) => v != null);
  if (!shown.length) return null;
  return (
    <div className="pnums">
      {shown.map(([k, v, u]) => (
        <div key={k}>
          <span>{k}</span>
          <b>
            {Number(v).toLocaleString("en-GB")}
            <small className="muted"> {u}</small>
          </b>
        </div>
      ))}
    </div>
  );
}

export default async function ClientPeak() {
  const { supabase, user, profile } = await requireClientView();
  const today = todayIn(profile.time_zone);
  const peak = await currentPeakWeek(supabase, user.id, today);

  if (!peak)
    return (
      <>
        <span className="eyebrow">Peak week</span>
        <h1>
          Peak week<span>not set yet</span>
        </h1>
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Adam will put your peak week plan here before your show. <Link href="/app">Back home</Link>
          </p>
        </div>
      </>
    );

  const { week, days } = peak;
  const until = daysUntil(week.show_date, today);
  return (
    <>
      <span className="eyebrow">Peak week · show {shortDate(week.show_date)}</span>
      <h1>
        {until > 0 ? `${until} day${until === 1 ? "" : "s"}` : until === 0 ? "Show day" : "Well done"}
        <span>{until > 0 ? "to show day" : until === 0 ? "you've got this" : "rest up"}</span>
      </h1>
      <p className="muted small" style={{ margin: 0 }}>
        Follow these exactly as Adam has set them. If something feels off, message him before changing anything. <Link href="/app/messages">Message Adam →</Link>
      </p>
      {week.notes ? (
        <div className="card">
          <span className="eyebrow">From Adam</span>
          <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{week.notes}</p>
        </div>
      ) : null}
      <div className="ptable" data-tour="peak-days">
        {days.map((d) => {
          const date = peakDate(week.show_date, d.day_offset);
          const cls = date === today ? " today" : date < today ? " past" : "";
          return (
            <div key={d.day_offset} className={`pday${cls}`}>
              <div className="top">
                <b>{date === today ? "Today" : peakLabel(d.day_offset)}</b>
                <span className="muted small">
                  {date === today ? `${peakLabel(d.day_offset)} · ` : ""}
                  {shortDate(date)}
                </span>
              </div>
              <Nums d={d} />
              {d.training ? (
                <p className="small" style={{ margin: 0 }}>
                  <b>Training:</b> {d.training}
                </p>
              ) : null}
              {d.note ? <p className="small muted" style={{ margin: 0, whiteSpace: "pre-wrap" }}>{d.note}</p> : null}
            </div>
          );
        })}
      </div>
    </>
  );
}
