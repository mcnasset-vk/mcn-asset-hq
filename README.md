# MCN Asset HQ — Capital & Pipeline Dashboard

Executive dashboard tracking the **RM20,000,000 capital raise (deadline 30 November 2026)**, the Factory Cosif pipeline, MDNA Senior Co-Living packages, the Nasdaq listing M&A programme, introducer commissions, and the **成交资本7步** value framework the raise is run against.

Live on Supabase: email + password sign-in, per-module access enforced in the database, add/edit forms, and private document storage.

**Production:** <https://mcn-asset-hq.vercel.app>

---

## Deployment

Hosted on Vercel, connected to this GitHub repo — pushing to `main` deploys automatically.

Two environment variables must be set in the Vercel project (Production, Preview and Development): `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. They are not in the repo.

Two settings that are easy to get wrong:

- **Framework preset must be `Next.js`.** Creating the project with `vercel project add` leaves it unset, and the build then succeeds while every route returns 404 — Vercel runs `next build` but serves the output as plain static files.
- **Deployment Protection is off.** With Vercel Authentication on, visitors must sign into Vercel *before* reaching the login page, which locks out every CIO. Access control is Supabase auth plus row level security.

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

Only two things count toward the RM20,000,000 target:

| Source | Into MCN Asset HQ | Counted as **Committed** when | Counted as **Received** when |
| --- | --- | --- | --- |
| Factory Cosif | RM1,000,000 (from the RM4M facility) | stage reaches `RM4M Disbursed` | stage reaches `RM1M Invested` |
| MDNA Senior Co-Living | RM50,000 (from the RM500k package) | member `Signed` | member `Invested` |
| Nasdaq M&A | **RM0** | — | — |

Nasdaq is measured in **profit-after-tax** against a separate RM6,000,000 target. PAT is not capital, so it never touches the RM20M figure — mixing the two would overstate the raise.

`Received` is always a subset of `Committed`. The hatched band on the progress bar is the difference: money committed but not yet in the bank.

---

## 成交资本7步 — the seven steps to closing capital

Framework: **《创造企业价值～成交资本7步》**, OE Edugroup 杰青商学院 (实战 · 易学 · 落地).

The RM20M figure says how much money has arrived. It says nothing about whether the enterprise behind it is in a state where the rest can be closed. `/seven-steps` is that second view, and it is the framework the raise is run against:

| # | 步骤 | Step | Scored from |
| --- | --- | --- | --- |
| 1 | 成交信任～建立企业信用 | Close Trust — build enterprise credit | Capital that has cleared into HQ, against RM20M |
| 2 | 成交品牌～建立企业影响力 | Close Brand — build influence | Counterparties engaged across all three modules |
| 3 | 成交组织～建立高绩效团队 | Close Organisation — build the team | Introducers and referrers with a closed deal |
| 4 | 成交系统～建立可复制经营模式 | Close System — replicable model | Funnel completion rate, less what stalls in it |
| 5 | 成交价值～持续创造社会价值 | Close Value — social value | Senior Co-Living places funded in full |
| 6 | 成交生态～共创共赢、彼此成就 | Close Ecosystem — win together | Commission actually paid to introducers |
| 7 | 成交传承～建立永续发展的企业 | Close Legacy — perpetual enterprise | PAT committed to the listing vehicle, against RM6M |

### No step can be ticked off by hand

Every score is computed in `lib/metrics.ts` from records already in this dashboard. Move a factory to `invested` and step 1 moves. Pay an introducer and step 6 moves. Let a factory stall past its window and step 4 falls. A step reaching 80% is *earned* by the pipeline, which is the whole point — a wall chart of seven aspirations would be worth nothing to an investor.

`public.capital_steps` therefore stores no score and no status. It holds only the plan a human maintains: **owner · next action · target date · notes**. There is no form field anywhere that writes a score.

Four denominators are house assumptions rather than board figures — reach, productive introducers, funnel throughput and co-living places. They live in `lib/constants.ts` (`BRAND_REACH_TARGET`, `ORGANISATION_INTRODUCER_TARGET`, `SYSTEM_THROUGHPUT_TARGET`, `SOCIAL_PLACES_TARGET`); change one and every score, bar and reading follows. Steps 1 and 7 measure against the RM20M and RM6M targets already in use.

The headline **capital readiness index** is the equal-weighted mean of the seven scores, so a strong step never buys off a weak one. The overview page names the weakest step, because that is the binding constraint on the raise.

### Super admin only

The seven scores are computed across every module at once. A CIO reading them through their own row filter would see an index built from a quarter of the data and believe it, so `capital_steps` is readable by the super admin alone — enforced by row level security, not just by hiding the nav item.

### Applying it

The table, its seed rows, trigger and policies are in `supabase/migrations/20260805000000_capital_steps.sql`. Paste it into the Supabase SQL editor (or `supabase db push`). It is idempotent and creates its own `private.is_capital_admin()` helper rather than redefining an existing one.

---

## Accounts and access

There is **no public sign-up**. The super admin creates accounts; everyone else starts as `pending` and sees a "waiting for access" screen until given a scope.

| Role | Sees |
| --- | --- |
| `super_admin` | Everything — combined RM20M view, all three modules, the commission ledger, the 成交资本7步 scorecard |
| `cio` (one module) | Only their own module; lands there on sign-in |
| `pending` | Nothing until assigned |

**Creating the first account** — in the Supabase dashboard, *Authentication → Users → Add user*, set your own password, then in the SQL editor:

```sql
select private.assign_role('you@example.com', 'super_admin');
```

**Adding a CIO** — create the user the same way, then:

```sql
select private.assign_role('serena@example.com', 'cio', 'factory');
-- modules: 'factory' | 'mdna' | 'nasdaq'
```

### Access is enforced in the database

Every table has row level security. A CIO scoped to `mdna` gets **zero rows** from `factory_deals` even if they call the REST API directly with their own token — the app hiding a menu item is a convenience, not the boundary.

Helper functions live in a `private` schema so PostgREST cannot expose them as RPC endpoints, and `private.assign_role` is callable only from the SQL editor.

---

## Drill-down

Every card, funnel stage, chart segment and legend row is a button. Clicking opens a slide-over (a bottom sheet on mobile) containing a searchable table with **Name · Telephone · Amount (RM) · Status · Date · Documents**.

The table supports live search, status filtering, column sorting, CSV export (UTF-8 with BOM so Excel opens it correctly) and in-panel document preview. `Esc` closes the document preview first, then the panel; focus returns to whatever you clicked.

---

## Adding and editing

Each module page has an **Add** button, and every row in the module's main table has **Edit**. Commission lines have **Mark paid** / **Mark unpaid**.

Commissions are never entered by hand. A database trigger creates them from the factory dates: RM5,000 falls due 30 days after the RM4M disbursement, RM5,000 more 30 days after the RM1M reaches HQ. Correcting a stage backwards removes the accrual but never deletes a commission that was genuinely paid.

---

## Where things live

| Path | What it does |
| --- | --- |
| `lib/constants.ts` | Business rules: RM20M target, deadline, RM1M / RM50k / RM5k amounts, stage definitions, the seven 成交资本7步 steps and their denominators |
| `lib/metrics.ts` | **Single source of truth.** Every total, percentage, split and stage count is computed here and nowhere else |
| `lib/data.ts` | Fetches everything from Supabase in one pass and maps rows to domain types |
| `lib/drilldowns.ts` | Builds the record sets that open in the slide-over |
| `lib/supabase/` | Browser client, server client, and the session-refreshing proxy |
| `supabase/migrations/` | Schema changes, applied in the Supabase SQL editor |
| `app/(dashboard)/` | Authenticated routes; the layout fetches data and profile once |
| `app/(dashboard)/seven-steps/` | The 成交资本7步 scorecard, super admin only |
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

- **No audit trail.** Three CIOs have edit rights and there is no change history. Worth adding before these figures are quoted to investors. (`capital_steps` is the exception — it stamps `updated_at` / `updated_by` on every edit.)
- **Four of the seven-step denominators are assumptions**, not board-approved figures. They are defensible starting points, not agreed targets — settle them with the board before the readiness index is shown to anyone outside.
- **Only `capital_steps` has its schema in version control.** The original tables were applied through the SQL editor and were never captured as migrations; `supabase/migrations/` starts here.
- No self-service password reset yet — the super admin resets passwords from the Supabase dashboard.
- Document upload from the UI is not built; files can be placed in the bucket from the Supabase dashboard and referenced in `public.documents`.
- The pace projection is a straight-line run-rate, not a weighted forecast.
- Month labels come from `en-MY`, which renders September as "Sept".
