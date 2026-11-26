# Notes for Claude

- UK English in all client-facing text. Warm, plain, not Americanised. No em dashes in UI copy.
- Coach is Adam (solo coach, max 50 clients). Clients are men and women, competitive and not. Sign-up asks female or male. Cycle tracking is offered to female clients only, and is opt-in (Adam, 26 Nov 2026). Other sex-specific bits (posing, measurements) stay per-client options, not assumed from sex.
- Every text input must be at least 16px on touch screens (iPhone Safari zoom bug). globals.css handles this; don't override it.
- Intensifiers sit beside their set (side panel), never as rows underneath.
- Peak week, water and sodium are coach-set only. AI features must never suggest water or sodium changes.
- Every new table needs row level security: client sees own rows, coach (public.is_coach()) sees all.
- Run `npm run typecheck` and `npm run build` before pushing.
