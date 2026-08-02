/**
 * Domain types for MCN Asset HQ.
 *
 * These shapes are deliberately close to the Phase 2 Supabase tables so the
 * migration from mock data to the database is a swap of the data source only —
 * nothing in `metrics.ts` or the components should need to change.
 */

/**
 * `pending` is the default for a newly created account: the person can sign in
 * but sees nothing until the super admin assigns them a scope.
 */
export type Role = "super_admin" | "cio" | "pending";

/** The three business lines. A CIO is scoped to exactly one of these. */
export type ModuleKey = "factory" | "mdna" | "nasdaq";

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  /** null for super_admin (sees everything), set for a CIO. */
  module: ModuleKey | null;
}

/* -------------------------------------------------------------------------- */
/* Documents                                                                   */
/* -------------------------------------------------------------------------- */

export type DocumentCategory =
  | "Official Letter"
  | "Agreement"
  | "Bank Slip"
  | "Company Profile"
  | "Financial Statement"
  | "Identity";

export interface DocumentRef {
  id: string;
  name: string;
  category: DocumentCategory;
  /** Phase 1: a file in /public. Phase 2: a signed Supabase Storage URL. */
  url: string;
  mimeType: "application/pdf" | "image/png" | "image/jpeg";
  sizeKb: number;
  uploadedAt: string; // ISO date
}

/* -------------------------------------------------------------------------- */
/* Factory Cosif                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The four-stage onboarding pipeline. Order matters — `stageRank` in
 * metrics.ts relies on this exact sequence.
 */
export type FactoryStage =
  | "submitted"   // Documents submitted
  | "processing"  // In the 2–3 month processing window
  | "disbursed"   // RM4M disbursed to the factory
  | "invested";   // RM1M invested into MCN Asset HQ

export interface FactoryDeal {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  introducerName: string;
  introducerPhone: string;
  stage: FactoryStage;
  submittedAt: string;
  processingStartedAt: string | null;
  /** End of the expected 2–3 month window. Past this date = stalled. */
  expectedDisbursementAt: string | null;
  disbursedAt: string | null;
  investedAt: string | null;
  /** Facility disbursed to the factory. Standard RM4,000,000. */
  disbursementAmount: number;
  /** Portion invested into MCN Asset HQ. Standard RM1,000,000. */
  hqInvestmentAmount: number;
  documents: DocumentRef[];
  notes?: string;
}

/* -------------------------------------------------------------------------- */
/* MDNA Senior Co-Living                                                       */
/* -------------------------------------------------------------------------- */

export type MdnaStatus =
  | "prospect"  // In discussion, nothing signed
  | "signed"    // Package agreement signed
  | "paid"      // RM500k package paid in full
  | "invested"; // RM50k landed in MCN Asset HQ

export interface MdnaMember {
  id: string;
  memberName: string;
  phone: string;
  status: MdnaStatus;
  /** Standard RM500,000 package. */
  packageAmount: number;
  /** Portion invested into MCN Asset HQ. Standard RM50,000. */
  hqInvestmentAmount: number;
  signedAt: string | null;
  paidAt: string | null;
  investedAt: string | null;
  referrer: string;
  documents: DocumentRef[];
  notes?: string;
}

/* -------------------------------------------------------------------------- */
/* Nasdaq listing M&A                                                          */
/* -------------------------------------------------------------------------- */

export type NasdaqStatus =
  | "in_discussion"
  | "loi_signed"
  | "due_diligence"
  | "agreed"
  | "onboarded";

export interface NasdaqCompany {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  sector: string;
  status: NasdaqStatus;
  /** Profit-after-tax this company contributes to the RM6M group target. */
  patContribution: number;
  agreedAt: string | null;
  documents: DocumentRef[];
  notes?: string;
}

/* -------------------------------------------------------------------------- */
/* Introducer commissions                                                      */
/* -------------------------------------------------------------------------- */

export type CommissionTrigger = "disbursement" | "investment";
export type CommissionStatus = "accrued" | "paid";

export interface Commission {
  id: string;
  factoryDealId: string;
  factoryName: string;
  introducerName: string;
  introducerPhone: string;
  /** RM5,000 on RM4M disbursement, RM5,000 on the RM1M HQ investment. */
  trigger: CommissionTrigger;
  amount: number;
  status: CommissionStatus;
  dueAt: string;
  paidAt: string | null;
  documents: DocumentRef[];
}

/* -------------------------------------------------------------------------- */
/* Drill-down                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The normalised row shape rendered by `RecordsTable`. Every module maps its
 * own records into this so there is exactly one table implementation.
 */
export interface DrillRow {
  id: string;
  /** Company or individual name. */
  name: string;
  /** Secondary line under the name (contact person, referrer, sector…). */
  subtitle?: string;
  phone: string;
  amount: number;
  /** Label shown under the amount, e.g. "into HQ" or "PAT". */
  amountLabel?: string;
  statusLabel: string;
  statusTone: Tone;
  date: string | null;
  dateLabel?: string;
  documents: DocumentRef[];
  /** Rendered as a warning strip on the row, e.g. an overdue factory. */
  flag?: string;
}

export type Tone =
  | "received"
  | "committed"
  | "risk"
  | "stalled"
  | "idle"
  | "accent";

export interface DrillDownContent {
  title: string;
  subtitle?: string;
  /** Headline figure for the panel, already summed by metrics.ts. */
  total?: number;
  totalLabel?: string;
  rows: DrillRow[];
  /** Column header above the amount column, e.g. "Amount into HQ (RM)". */
  amountHeader?: string;
  /**
   * Set when the rows mix units (e.g. RM capital alongside RM profit-after-tax)
   * so the table does not print a sum that adds unlike things together.
   */
  hideTotal?: boolean;
  /**
   * Optional per-row button — "Edit" on a module page, "Mark paid" on the
   * commission ledger. Client-side only; never crosses the server boundary.
   */
  rowAction?: {
    label: (row: DrillRow) => string;
    run: (row: DrillRow) => void;
  };
}
