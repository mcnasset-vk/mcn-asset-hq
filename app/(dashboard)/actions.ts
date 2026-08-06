"use server";

import { revalidatePath } from "next/cache";

import {
  DELIVERABLE_CATEGORIES,
  LIFESTYLE_MONTHLY_FEE,
} from "@/lib/constants";
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

export async function saveMecRecord(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = orNull(formData.get("id"));
  const clientName = str(formData.get("client_name"));
  if (!clientName) return { error: "Client, sponsor or event name is required." };

  const status = str(formData.get("status")) || "enquiry";
  const units = orNull(formData.get("units"));

  const payload = {
    stream: str(formData.get("stream")) || "cec_ticketing",
    client_name: clientName,
    contact_person: str(formData.get("contact_person")),
    phone: str(formData.get("phone")),
    status,
    amount: numOr(formData.get("amount"), 0),
    units: units === null ? null : numOr(formData.get("units"), 0),
    unit_label: orNull(formData.get("unit_label")),
    // Clearing a date is how a status gets corrected backwards, so keep the
    // ladder consistent with the status rather than trusting stale inputs.
    contracted_at:
      status === "enquiry" ? null : orNull(formData.get("contracted_at")),
    invoiced_at:
      status === "invoiced" || status === "received"
        ? orNull(formData.get("invoiced_at"))
        : null,
    received_at:
      status === "received" ? orNull(formData.get("received_at")) : null,
    period_year: numOr(formData.get("period_year"), 2026),
    project_tier: orNull(formData.get("project_tier")),
    fee_stage: orNull(formData.get("fee_stage")),
    notes: orNull(formData.get("notes")),
  };

  const supabase = await createClient();

  // New deals are attributed to whoever entered them, so personal quotas add
  // up without anyone having to pick themselves from a list.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = id
    ? await supabase.from("mec_records").update(payload).eq("id", id)
    : await supabase
        .from("mec_records")
        .insert({ ...payload, owner_id: user?.id ?? null });

  if (error) return { error: describe(error.message) };
  refresh();
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* User management — super admin only                                          */
/* -------------------------------------------------------------------------- */

/**
 * Set one account's role, module and job title.
 *
 * Authorisation is the `profiles_update_admin` policy: a non-super-admin's
 * update matches no rows and changes nothing. The checks below exist to turn
 * silence into a readable message, not to be the boundary.
 */
export async function saveUserAccess(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = orNull(formData.get("id"));
  if (!id) return { error: "No account selected." };

  const role = str(formData.get("role")) || "pending";
  // Only a CIO carries a module, and only the MEC module has job titles.
  const rawModule = orNull(formData.get("module"));
  const scopedModule = role === "cio" ? rawModule : null;
  const rawTitle = orNull(formData.get("job_title"));
  const jobTitle = scopedModule === "mec" ? rawTitle : null;

  if (role === "cio" && !scopedModule) {
    return { error: "A CIO must be scoped to exactly one business line." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .update({ role, module: scopedModule, job_title: jobTitle })
    .eq("id", id)
    .select("id");

  if (error) return { error: describe(error.message) };

  // No error and no row means RLS filtered the update out — the caller is not
  // a super admin, or the account no longer exists.
  if (!data || data.length === 0) {
    return {
      error:
        "Nothing was updated. Only a super admin can change roles, and the account must still exist.",
    };
  }

  refresh();
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* MEC Lifestyle — operations desk                                             */
/* -------------------------------------------------------------------------- */

const flag = (v: FormDataEntryValue | null) => str(v) === "on";

/** Attribution for whoever is signed in. Never an access control. */
async function currentUserId(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function saveCecChampion(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = orNull(formData.get("id"));
  const name = str(formData.get("name"));
  if (!name) return { error: "CEC name is required." };

  const payload = {
    name,
    contact_details: str(formData.get("contact_details")),
    briefing_done: flag(formData.get("briefing_done")),
    photo_captured: flag(formData.get("photo_captured")),
    profile_secured: flag(formData.get("profile_secured")),
    handed_to_admin: flag(formData.get("handed_to_admin")),
    onboarded_at: orNull(formData.get("onboarded_at")),
    notes: orNull(formData.get("notes")),
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("cec_champions").update(payload).eq("id", id)
    : await supabase
        .from("cec_champions")
        .insert({ ...payload, owner_id: await currentUserId(supabase) });

  if (error) return { error: describe(error.message) };
  refresh();
  return { ok: true };
}

export async function saveLifestyleEvent(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = orNull(formData.get("id"));
  const name = str(formData.get("name"));
  if (!name) return { error: "Event name is required." };

  const payload = {
    name,
    activity_type: str(formData.get("activity_type")),
    lead_cec_id: orNull(formData.get("lead_cec_id")),
    event_date: orNull(formData.get("event_date")),
    location: str(formData.get("location")),
    support_status: str(formData.get("support_status")) || "planning",
    notes: orNull(formData.get("notes")),
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("lifestyle_events").update(payload).eq("id", id)
    : await supabase
        .from("lifestyle_events")
        .insert({ ...payload, owner_id: await currentUserId(supabase) });

  if (error) return { error: describe(error.message) };
  refresh();
  return { ok: true };
}

/** One row per call-out. `called_at` defaults to now() in the database. */
export async function logServiceCall(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const eventId = orNull(formData.get("event_id"));
  if (!eventId) return { error: "Pick the event you were called out for." };

  const supabase = await createClient();
  const { error } = await supabase.from("event_service_calls").insert({
    event_id: eventId,
    note: orNull(formData.get("note")),
    owner_id: await currentUserId(supabase),
  });

  if (error) return { error: describe(error.message) };
  refresh();
  return { ok: true };
}

export async function saveEventMedia(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = orNull(formData.get("id"));
  const eventId = orNull(formData.get("event_id"));
  if (!eventId) return { error: "Pick the event this media belongs to." };

  const payload = {
    event_id: eventId,
    has_photos: flag(formData.get("has_photos")),
    has_videos: flag(formData.get("has_videos")),
    media_url: orNull(formData.get("media_url")),
    // handed_off_at is stamped by trigger, never sent from the form.
    handed_off: flag(formData.get("handed_off")),
    notes: orNull(formData.get("notes")),
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("event_media").update(payload).eq("id", id)
    : await supabase
        .from("event_media")
        .insert({ ...payload, owner_id: await currentUserId(supabase) });

  if (error) return { error: describe(error.message) };
  refresh();
  return { ok: true };
}

export async function saveLifestyleInvoice(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = orNull(formData.get("id"));
  const month = numOr(formData.get("period_month"), 0);
  if (month < 1 || month > 12) return { error: "Pick an invoice month." };

  const payload = {
    period_year: numOr(formData.get("period_year"), 2026),
    period_month: month,
    // Falls back to the configured monthly fee, never a literal.
    amount: numOr(formData.get("amount"), LIFESTYLE_MONTHLY_FEE),
    document_url: orNull(formData.get("document_url")),
    // submitted_at is stamped by trigger when status becomes 'submitted'.
    status: str(formData.get("status")) || "draft",
    notes: orNull(formData.get("notes")),
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("lifestyle_invoices").update(payload).eq("id", id)
    : await supabase
        .from("lifestyle_invoices")
        .insert({ ...payload, owner_id: await currentUserId(supabase) });

  if (error) return { error: describe(error.message) };
  refresh();
  return { ok: true };
}

export async function saveDeliverable(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = orNull(formData.get("id"));
  const title = str(formData.get("title"));
  if (!title) return { error: "A title is required." };

  const category = str(formData.get("category")) || "edm_landing";
  const rateCard = DELIVERABLE_CATEGORIES.find((c) => c.key === category);
  if (!rateCard) return { error: "Unknown deliverable category." };

  const payload = {
    category,
    title,
    occurred_on: orNull(formData.get("occurred_on")) ?? undefined,
    link_url: orNull(formData.get("link_url")),
    write_up: orNull(formData.get("write_up")),
    platforms: orNull(formData.get("platforms")),
    cec_id: orNull(formData.get("cec_id")),
    calendar_invited: flag(formData.get("calendar_invited")),
    whatsapp_integrated: flag(formData.get("whatsapp_integrated")),
    notes: orNull(formData.get("notes")),
  };

  const supabase = await createClient();

  // The rate is stamped from the rate card on creation and deliberately left
  // alone on edit: correcting a typo must not silently reprice past work.
  const { error } = id
    ? await supabase.from("deliverables").update(payload).eq("id", id)
    : await supabase.from("deliverables").insert({
        ...payload,
        rate_applied: rateCard.rate,
        owner_id: await currentUserId(supabase),
      });

  if (error) return { error: describe(error.message) };
  refresh();
  return { ok: true };
}

export async function saveOpsSyncLog(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = orNull(formData.get("id"));

  const payload = {
    handoff_type: str(formData.get("handoff_type")) || "other",
    handoff_ref: orNull(formData.get("handoff_ref")),
    week_of: orNull(formData.get("week_of")) ?? undefined,
    status_note: orNull(formData.get("status_note")),
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("ops_sync_logs").update(payload).eq("id", id)
    : await supabase
        .from("ops_sync_logs")
        .insert({ ...payload, owner_id: await currentUserId(supabase) });

  if (error) return { error: describe(error.message) };
  refresh();
  return { ok: true };
}

export async function savePartnershipInitiative(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = orNull(formData.get("id"));
  const title = str(formData.get("title"));
  if (!title) return { error: "Initiative title is required." };

  const payload = {
    title,
    collaborator: str(formData.get("collaborator")),
    focus_area: str(formData.get("focus_area")) || "corporate_esg",
    status: str(formData.get("status")) || "in_progress",
    milestone_notes: orNull(formData.get("milestone_notes")),
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = id
    ? await supabase
        .from("partnership_initiatives")
        .update(payload)
        .eq("id", id)
    : await supabase
        .from("partnership_initiatives")
        .insert({ ...payload, owner_id: user?.id ?? null });

  if (error) return { error: describe(error.message) };
  refresh();
  return { ok: true };
}

export async function saveSynergyLog(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = orNull(formData.get("id"));
  const subsidiary = str(formData.get("subsidiary"));
  if (!subsidiary) return { error: "Group unit is required." };

  const payload = {
    subsidiary,
    reach_metric: numOr(formData.get("reach_metric"), 0),
    status: str(formData.get("status")) || "in_progress",
    notes: orNull(formData.get("notes")),
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = id
    ? await supabase.from("synergy_logs").update(payload).eq("id", id)
    : await supabase
        .from("synergy_logs")
        .insert({ ...payload, owner_id: user?.id ?? null });

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
