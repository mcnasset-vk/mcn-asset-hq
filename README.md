# MCN Asset HQ — Capital & Pipeline Dashboard

Executive dashboard tracking the **RM20,000,000 capital raise (deadline 30 November 2026)**, the Factory Cosif pipeline, MDNA Senior Co-Living packages, the Nasdaq listing M&A programme, and introducer commissions.

Live on Supabase: email + password sign-in, per-module access enforced in the database, add/edit forms, and private document storage.

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

## Accounts and access

There is **no public sign-up**. The super admin creates accounts; everyone else starts as `pending` and sees a "waiting for access" screen until given a scope.

| Role | Sees |
| --- | --- |
| `super_admin` | Everything — combined RM20M view, all three modules, the commission ledger |
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
| `lib/constants.ts` | Business rules: RM20M target, deadline, RM1M / RM50k / RM5k amounts, stage definitions |
| `lib/metrics.ts` | **Single source of truth.** Every total, percentage, split and stage count is computed here and nowhere else |
| `lib/data.ts` | Fetches everything from Supabase in one pass and maps rows to domain types |
| `lib/drilldowns.ts` | Builds the record sets that open in the slide-over |
| `lib/supabase/` | Browser client, server client, and the session-refreshing proxy |
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

- **No audit trail.** Three CIOs have edit rights and there is no change history. Worth adding before these figures are quoted to investors.
- No self-service password reset yet — the super admin resets passwords from the Supabase dashboard.
- Document upload from the UI is not built; files can be placed in the bucket from the Supabase dashboard and referenced in `public.documents`.
- The pace projection is a straight-line run-rate, not a weighted forecast.
- Month labels come from `en-MY`, which renders September as "Sept".
