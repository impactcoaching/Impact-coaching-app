# Impact Coaching app

The client and coach app for Impact Coaching. Web app first (works on phones and laptops), App Store later.

Built with Next.js, TypeScript and Supabase (database, sign-in and file storage).

## Build stages

1. **Foundations** (this stage): design system, sign-in, client sign-up form with health screening and consent, coach and client app shells, client list and sign-up review for the coach.
2. Training: programme builder with intensifiers beside the set, workout tracker, set videos, cardio.
3. Nutrition: targets incl. sodium, meal plans, food search and logging, eating out.
4. Check-ins, messages and progress photos, incl. video replies.
5. Peak week, AI drafting, intro reel, security check.

## Setting it up

1. Create a free project at [supabase.com](https://supabase.com). Pick the **London (eu-west-2)** region so UK client data stays in the UK.
2. In Supabase, open **SQL Editor** and run each file in `supabase/migrations/` in order.
3. Copy `.env.example` to `.env.local` and fill in the values from Supabase **Project Settings > API**.
4. `npm install`, then `npm run dev`, and open http://localhost:3000.

### Email templates

So email links work in any browser (including the Gmail and Mail apps), in Supabase go to **Authentication > Emails > Templates** and change the links:

- **Confirm signup**: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/welcome`
- **Reset password**: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/account/password`

### Make yourself the coach

Sign up through `/join` like a client would. Then, in the Supabase SQL Editor, run:

```sql
update public.profiles set role = 'coach', status = 'active'
where id = (select id from auth.users where email = 'YOUR EMAIL');
```

## Privacy and security

- Every table has row level security: clients only ever see their own rows; the coach sees everyone's.
- Clients can't change their own role or status (a database trigger blocks it).
- Consent is stored as a history (one row per consent given or withdrawn), never edited.
- Health screening answers that need a follow-up are flagged on the coach's client page.
- Never commit `.env.local` or any Supabase service key.

## Checks

```
npm run typecheck
npm run build
```
