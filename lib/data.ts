import "server-only";

import { createClient } from "./supabase/server";
import type {
  CecChampion,
  Commission,
  Deliverable,
  DocumentRef,
  OpsSyncLog,
  EventMedia,
  EventServiceCall,
  FactoryDeal,
  LifestyleEvent,
  LifestyleInvoice,
  MdnaMember,
  MecRecord,
  NasdaqCompany,
  PartnershipInitiative,
  SynergyLog,
  UserProfile,
} from "./types";

/**
 * Everything the dashboard renders, fetched in one pass.
 *
 * Row level security does the filtering: a CIO's queries simply return no rows
 * for the modules they are not scoped to, so the arrays arrive already
 * restricted without the app asking for anything special.
 */
export interface DashboardData {
  factories: FactoryDeal[];
  members: MdnaMember[];
  companies: NasdaqCompany[];
  commissions: Commission[];
  mec: MecRecord[];
  /** MEC partnership desk. Neither carries money. */
  initiatives: PartnershipInitiative[];
  synergy: SynergyLog[];
  /** MEC Lifestyle operations desk. */
  cecs: CecChampion[];
  events: LifestyleEvent[];
  serviceCalls: EventServiceCall[];
  media: EventMedia[];
  /** The monthly service fee. A cost, never revenue. */
  invoices: LifestyleInvoice[];
  /** Ops Admin deliverable log and sync notes. */
  deliverables: Deliverable[];
  syncLogs: OpsSyncLog[];
}

export const EMPTY_DATA: DashboardData = {
  factories: [],
  members: [],
  companies: [],
  commissions: [],
  mec: [],
  initiatives: [],
  synergy: [],
  cecs: [],
  events: [],
  serviceCalls: [],
  media: [],
  invoices: [],
  deliverables: [],
  syncLogs: [],
};

/* -------------------------------------------------------------------------- */
/* Row shapes as they come back from Postgres                                  */
/* -------------------------------------------------------------------------- */

type DocumentRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  name: string;
  category: string;
  storage_path: string;
  mime_type: string;
  size_kb: number;
  uploaded_at: string;
};

/** Signed URLs are short-lived; one hour comfortably covers a working session. */
const SIGNED_URL_TTL = 3600;

/**
 * A path beginning with "/" is a bundled sample file served by the app.
 * Anything else is an object in the private bucket and needs a signed URL.
 */
function isBundledSample(path: string): boolean {
  return path.startsWith("/");
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();

  const [
    factories,
    members,
    companies,
    commissions,
    mec,
    initiatives,
    synergy,
    cecs,
    events,
    serviceCalls,
    media,
    invoices,
    deliverables,
    syncLogs,
    documents,
  ] = await Promise.all([
    supabase.from("factory_deals").select("*").order("submitted_at"),
    supabase.from("mdna_members").select("*").order("member_name"),
    supabase.from("nasdaq_companies").select("*").order("company_name"),
    supabase.from("commissions").select("*").order("due_at"),
    supabase.from("mec_records").select("*").order("client_name"),
    supabase.from("partnership_initiatives").select("*").order("created_at"),
    supabase.from("synergy_logs").select("*").order("created_at"),
    supabase.from("cec_champions").select("*").order("name"),
    supabase.from("lifestyle_events").select("*").order("event_date"),
    supabase.from("event_service_calls").select("*").order("called_at"),
    supabase.from("event_media").select("*").order("created_at"),
    supabase.from("lifestyle_invoices").select("*").order("period_month"),
    supabase.from("deliverables").select("*").order("occurred_on"),
    supabase.from("ops_sync_logs").select("*").order("week_of"),
    supabase.from("documents").select("*").order("uploaded_at"),
  ]);

  const docs = await buildDocumentIndex(
    (documents.data ?? []) as DocumentRow[],
    supabase,
  );

  return {
    factories: (factories.data ?? []).map((row) => mapFactory(row, docs)),
    members: (members.data ?? []).map((row) => mapMember(row, docs)),
    companies: (companies.data ?? []).map((row) => mapCompany(row, docs)),
    commissions: (commissions.data ?? []).map((row) =>
      mapCommission(row, docs),
    ),
    mec: (mec.data ?? []).map((row) => mapMecRecord(row, docs)),
    initiatives: (initiatives.data ?? []).map(mapInitiative),
    synergy: (synergy.data ?? []).map(mapSynergyLog),
    cecs: (cecs.data ?? []).map(mapCec),
    events: (events.data ?? []).map(mapEvent),
    serviceCalls: (serviceCalls.data ?? []).map(mapServiceCall),
    media: (media.data ?? []).map(mapMedia),
    invoices: (invoices.data ?? []).map(mapInvoice),
    deliverables: (deliverables.data ?? []).map(mapDeliverable),
    syncLogs: (syncLogs.data ?? []).map(mapSyncLog),
  };
}

