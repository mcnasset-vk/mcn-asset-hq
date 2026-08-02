import "server-only";

import { createClient } from "./supabase/server";
import type {
  Commission,
  DocumentRef,
  FactoryDeal,
  MdnaMember,
  NasdaqCompany,
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
}

export const EMPTY_DATA: DashboardData = {
  factories: [],
  members: [],
  companies: [],
  commissions: [],
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

  const [factories, members, companies, commissions, documents] =
    await Promise.all([
      supabase.from("factory_deals").select("*").order("submitted_at"),
      supabase.from("mdna_members").select("*").order("member_name"),
      supabase.from("nasdaq_companies").select("*").order("company_name"),
      supabase
        .from("commissions")
        .select("*, factory_deals(company_name)")
        .order("due_at"),
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

function mapCommission(
  row: Record<string, unknown>,
  docs: Map<string, DocumentRef[]>,
): Commission {
  const id = row.id as string;
  const joined = row.factory_deals as { company_name?: string } | null;
  return {
    id,
    factoryDealId: row.factory_deal_id as string,
    factoryName: joined?.company_name ?? "—",
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

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, module")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    fullName: data.full_name,
    email: data.email,
    role: data.role,
    module: data.module,
  };
}
