const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const Icon = {
  home: <svg viewBox="0 0 24 24" {...P}><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>,
  train: <svg viewBox="0 0 24 24" {...P}><path d="M6 7v10M18 7v10M3 9v6M21 9v6M6 12h12" /></svg>,
  food: <svg viewBox="0 0 24 24" {...P}><path d="M4 3v8a3 3 0 0 0 6 0V3M7 3v18M17 21V3c-2 1-3 4-3 8h3" /></svg>,
  checkin: <svg viewBox="0 0 24 24" {...P}><rect x="4" y="4" width="16" height="17" rx="2" /><path d="M9 3h6v3H9zM8.5 13l2.5 2.5 4.5-5" /></svg>,
  chat: <svg viewBox="0 0 24 24" {...P}><path d="M4 5h16v11H9l-5 4z" /></svg>,
  dash: <svg viewBox="0 0 24 24" {...P}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>,
  clients: <svg viewBox="0 0 24 24" {...P}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .7 3.2 2.5 3.6 5.2" /></svg>,
  library: <svg viewBox="0 0 24 24" {...P}><path d="M4 4h4v16H4zM10 4h4v16h-4zM16 5l3.5-1 2.5 15.5-3.5 1z" /></svg>,
};