/** Groups documents by their owning record, resolving storage URLs in bulk. */
async function buildDocumentIndex(
  rows: DocumentRow[],
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Map<string, DocumentRef[]>> {
  const stored = rows.filter((r) => !isBundledSample(r.storage_path));
  const signed = new Map<string, string>();

  if (stored.length > 0) {
    const paths = [...new Set(stored.map((r) => r.storage_path))];
    const { data } = await supabase.storage
      .from("documents")
      .createSignedUrls(paths, SIGNED_URL_TTL);

    for (const entry of data ?? []) {
      if (entry.signedUrl && entry.path) signed.set(entry.path, entry.signedUrl);
    }
  }

  const index = new Map<string, DocumentRef[]>();
  for (const row of rows) {
    const url = isBundledSample(row.storage_path)
      ? row.storage_path
      : (signed.get(row.storage_path) ?? "");

    // A stored file with no signed URL means storage denied access; skip it
    // rather than rendering a preview button that cannot open.
    if (!url) continue;

    const list = index.get(row.entity_id) ?? [];
    list.push({
      id: row.id,
      name: row.name,
      category: row.category as DocumentRef["category"],
      url,
      mimeType: row.mime_type as DocumentRef["mimeType"],
      sizeKb: row.size_kb,
      uploadedAt: row.uploaded_at,
    });
    index.set(row.entity_id, list);
  }
  return index;
}

/* -------------------------------------------------------------------------- */
/* Row → domain mappers                                                        */
/* -------------------------------------------------------------------------- */

const n = (value: unknown): number => Number(value ?? 0);

function mapFactory(
  row: Record<string, unknown>,
  docs: Map<string, DocumentRef[]>,
): FactoryDeal {
  const id = row.id as string;
  return {
    id,
    companyName: row.company_name as string,
    contactPerson: row.contact_person as string,
    phone: row.phone as string,
    introducerName: row.introducer_name as string,
    introducerPhone: row.introducer_phone as string,
    stage: row.stage as FactoryDeal["stage"],
    submittedAt: row.submitted_at as string,
    processingStartedAt: (row.processing_started_at as string) ?? null,
    expectedDisbursementAt: (row.expected_disbursement_at as string) ?? null,
    disbursedAt: (row.disbursed_at as string) ?? null,
    investedAt: (row.invested_at as string) ?? null,
    disbursementAmount: n(row.disbursement_amount),
    hqInvestmentAmount: n(row.hq_investment_amount),
    documents: docs.get(id) ?? [],
    notes: (row.notes as string) ?? undefined,
  };
}

function mapMember(
  row: Record<string, unknown>,
  docs: Map<string, DocumentRef[]>,
): MdnaMember {
  const id = row.id as string;
  return {
    id,
    memberName: row.member_name as string,
    phone: row.phone as string,
    status: row.status as MdnaMember["status"],
    packageAmount: n(row.package_amount),
    hqInvestmentAmount: n(row.hq_investment_amount),
    signedAt: (row.signed_at as string) ?? null,
    paidAt: (row.paid_at as string) ?? null,
    investedAt: (row.invested_at as string) ?? null,
    referrer: row.referrer as string,
    documents: docs.get(id) ?? [],
    notes: (row.notes as string) ?? undefined,
  };
}

function mapCompany(
  row: Record<string, unknown>,
  docs: Map<string, DocumentRef[]>,
): NasdaqCompany {
  const id = row.id as string;
  return {
    id,
    companyName: row.company_name as string,
    contactPerson: row.contact_person as string,
    phone: row.phone as string,
    sector: row.sector as string,
    status: row.status as NasdaqCompany["status"],
    patContribution: n(row.pat_contribution),
    agreedAt: (row.agreed_at as string) ?? null,
    documents: docs.get(id) ?? [],
    notes: (row.notes as string) ?? undefined,
  };
}

function mapMecRecord(
  row: Record<string, unknown>,
  docs: Map<string, DocumentRef[]>,
): MecRecord {
  const id = row.id as string;
  return {
    id,
    stream: row.stream as MecRecord["stream"],
    clientName: row.client_name as string,
    contactPerson: row.contact_person as string,
    phone: row.phone as string,
    status: row.status as MecRecord["status"],
    amount: n(row.amount),
    units: row.units === null || row.units === undefined ? null : n(row.units),
    unitLabel: (row.unit_label as string) ?? null,
    contractedAt: (row.contracted_at as string) ?? null,
    invoicedAt: (row.invoiced_at as string) ?? null,
    receivedAt: (row.received_at as string) ?? null,
    periodYear: n(row.period_year),
    ownerId: (row.owner_id as string) ?? null,
    projectTier: (row.project_tier as MecRecord["projectTier"]) ?? null,
    feeStage: (row.fee_stage as MecRecord["feeStage"]) ?? null,
    documents: docs.get(id) ?? [],
    notes: (row.notes as string) ?? undefined,
  };
}

function mapInitiative(row: Record<string, unknown>): PartnershipInitiative {
  return {
    id: row.id as string,
    title: row.title as string,
    collaborator: row.collaborator as string,
    focusArea: row.focus_area as PartnershipInitiative["focusArea"],
    status: row.status as PartnershipInitiative["status"],
    milestoneNotes: (row.milestone_notes as string) ?? null,
    ownerId: (row.owner_id as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

const bool = (v: unknown): boolean => v === true;

function mapCec(row: Record<string, unknown>): CecChampion {
  return {
    id: row.id as string,
    name: row.name as string,
    contactDetails: row.contact_details as string,
    briefingDone: bool(row.briefing_done),
    photoCaptured: bool(row.photo_captured),
    profileSecured: bool(row.profile_secured),
    handedToAdmin: bool(row.handed_to_admin),
    onboardedAt: (row.onboarded_at as string) ?? null,
    notes: (row.notes as string) ?? null,
    ownerId: (row.owner_id as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapEvent(row: Record<string, unknown>): LifestyleEvent {
  return {
    id: row.id as string,
    name: row.name as string,
    activityType: row.activity_type as string,
    leadCecId: (row.lead_cec_id as string) ?? null,
    eventDate: (row.event_date as string) ?? null,
    location: row.location as string,
    supportStatus: row.support_status as LifestyleEvent["supportStatus"],
    notes: (row.notes as string) ?? null,
    ownerId: (row.owner_id as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapServiceCall(row: Record<string, unknown>): EventServiceCall {
  return {
    id: row.id as string,
    eventId: row.event_id as string,
    calledAt: row.called_at as string,
    note: (row.note as string) ?? null,
    ownerId: (row.owner_id as string) ?? null,
  };
}

function mapMedia(row: Record<string, unknown>): EventMedia {
  return {
    id: row.id as string,
    eventId: row.event_id as string,
    hasPhotos: bool(row.has_photos),
    hasVideos: bool(row.has_videos),
    mediaUrl: (row.media_url as string) ?? null,
    handedOff: bool(row.handed_off),
    handedOffAt: (row.handed_off_at as string) ?? null,
    notes: (row.notes as string) ?? null,
    ownerId: (row.owner_id as string) ?? null,
  };
}

function mapInvoice(row: Record<string, unknown>): LifestyleInvoice {
  return {
    id: row.id as string,
    periodYear: n(row.period_year),
    periodMonth: n(row.period_month),
    amount: n(row.amount),
    documentUrl: (row.document_url as string) ?? null,
    status: row.status as LifestyleInvoice["status"],
    submittedAt: (row.submitted_at as string) ?? null,
    notes: (row.notes as string) ?? null,
    ownerId: (row.owner_id as string) ?? null,
  };
}

function mapDeliverable(row: Record<string, unknown>): Deliverable {
  return {
    id: row.id as string,
    category: row.category as Deliverable["category"],
    title: row.title as string,
    occurredOn: row.occurred_on as string,
    linkUrl: (row.link_url as string) ?? null,
    writeUp: (row.write_up as string) ?? null,
    platforms: (row.platforms as string) ?? null,
    cecId: (row.cec_id as string) ?? null,
    calendarInvited: bool(row.calendar_invited),
    whatsappIntegrated: bool(row.whatsapp_integrated),
    rateApplied: n(row.rate_applied),
    invoiceId: (row.invoice_id as string) ?? null,
    notes: (row.notes as string) ?? null,
    ownerId: (row.owner_id as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapSyncLog(row: Record<string, unknown>): OpsSyncLog {
  return {
    id: row.id as string,
    handoffType: row.handoff_type as OpsSyncLog["handoffType"],
    handoffRef: (row.handoff_ref as string) ?? null,
    weekOf: row.week_of as string,
    statusNote: (row.status_note as string) ?? null,
    ownerId: (row.owner_id as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapSynergyLog(row: Record<string, unknown>): SynergyLog {
  return {
    id: row.id as string,
    subsidiary: row.subsidiary as string,
    reachMetric: n(row.reach_metric),
    status: row.status as SynergyLog["status"],
    notes: (row.notes as string) ?? null,
    ownerId: (row.owner_id as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapCommission(
  row: Record<string, unknown>,
  docs: Map<string, DocumentRef[]>,
): Commission {
  const id = row.id as string;
  return {
    id,
    factoryDealId: row.factory_deal_id as string,
    factoryName: (row.factory_name as string) || "—",
    introducerName: row.introducer_name as string,
    introducerPhone: row.introducer_phone as string,
    trigger: row.trigger_event as Commission["trigger"],
    amount: n(row.amount),
    status: row.status as Commission["status"],
    dueAt: row.due_at as string,
    paidAt: (row.paid_at as string) ?? null,
    documents: docs.get(id) ?? [],
  };
}

/* -------------------------------------------------------------------------- */
/* Signed-in user                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Every account, for the user management page.
 *
 * Returns only what the caller may see: the profiles SELECT policy gives a
 * super admin every row and everyone else just their own, so a CIO calling
 * this gets a one-row list rather than an error.
 */
export async function getAllProfiles(): Promise<UserProfile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at");

  return (data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    module: row.module,
    jobTitle: row.job_title ?? null,
  }));
}

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Deliberately `*` rather than a column list: naming `job_title` explicitly
  // makes the whole query fail with 42703 on a database where that column does
  // not exist yet, which returns a null profile and locks everyone out. With
  // `*` a missing column is simply absent and the title falls back to null.
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    fullName: data.full_name,
    email: data.email,
    role: data.role,
    module: data.module,
    jobTitle: data.job_title ?? null,
  };
}
