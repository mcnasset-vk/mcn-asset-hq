# MCN Asset HQ — Capital & Pipeline Dashboard

Executive dashboard for the capital raise, the Factory Cosif pipeline, MDNA Admin co-living packages, the Nasdaq listing M&A programme, MEC Asset operations, Micana co-living and introducer commissions.

Every monetary figure — targets, deal sizes, rates and quotas — is read from the environment, never from source. See `.env.example` for the full list and `lib/config.ts` for why.

Live on Supabase: email + password sign-in, per-module access enforced in the database, add/edit forms, and private document storage.

**Production:** <https://mcn-asset-hq.vercel.app>

---

## Deployment

Hosted on Vercel, connected to this GitHub repo — pushing to `main` deploys automatically.

Two environment variables must be set in the Vercel project (Production, Preview and Development): `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. They are not in the repo.

Two settings that are easy to get wrong:

- **Framework preset must be `Next.js`.** Creating the project with `vercel project add` leaves it unset, and the build then succeeds while every route returns 404 — Vercel runs `next build` but serves the output as plain static files.
- **Deployment Protection must stay off.** With Vercel Authentication on, visitors are made to sign into Vercel *before* reaching the login page, which locks out every user who does not also hold a Vercel account. Authentication is Supabase auth; authorisation is row level security.

Manual deploy:

```bash
vercel deploy --prod --scope mcnasset-vks-projects
```

---

## Run it

```bash
npm run dev --prefix mcn-asset-hq
```

Then open <http://localhost:3000>. You will be redirected to `/login`.

Production build:

```bash
npm run build --prefix mcn-asset-hq
```

Environment: copy `.env.example` to `.env.local` and fill in the project URL and publishable key. Both are safe in the browser — row level security is what protects the data, not the key. **Never put the service role key in this file.**

---

## The one rule everything derives from

Only two things count toward the capital target:

| Source | Into MCN Asset HQ | Counted as **Committed** when | Counted as **Received** when |
| --- | --- | --- | --- |
| Factory Cosif | `NEXT_PUBLIC_FACTORY_HQ_INVESTMENT` | stage reaches `Disbursed` | stage reaches `Invested` |
| MDNA Admin | `NEXT_PUBLIC_MDNA_HQ_INVESTMENT` | member `Signed` | member `Invested` |
| Nasdaq M&A | **nothing** | — | — |
| MEC Asset (HR) | **nothing** | — | — |
| Micana Co-Living | **nothing** | — | — |

Three programmes are tracked against their own targets and contribute nothing to the raise:

- **Nasdaq M&A** is measured in **profit-after-tax**, against `NEXT_PUBLIC_NASDAQ_PAT_TARGET`.
- **MEC Asset (HR)** is measured in **operating revenue** across eight streams, each with its own `NEXT_PUBLIC_MEC_TARGET_*`. A share flows upward to MCN and a further share funds the operating and profit-sharing pool, both computed live from actual revenue.
- **Micana Co-Living** is measured on its own operating scorecard — rent roll, occupancy, net profit, owner payouts.

None of PAT, revenue or rent roll is capital, so none of them touches the raise figure — mixing them in would overstate it.

`lib/metrics.ts` enforces this structurally: `getCapitalSummary` reads `data.factories` and `data.members` and nothing else. If a figure from another module ever needs to move the headline, that is the one function to change.

`Received` is always a subset of `Committed`. The hatched band on the progress bar is the difference: money committed but not yet in the bank.

---

## Accounts and access

There is **no public sign-up**. The super admin creates accounts; everyone else starts as `pending` and sees a "waiting for access" screen until given a scope.

| Role | Sees |
| --- | --- |
| `super_admin` | Everything, plus user management |
| `mdna` | The MDNA division — Factory Cosif, MDNA Admin, Nasdaq M&A and Fees. A `business_line` narrows them to one of those; null means the whole division |
| `mec` | MEC Asset (HR). Its `business_line` selects which desk dashboard renders, not which rows are visible |
| `micana` | Micana Co-Living. A division of its own, with no business line |
| `pending` | Nothing until assigned |

**Creating the first account** — in the Supabase dashboard, *Authentication → Users → Add user*, set your own password, then in the SQL editor:

```sql
select private.assign_role('you@example.com', 'super_admin');
```

**Scoping someone** — create the user the same way, then:

```sql
-- A whole division:
select private.assign_role('serena@example.com', 'micana');

