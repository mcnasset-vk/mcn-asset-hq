"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export interface FormState {
  ok?: boolean;
  error?: string;
}

const str = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const orNull = (v: FormDataEntryValue | null) => {
  const s = str(v);
  return s === "" ? null : s;
};
const numOr = (v: FormDataEntryValue | null, fallback: number) => {
  const n = Number(str(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

/** Every mutation refreshes the layout, which is where the data is fetched. */
function refresh() {
  revalidatePath("/", "layout");
}

/**
 * All four actions rely on row level security for authorisation: a CIO's
 * insert or update simply fails if the row is outside their module, so there
 * is no permission check to forget here.
 */

export async function saveFactoryDeal(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = orNull(formData.get("id"));
  const companyName = str(formData.get("company_name"));
  if (!companyName) return { error: "Company name is required." };

  const stage = str(formData.get("stage")) || "submitted";

  const payload = {
    company_name: companyName,
    contact_person: str(formData.get("contact_person")),
    phone: str(formData.get("phone")),
    introducer_name: str(formData.get("introducer_name")),
    introducer_phone: str(formData.get("introducer_phone")),
    stage,
    submitted_at: orNull(formData.get("submitted_at")) ?? undefined,
    processing_started_at: orNull(formData.get("processing_started_at")),
    expected_disbursement_at: orNull(formData.get("expected_disbursement_at")),
    // Clearing a date is how a stage gets corrected backwards; the commission
    // trigger reads these, so keep them consistent with the stage.
    disbursed_at:
      stage === "disbursed" || stage === "invested"
        ? orNull(formData.get("disbursed_at"))
        : null,
    invested_at:
      stage === "invested" ? orNull(formData.get("invested_at")) : null,
    disbursement_amount: numOr(formData.get("disbursement_amount"), 4_000_000),
    hq_investment_amount: numOr(formData.get("hq_investment_amount"), 1_000_000),
    notes: orNull(formData.get("notes")),
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("factory_deals").update(payload).eq("id", id)
    : await supabase.from("factory_deals").insert(payload);

  if (error) return { error: describe(error.message) };
  refresh();
  return { ok: true };
}

export async function saveMdnaMember(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = orNull(formData.get("id"));
  const memberName = str(formData.get("member_name"));
  if (!memberName) return { error: "Member name is required." };

  const status = str(formData.get("status")) || "prospect";

  const payload = {
    member_name: memberName,
    phone: str(formData.get("phone")),
    status,
    referrer: str(formData.get("referrer")),
    package_amount: numOr(formData.get("package_amount"), 500_000),
    hq_investment_amount: numOr(formData.get("hq_investment_amount"), 50_000),
    signed_at:
      status === "prospect" ? null : orNull(formData.get("signed_at")),
    paid_at:
      status === "paid" || status === "invested"
        ? orNull(formData.get("paid_at"))
        : null,
    invested_at:
      status === "invested" ? orNull(formData.get("invested_at")) : null,
    notes: orNull(formData.get("notes")),
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("mdna_members").update(payload).eq("id", id)
    : await supabase.from("mdna_members").insert(payload);

  if (error) return { error: describe(error.message) };
  refresh();
  return { ok: true };
}

export async function saveNasdaqCompany(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = orNull(formData.get("id"));
  const companyName = str(formData.get("company_name"));
  if (!companyName) return { error: "Company name is required." };

  const status = str(formData.get("status")) || "in_discussion";

  const payload = {
    company_name: companyName,
    contact_person: str(formData.get("contact_person")),
    phone: str(formData.get("phone")),
    sector: str(formData.get("sector")),
    status,
    pat_contribution: numOr(formData.get("pat_contribution"), 0),
    agreed_at:
      status === "agreed" || status === "onboarded"
        ? orNull(formData.get("agreed_at"))
        : null,
    notes: orNull(formData.get("notes")),
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("nasdaq_companies").update(payload).eq("id", id)
    : await supabase.from("nasdaq_companies").insert(payload);

  if (error) return { error: describe(error.message) };
  refresh();
  return { ok: true };
}

/** Settle or un-settle a commission line. Super admin only, enforced by RLS. */
export async function setCommissionPaid(
  commissionId: string,
  paid: boolean,
): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("commissions")
    .update(
      paid
        ? { status: "paid", paid_at: new Date().toISOString().slice(0, 10) }
        : { status: "accrued", paid_at: null },
    )
    .eq("id", commissionId);

  if (error) return { error: describe(error.message) };
  refresh();
  return { ok: true };
}

/** Turn Postgres errors into something an executive can act on. */
function describe(message: string): string {
  if (/row-level security/i.test(message)) {
    return "You do not have permission to change records in this module.";
  }
  if (/profiles_module_matches_role/i.test(message)) {
    return "That role and module combination is not allowed.";
  }
  if (/violates check constraint/i.test(message)) {
    return "Some values are out of range. Check the amounts and dates.";
  }
  return message;
}
