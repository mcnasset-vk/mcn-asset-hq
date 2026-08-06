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

/**
 * The scopes a CIO can hold. Four are business lines; `commissions` is the
 * introducer payment run, which sees the commission ledger only.
 */
export type ModuleKey =
  | "factory"
  | "mdna"
  | "nasdaq"
  | "commissions"
  | "mec";

/**
 * A role *within* a module. It decides which dashboard renders and nothing
 * else — access is `private.can_access()` in Postgres, which never reads this.
 * Null means the standard module view.
 */
export type JobTitle =
  | "chief_strategic_partnership_director"
  | "operations_manager_lifestyle"
  | "ops_admin_associate";

export const JOB_TITLE_LABELS: Record<JobTitle, string> = {
  chief_strategic_partnership_director: "Chief Strategic Partnership Director",
  operations_manager_lifestyle: "Operations Manager — MEC Lifestyle",
  ops_admin_associate: "Ops Admin Associate — MEC Lifestyle",
};

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  /** null for super_admin (sees everything), set for a CIO. */
  module: ModuleKey | null;
  /** null = the standard view for their module. */
  jobTitle: JobTitle | null;
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
/* MDNA Admin (co-living)                                                       */
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
/* MEC Asset (HR) — revenue, deliberately separate from the RM20M raise        */
/* -------------------------------------------------------------------------- */

/** The eight annual revenue streams. Five external, three internal. */
export type MecStreamKey =
  | "cec_ticketing"
  | "corporate_sponsor"
  | "subscription"
  | "advisory"
  | "training"
  | "esos"
  | "outsource"
  | "payroll";

export type MecStreamGroup = "external" | "internal";

/**
 * Received ⊆ Invoiced ⊆ Contracted — the same nesting Factory and MDNA use.
 * `enquiry` is pipeline only and `lost` is excluded from every figure.
 */
export type MecRecordStatus =
  | "enquiry"     // In discussion, nothing booked
  | "contracted"  // Booked or signed, not yet billed
  | "invoiced"    // Billed, awaiting payment
  | "received"    // Cash in MEC Asset's account
  | "lost";       // Dropped

/** Contract size band for a sponsorship deal. */
export type MecProjectTier = "tier_1" | "tier_2" | "tier_3";

/**
 * The professional-service-fee ladder, distinct from `MecRecordStatus`.
 * `status` tracks what the sponsor has paid; this tracks what MEC has earned:
 * nothing at proposal, half the fee on signing, all of it on delivery.
 */
export type MecFeeStage = "proposal" | "contract_signed" | "delivered";

export interface MecRecord {
  id: string;
  stream: MecStreamKey;
  /** Sponsor, client, event or cohort name. */
  clientName: string;
  contactPerson: string;
  phone: string;
  status: MecRecordStatus;
  /** Gross RM this record bills. Every roll-up sums this. */
  amount: number;
  /** Attribution for personal quotas only — never an access control. */
  ownerId: string | null;
  projectTier: MecProjectTier | null;
  feeStage: MecFeeStage | null;
  /** Units behind the amount: pax, tickets, months, companies, projects. */
  units: number | null;
  unitLabel: string | null;
  contractedAt: string | null;
  invoicedAt: string | null;
  receivedAt: string | null;
  /** Targets are annual, so every roll-up is scoped to one year. */
  periodYear: number;
  documents: DocumentRef[];
  notes?: string;
}

/* -------------------------------------------------------------------------- */
/* MEC partnership desk — non-revenue trackers                                 */
/* -------------------------------------------------------------------------- */

/**
 * Neither of the two shapes below carries money. They are deliberately kept
 * out of every RM total so a partnership count can never inflate revenue.
 */

export type PartnershipFocusArea =
  | "corporate_esg"
  | "senior_coliving"
  | "community_wellness"
  | "capital_collaboration";

export type PartnershipStatus =
  | "in_progress"
  | "active_collaboration"
  | "completed"
  | "under_review";

export interface PartnershipInitiative {
  id: string;
  title: string;
  collaborator: string;
  focusArea: PartnershipFocusArea;
  status: PartnershipStatus;
  milestoneNotes: string | null;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SynergyLog {
  id: string;
  subsidiary: string;
  /** Stakeholders or corporations engaged. A count, never money. */
  reachMetric: number;
  status: PartnershipStatus;
  notes: string | null;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* MEC Lifestyle — operations desk                                             */
/* -------------------------------------------------------------------------- */

export interface CecChampion {
  id: string;
  name: string;
  contactDetails: string;
  /** The four onboarding steps, each independently auditable. */
  briefingDone: boolean;
  photoCaptured: boolean;
  profileSecured: boolean;
  /** Handed to the Ops Admin Associate for the Facebook upload. */
  handedToAdmin: boolean;
  onboardedAt: string | null;
  notes: string | null;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type EventSupportStatus = "planning" | "on_ground" | "completed";

export interface LifestyleEvent {
  id: string;
  name: string;
  activityType: string;
  leadCecId: string | null;
  eventDate: string | null;
  location: string;
  supportStatus: EventSupportStatus;
  notes: string | null;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** One row per call-out. There are no fixed working hours. */
export interface EventServiceCall {
  id: string;
  eventId: string;
  calledAt: string;
  note: string | null;
  ownerId: string | null;
}

export interface EventMedia {
  id: string;
  eventId: string;
  hasPhotos: boolean;
  hasVideos: boolean;
  mediaUrl: string | null;
  handedOff: boolean;
  /** Set by trigger, never by the form. */
  handedOffAt: string | null;
  notes: string | null;
  ownerId: string | null;
}

export type InvoiceStatus = "draft" | "submitted";

/** The monthly service fee. A cost to MEC, never revenue. */
export interface LifestyleInvoice {
  id: string;
  periodYear: number;
  periodMonth: number;
  amount: number;
  documentUrl: string | null;
  status: InvoiceStatus;
  submittedAt: string | null;
  notes: string | null;
  ownerId: string | null;
}

/* -------------------------------------------------------------------------- */
/* MEC Lifestyle — Ops Admin deliverables                                      */
/* -------------------------------------------------------------------------- */

export type DeliverableCategory =
  | "edm_landing"
  | "facebook_event"
  | "cec_profile"
  | "digital_access";

export interface Deliverable {
  id: string;
  category: DeliverableCategory;
  /** Campaign, event, CEC or member name, depending on the category. */
  title: string;
  occurredOn: string;
  linkUrl: string | null;
  writeUp: string | null;
  platforms: string | null;
  cecId: string | null;
  calendarInvited: boolean;
  whatsappIntegrated: boolean;
  /**
   * The rate agreed when the work was done — stored, not derived, so changing
   * the rate card never restates a historical invoice.
   */
  rateApplied: number;
  /** Set once rolled into an invoice, which stops it being billed twice. */
  invoiceId: string | null;
  notes: string | null;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type HandoffType = "media" | "cec" | "other";

export interface OpsSyncLog {
  id: string;
  handoffType: HandoffType;
  handoffRef: string | null;
  weekOf: string;
  statusNote: string | null;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
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