-- One line inside a division:
select private.assign_role('aziz@example.com', 'mdna', 'factory');
-- mdna lines: 'mdna' | 'factory' | 'nasdaq' | 'commissions'
-- mec  lines: 'strategic_partnership' | 'operations_manager' | 'operations_executive'
```

### Access is enforced in the database

Every table has row level security, and every policy routes through one predicate: `private.can_access`. A user scoped to `micana` gets **zero rows** from `factory_deals` even calling the REST API directly with their own token — the app hiding a menu item is a convenience, not the boundary.

Helper functions live in a `private` schema so PostgREST cannot expose them as RPC endpoints, and `private.assign_role` is callable only from the SQL editor.

---

## Drill-down

Every card, funnel stage, chart segment and legend row is a button. Clicking opens a slide-over (a bottom sheet on mobile) containing a searchable table with **Name · Telephone · Amount (RM) · Status · Date · Documents**.

The table supports live search, status filtering, column sorting, CSV export (UTF-8 with BOM so Excel opens it correctly) and in-panel document preview. `Esc` closes the document preview first, then the panel; focus returns to whatever you clicked.

---

## Adding and editing

Each module page has an **Add** button, and every row in the module's main table has **Edit**. Commission lines have **Mark paid** / **Mark unpaid**.

Commissions are never entered by hand. A database trigger creates them from the factory dates: one introducer fee falls due 30 days after the disbursement, a second 30 days after the investment reaches HQ. Both the fee and the deal sizes come from the environment. Correcting a stage backwards removes the accrual but never deletes a commission that was genuinely paid.

---

## Where things live

| Path | What it does |
| --- | --- |
| `lib/config.ts` | Every commercially sensitive figure, read from the environment. Nothing here has a default |
| `lib/constants.ts` | Stage and status definitions, module labels and routes; monetary values are re-exported from `lib/config.ts` |
| `lib/metrics.ts` | **Single source of truth.** Every total, percentage, split and stage count is computed here and nowhere else |
| `lib/data.ts` | Fetches everything from Supabase in one pass and maps rows to domain types |
| `lib/drilldowns.ts` | Builds the record sets that open in the slide-over |
| `lib/supabase/` | Browser client, server client, and the session-refreshing proxy |
| `supabase/migrations/` | The schema, in order. `supabase db push` applies them |
| `supabase/tests/run.sh` | Applies every migration to a throwaway local Postgres and asserts the behaviour the DDL cannot show |
| `app/(dashboard)/` | Authenticated routes; the layout fetches data and profile once |
| `app/(dashboard)/actions.ts` | Server actions for create/update; authorisation is left to RLS |
| `app/login/` | Sign-in page and auth actions |
| `components/forms/` | Add/edit sheets per module |
| `app/globals.css` | Colour tokens for light and dark |

---

## Documents

Metadata lives in `public.documents`; files live in a **private** `documents` storage bucket laid out as `<module>/<record-id>/<filename>`. The first path segment is what the storage policy checks, so a CIO can only reach files belonging to their own module. The app requests one-hour signed URLs at render time — nothing is publicly addressable.

A `storage_path` beginning with `/` is a bundled sample file served by the app. The seeded demonstration records use these; anything uploaded later goes to the private bucket.

---

## Sample documents

`public/docs/*.pdf` are placeholders generated by `scripts/make-sample-docs.mjs` (real, valid PDFs so the preview genuinely renders). Regenerate with:

```bash
node scripts/make-sample-docs.mjs
```

---

## Known limitations

- **No audit trail on the business tables.** Several people hold edit rights and there is no change history for those records. Worth adding before these figures are quoted to investors.
- No self-service password reset yet — the super admin resets passwords from the Supabase dashboard.
- Document upload from the UI is not built; files can be placed in the bucket from the Supabase dashboard and referenced in `public.documents`.
- The pace projection is a straight-line run-rate, not a weighted forecast.
- Month labels come from `en-MY`, which renders September as "Sept".
