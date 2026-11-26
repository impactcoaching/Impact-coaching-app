// Peak week: coach-set only. Nothing here calculates or suggests carbs, water or sodium.
import { addDays } from "@/lib/nutrition";

export type PeakDay = {
  id?: string;
  day_offset: number;
  carbs_g: number | null;
  protein_g: number | null;
  fat_g: number | null;
  water_ml: number | null;
  sodium_mg: number | null;
  training: string | null;
  note: string | null;
};

export type PeakWeek = { id: string; client_id: string; show_date: string; is_live: boolean; notes: string | null };

/** Days before the show the plan starts. Show day is 0. */
export const PEAK_START = -6;

export function peakDate(showDate: string, offset: number) {
  return addDays(showDate, offset);
}

export function peakLabel(offset: number) {
  if (offset === 0) return "Show day";
  if (offset === 1) return "Day after";
  return `${-offset} day${offset === -1 ? "" : "s"} out`;
}

export function shortDate(date: string) {
  return new Date(date + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

export function daysUntil(date: string, today: string) {
  return Math.round((Date.parse(date + "T12:00:00Z") - Date.parse(today + "T12:00:00Z")) / 86_400_000);
}

export const litres = (ml: number | null) => (ml == null ? null : Math.round(ml / 100) / 10);
