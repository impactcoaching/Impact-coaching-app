// The 14-day free trial: lengths, prices and the joining offer, in one place.

export const TRIAL_DAYS = 14;
/** Days after the trial ends before a trial account that didn't join is deleted. */
export const DELETE_AFTER_DAYS = 30;
export const TRIAL_PLACES = 8;

/** Prices are in pounds. Overseas amounts are rough guides only; everyone pays in pounds. */
export const PLANS = [
  {
    key: "lifestyle",
    name: "Lifestyle coaching",
    monthly: 150,
    approx: "about NZ$330, A$290 or US$195",
    includes: [
      "Your own training programme, built around your gym",
      "Your own calorie and macro targets or meal plan",
      "Weekly check-ins with a video reply",
      "Intensifiers, supersets and form video feedback",
      "Progress photo comparisons",
      "Message me any time",
    ],
  },
  {
    key: "prep",
    name: "Prep coaching",
    monthly: 200,
    approx: "about NZ$440, A$390 or US$260",
    includes: [
      "Everything in Lifestyle coaching",
      "More of my time: extra check-ins and contact as your show gets closer",
      "Posing analysis with video feedback, using the poses for your federation and class",
      "Peak week planned by me",
      "Show-day plan: food, timing, pump-up, tan and stage checklist",
    ],
  },
] as const;

export const TRIAL_INCLUDES = [
  "Workouts written for you by Adam, with the full tracker",
  "Food logging with supermarket foods",
  "A check-in with a video reply from Adam",
  "Starting progress photos, if you'd like",
];

/** One 10% discount per client: either the first month when joining at the end of the trial, or every month when paying 3 months up front. */
export const tenPercentOff = (n: number) => Math.round(n * 0.9);

/** Adam's booking page for a 15 minute call (Calendly or similar). Without one, people are sent to Messages. */
export function bookingUrl() {
  const url = process.env.NEXT_PUBLIC_BOOKING_URL;
  return url && /^https:\/\//.test(url) ? url : null;
}

type TrialProfile = { status: string; trial_started_at?: string | null; trial_ends_at?: string | null };

const DAY = 86_400_000;

/** Which day of the trial it is (1 to 14), or null if not on a trial. */
export function trialDay(p: TrialProfile, now = Date.now()) {
  if (p.status !== "trial" || !p.trial_started_at) return null;
  return Math.min(TRIAL_DAYS, Math.max(1, Math.floor((now - +new Date(p.trial_started_at)) / DAY) + 1));
}

export function trialOver(p: TrialProfile, now = Date.now()) {
  return p.status === "trial" && !!p.trial_ends_at && +new Date(p.trial_ends_at) < now;
}

/** The date a trial account that didn't join is due to be deleted. */
export function deleteDate(p: TrialProfile) {
  return p.trial_ends_at ? new Date(+new Date(p.trial_ends_at) + DELETE_AFTER_DAYS * DAY) : null;
}

export const longDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });

/** Adam's short notes on the trial home screen, by day. The latest one due is shown. */
export const TRIAL_NOTES: { from: number; text: string }[] = [
  { from: 1, text: "Welcome in. Your workouts are built around your answers and will be in Train. Log your food as you go in the meantime, and don't worry about getting it perfect." },
  { from: 3, text: "How did the first sessions feel? Don't worry about the weights yet, just get the moves feeling smooth." },
  { from: 7, text: "It's check-in day. Fill it in honestly and I'll reply with a short video." },
  { from: 10, text: "Want a plan built just for you? Book a quick call and we'll see if coaching is a good fit." },
  { from: 12, text: "Two days left of your trial. Have a look at what you've logged so far, it adds up." },
];

export function noteFor(day: number) {
  return [...TRIAL_NOTES].reverse().find((n) => day >= n.from) ?? TRIAL_NOTES[0];
}
