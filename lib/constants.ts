import type {
  DeliverableCategory,
  EventSupportStatus,
  FactoryStage,
  HandoffType,
  MdnaStatus,
  MecFeeStage,
  MecProjectTier,
  MecRecordStatus,
  MecStreamGroup,
  MecStreamKey,
  MicanaStage,
  MicanaTenantStatus,
  ModuleKey,
  NasdaqStatus,
  PartnershipFocusArea,
  PartnershipStatus,
  Tone,
} from "./types";
import {
  CFG_FACTORY_DISBURSEMENT,
  CFG_FACTORY_HQ_INVESTMENT,
  CFG_FUNDRAISING_TARGET,
  CFG_INTRODUCER_COMMISSION,
  CFG_LIFESTYLE_MONTHLY_FEE,
  CFG_MDNA_HQ_INVESTMENT,
  CFG_MDNA_PACKAGE,
  CFG_MEC_PARTNERSHIP_QUOTA,
  CFG_MEC_REVENUE_PER_STAFF_MAX,
  CFG_MEC_REVENUE_PER_STAFF_MIN,
  CFG_MEC_TARGET_ADVISORY,
  CFG_MEC_TARGET_CEC,
  CFG_MEC_TARGET_PAYROLL,
  CFG_MEC_TARGET_SPONSOR,
  CFG_MEC_TARGET_SUBSCRIPTION,
  CFG_MEC_TARGET_TRAINING,
  CFG_NASDAQ_PAT_TARGET,
  CFG_RATE_CEC_PROFILE,
  CFG_RATE_DIGITAL_ACCESS,
  CFG_RATE_EDM,
  CFG_RATE_FB_EVENT,
} from "./config";

/* -------------------------------------------------------------------------- */
/* Business rules — the numbers everything else derives from                    */
/* -------------------------------------------------------------------------- */

/** Capital MCN Asset HQ is raising. */
export const FUNDRAISING_TARGET = CFG_FUNDRAISING_TARGET;

/** Hard deadline for the raise. */
export const FUNDRAISING_DEADLINE = "2026-11-30";

/** When the raise started — used for the run-rate / pace calculation. */
export const CAMPAIGN_START = "2026-01-01";

/** Group profit-after-tax required for the Nasdaq listing. */
export const NASDAQ_PAT_TARGET = CFG_NASDAQ_PAT_TARGET;

/** Standard facility disbursed to an onboarded factory. */
export const FACTORY_DISBURSEMENT = CFG_FACTORY_DISBURSEMENT;

/** Standard portion of that facility invested into MCN Asset HQ. */
export const FACTORY_HQ_INVESTMENT = CFG_FACTORY_HQ_INVESTMENT;

/** Standard MDNA Admin co-living package price. */
export const MDNA_PACKAGE = CFG_MDNA_PACKAGE;

/** Standard portion of the package invested into MCN Asset HQ. */
export const MDNA_HQ_INVESTMENT = CFG_MDNA_HQ_INVESTMENT;

/** Introducer commission, paid twice: on disbursement and on HQ investment. */
export const INTRODUCER_COMMISSION = CFG_INTRODUCER_COMMISSION;

/* -------------------------------------------------------------------------- */
/* MEC Asset (HR) — annual revenue model                                       */
/* -------------------------------------------------------------------------- */

/** Roll-ups are annual, so every MEC figure is scoped to this year. */
export const MEC_TARGET_YEAR = 2026;

/**
 * MEC contributes nothing to the capital raise. It is operating revenue, not
 * capital banked into HQ — the same reasoning that keeps Nasdaq PAT out of the
 * figure. Confirmed by the business owner, 2 August 2026.
 */
export const MEC_COUNTS_TOWARD_RAISE = false;

export const MEC_STREAMS: {
  key: MecStreamKey;
  label: string;
  short: string;
  group: MecStreamGroup;
  target: number;
  tone: Tone;
  hint: string;
}[] = [
  {
    key: "cec_ticketing",
    group: "external",
    target: CFG_MEC_TARGET_CEC,
    tone: "accent",
    label: "ESG CEC Event Ticketing",
    short: "CEC Events",
    hint: "Ticket sales across the CEC event calendar",
  },
  {
    key: "corporate_sponsor",
    group: "external",
    target: CFG_MEC_TARGET_SPONSOR,
    tone: "committed",
    label: "ESG Corporate Sponsor",
    short: "Sponsors",
    hint: "Corporate sponsorship of CEC projects",
  },
  {
    key: "subscription",
    group: "external",
    target: CFG_MEC_TARGET_SUBSCRIPTION,
    tone: "received",
    label: "4/m ESG Subscription",
    short: "Subscription",
    hint: "Monthly ESG subscription membership",
  },
  {
    key: "advisory",
    group: "external",
    target: CFG_MEC_TARGET_ADVISORY,
    tone: "risk",
    label: "B2B Community / ESG Advisory",
    short: "Advisory",
    hint: "B2B community and ESG advisory engagements",
  },
  {
    key: "training",
    group: "external",
    target: CFG_MEC_TARGET_TRAINING,
    tone: "idle",
    label: "ESG Training",
    short: "Training",
    hint: "Monthly ESG practitioner training cohorts",
  },
  {
    key: "esos",
    group: "internal",
    target: 0,
    tone: "idle",
    label: "ESOS",
    short: "ESOS",
    hint: "Internal — no annual target set yet",
  },
  {
    key: "outsource",
    group: "internal",
    target: 0,
    tone: "idle",
    label: "Outsource (Admin, Event)",
    short: "Outsource",
    hint: "Internal — no annual target set yet",
  },
  {
    key: "payroll",
    group: "internal",
    target: CFG_MEC_TARGET_PAYROLL,
    tone: "committed",
    label: "Payroll Services",
    short: "Payroll",
    hint: "Payroll services for group companies",
  },
];

/** Derived, so changing a stream target is the only edit needed. */
export const MEC_ANNUAL_TARGET = MEC_STREAMS.reduce((t, s) => t + s.target, 0);

export const MEC_STATUSES: {
  key: MecRecordStatus;
  label: string;
  hint: string;
  tone: Tone;
}[] = [
  {
    key: "enquiry",
    // Deliberately not "Prospect" — MDNA already uses that label, and the two
    // appear side by side in the combined Open Pipeline table.
    label: "Enquiry",
    hint: "In discussion, nothing booked",
    tone: "idle",
  },
  {
    key: "contracted",
    label: "Contracted",
    hint: "Booked or signed, not yet billed",
    tone: "risk",
  },
  {
    key: "invoiced",
    label: "Invoiced",
    hint: "Billed, awaiting payment",
    tone: "committed",
  },
  {
    key: "received",
    label: "Paid to MEC",
    hint: "Cash in MEC Asset's account",
    tone: "received",
  },
  {
    key: "lost",
    label: "Lost",
    hint: "Dropped — excluded from all totals",
    tone: "stalled",
  },
];

/** Statuses whose revenue counts as committed. Received is a subset of these. */
export const MEC_COMMITTED_STATUSES: MecRecordStatus[] = [
  "contracted",
  "invoiced",
  "received",
];

/** 10% of total MEC revenue flows upward to MCN. */
export const MEC_UPWARD_RATE = 0.1;

/** 20% of total MEC revenue funds the operating / profit-sharing pool. */
export const MEC_POOL_RATE = 0.2;

/** Profit-after-tax margin used for the per-staff economics. */
export const MEC_PAT_MARGIN = 0.1;

/** Annual revenue a single staff member is expected to carry. */
export const MEC_REVENUE_PER_STAFF = {
  min: CFG_MEC_REVENUE_PER_STAFF_MIN,
  max: CFG_MEC_REVENUE_PER_STAFF_MAX,
};

/** 0 = not declared. Set this and the per-staff panel shows actuals too. */
export const MEC_HEADCOUNT = 3;

/* -------------------------------------------------------------------------- */
/* MEC partnership desk                                                        */
/* -------------------------------------------------------------------------- */

/**
 * The professional service fee MEC charges a corporate sponsor.
 *
 * Deliberately NOT the same 10% as MEC_UPWARD_RATE. This one is revenue MEC
 * earns from the sponsor; that one is a share of MEC's revenue passed up to
 * MCN. They coincide at 10% today, which is exactly why they are named apart —
 * changing one must never silently change the other.
 */
export const MEC_SERVICE_FEE_RATE = 0.1;

/** Half the fee is earned on signing, the remainder on delivery. */
export const MEC_FEE_STAGES: {
  key: MecFeeStage;
  label: string;
  hint: string;
  /** Fraction of the full service fee earned once this stage is reached. */
  earned: number;
  tone: Tone;
}[] = [
  {
    key: "proposal",
    label: "Proposal submitted",
    hint: "Partnership pitch with the sponsor — nothing earned yet",
    earned: 0,
    tone: "idle",
  },
  {
    key: "contract_signed",
    label: "Contract signed & paid",
    hint: "Sponsor payment received — first half of the fee earned",
    earned: 0.5,
    tone: "committed",
  },
  {
    key: "delivered",
    label: "Project delivered",
    hint: "Milestone achieved — the remaining half earned",
    earned: 1,
    tone: "received",
  },
];

export const MEC_PROJECT_TIERS: {
  key: MecProjectTier;
  label: string;
  min: number;
  max: number | null;
}[] = [
  { key: "tier_1", label: "Tier 1", min: 0, max: null },
  { key: "tier_2", label: "Tier 2", min: 0, max: null },
  { key: "tier_3", label: "Tier 3", min: 0, max: null },
];

/**
 * Personal Year-1 sponsorship quota for the Chief Strategic Partnership
 * Director. A slice of the corporate_sponsor stream target, not a
 * replacement for it — the MEC annual target stays MEC_ANNUAL_TARGET.
 */
export const MEC_PARTNERSHIP_QUOTA = CFG_MEC_PARTNERSHIP_QUOTA;

export const PARTNERSHIP_FOCUS_AREAS: {
  key: PartnershipFocusArea;
  label: string;
}[] = [
  { key: "corporate_esg", label: "Corporate ESG" },
  { key: "senior_coliving", label: "Senior Co-Living Integration" },
  { key: "community_wellness", label: "Community Wellness" },
  { key: "capital_collaboration", label: "Capital Collaboration" },
];

export const PARTNERSHIP_STATUSES: {
  key: PartnershipStatus;
  label: string;
  tone: Tone;
}[] = [
  { key: "in_progress", label: "In Progress", tone: "risk" },
  { key: "active_collaboration", label: "Active Collaboration", tone: "committed" },
  { key: "completed", label: "Completed", tone: "received" },
  { key: "under_review", label: "Under Review", tone: "idle" },
];

/* -------------------------------------------------------------------------- */
/* MEC Lifestyle — operations desk                                             */
/* -------------------------------------------------------------------------- */

/**
 * Contractual monthly service fee for the Operations Manager, effective
 * 1 August 2026. This is a COST to MEC — it must never be added to any
 * revenue total.
 */
export const LIFESTYLE_MONTHLY_FEE = CFG_LIFESTYLE_MONTHLY_FEE;

/** Contract start. Invoice months before this are not offered. */
export const LIFESTYLE_CONTRACT_START = "2026-08-01";

/** The four onboarding steps, in the order they are done. */
export const CEC_ONBOARDING_STEPS: {
  key: "briefingDone" | "photoCaptured" | "profileSecured" | "handedToAdmin";
  label: string;
  hint: string;
}[] = [
  {
    key: "briefingDone",
    label: "Introductory PPT briefing",
    hint: "Conducted with the new champion",
  },
  {
    key: "photoCaptured",
    label: "Official profile photo",
    hint: "Captured and stored",
  },
  {
    key: "profileSecured",
    label: "Profile & contacts secured",
    hint: "Details recorded and confidential",
  },
  {
    key: "handedToAdmin",
    label: "Handed to Ops Admin Associate",
    hint: "For the Facebook profile upload",
  },
];

export const EVENT_SUPPORT_STATUSES: {
  key: EventSupportStatus;
  label: string;
  hint: string;
  tone: Tone;
}[] = [
  {
    key: "planning",
    label: "Planning phase",
    hint: "Coordinating ahead of the event",
    tone: "idle",
  },
  {
    key: "on_ground",
    label: "On-ground support provided",
    hint: "Attending and supporting on site",
    tone: "risk",
  },
  {
    key: "completed",
    label: "Completed",
    hint: "Event delivered and wrapped up",
    tone: "received",
  },
];

/* -------------------------------------------------------------------------- */
/* Ops Admin Associate — deliverable rate card                                 */
/* -------------------------------------------------------------------------- */

/**
 * The CURRENT rate card, effective 1 August 2026.
 *
 * Each deliverable stores the rate that applied when it was logged, so editing
 * these figures changes what new work is worth and never restates an invoice
 * that has already been raised.
 */
export const DELIVERABLE_CATEGORIES: {
  key: DeliverableCategory;
  label: string;
  /** Singular noun for the billable unit. */
  unit: string;
  rate: number;
  hint: string;
  tone: Tone;
}[] = [
  {
    key: "edm_landing",
    label: "EDM & Landing Page",
    unit: "post",
    rate: CFG_RATE_EDM,
    hint: "Campaign title, date created and the live link",
    tone: "accent",
  },
  {
    key: "facebook_event",
    label: "Facebook Event Posting",
    unit: "event",
    rate: CFG_RATE_FB_EVENT,
    hint: "Event title, write-up and the live post URL",
    tone: "committed",
  },
  {
    key: "cec_profile",
    label: "CEC Profile Upload",
    unit: "profile",
    rate: CFG_RATE_CEC_PROFILE,
    hint: "Champion profile published — target one per week",
    tone: "received",
  },
  {
    key: "digital_access",
    label: "Digital Access & Database",
    unit: "update",
    rate: CFG_RATE_DIGITAL_ACCESS,
    hint: "Calendar invitation and WhatsApp channel integration",
    tone: "idle",
  },
];

/** Contractual target: one CEC profile published per week. */
export const CEC_PROFILE_WEEKLY_TARGET = 1;

export const HANDOFF_TYPES: { key: HandoffType; label: string }[] = [
  { key: "media", label: "Event media from the Operations Manager" },
  { key: "cec", label: "CEC profile from the Operations Manager" },
  { key: "other", label: "Other" },
];

/** Group units a synergy log can target. */
export const MCN_SUBSIDIARIES = [
  "MCN Asset Sdn Bhd",
  "MEC Asset Sdn Bhd",
  "Factory Cosif Sdn Bhd",
  "MDNA Senior Co-Living Sdn Bhd",
  "Nasdaq Listing Vehicle",
];

/* -------------------------------------------------------------------------- */
/* Micana — an operating business, deliberately outside the RM20M raise        */
/* -------------------------------------------------------------------------- */

/**
 * The owner's default cut of a bungalow's net profit, as a percentage.
 * Micana funds the renovation and runs the house, so the majority share sits
 * with Micana. This is only a default — every bungalow carries its own.
 */
export const MICANA_DEFAULT_OWNER_SHARE_PCT = 30;

/** kWh of aircon included in the rent each month, before billing starts. */
export const MICANA_DEFAULT_AIRCON_ALLOWANCE_KWH = 100;

/** RM per kWh charged above the allowance. */
export const MICANA_DEFAULT_AIRCON_RATE = 0.6;

/**
 * A renovation is only flagged once it is over budget by more than this
 * fraction. Every fit-out runs a little over; flagging at the first ringgit
 * would make the warning meaningless.
 */
export const MICANA_OVERRUN_TOLERANCE = 0.05;

/** Sourcing ladder in order. The funnel and `micanaStageRank` both read this. */
export const MICANA_STAGES: {
  key: MicanaStage;
  label: string;
  short: string;
  hint: string;
  tone: Tone;
}[] = [
  {
    key: "identified",
    label: "Identified",
    short: "Identified",
    hint: "Bungalow spotted, owner not yet approached",
    tone: "idle",
  },
  {
    key: "negotiating",
    label: "In Negotiation",
    short: "Negotiating",
    hint: "Terms under discussion with the owner",
    tone: "risk",
  },
  {
    key: "agreed",
    label: "Terms Agreed",
    short: "Agreed",
    hint: "Lease or profit-share signed",
    tone: "committed",
  },
  {
    key: "renovating",
    label: "Under Renovation",
    short: "Renovating",
    hint: "Fit-out in progress against budget",
    tone: "accent",
  },
  {
    key: "operating",
    label: "Operating",
    short: "Operating",
    hint: "Taking tenants and generating revenue",
    tone: "received",
  },
];

export const MICANA_TENANT_STATUSES: {
  key: MicanaTenantStatus;
  label: string;
  hint: string;
  tone: Tone;
}[] = [
  {
    key: "enquiry",
    label: "Enquiry",
    hint: "Viewing arranged, nothing signed",
    tone: "idle",
  },
  {
    key: "reserved",
    label: "Reserved",
    hint: "Deposit taken, not yet moved in",
    tone: "committed",
  },
  {
    key: "occupied",
    label: "Occupied",
    hint: "In residence and paying rent",
    tone: "received",
  },
  {
    key: "notice",
    label: "Under Notice",
    hint: "Move-out date set — the room needs refilling",
    tone: "risk",
  },
  {
    key: "moved_out",
    label: "Moved Out",
    hint: "Room vacant",
    tone: "idle",
  },
];

/** Tenant statuses that count as a filled room for occupancy. */
export const MICANA_OCCUPYING_STATUSES: MicanaTenantStatus[] = [
  "occupied",
  "notice",
];

/* -------------------------------------------------------------------------- */
/* Labels                                                                      */
/* -------------------------------------------------------------------------- */

export const MODULE_LABELS: Record<ModuleKey, string> = {
  factory: "Factory Cosif",
  mdna: "MDNA Admin",
  nasdaq: "Nasdaq Listing M&A",
  commissions: "Introducer Commissions",
  mec: "MEC Asset (HR)",
  micana: "Micana Co-Living & HealthTech",
};

/**
 * The MDNA division. A CIO scoped to `mdna` (MDNA Admin) can read and write
 * every line in here.
 *
 * This list is mirrored by `private.can_access` in the database, which is the
 * real boundary — this copy only decides what the interface offers. Change one
 * and you must change the other. `mec` is a separate division and is
 * deliberately absent.
 */
export const MDNA_DIVISION: ModuleKey[] = [
  "factory",
  "mdna",
  "nasdaq",
  "commissions",
];

export const MODULE_HREF: Record<ModuleKey, string> = {
  factory: "/factory",
  mdna: "/mdna/admin",
  nasdaq: "/nasdaq",
  commissions: "/commissions",
  mec: "/mec",
  micana: "/micana",
};

/** Pipeline stages in order. `FactoryFunnel` and `stageRank` both read this. */
export const FACTORY_STAGES: {
  key: FactoryStage;
  label: string;
  short: string;
  hint: string;
  tone: Tone;
}[] = [
  {
    key: "submitted",
    label: "Submitted Docs",
    short: "Submitted",
    hint: "Application documents received",
    tone: "idle",
  },
  {
    key: "processing",
    label: "Processing",
    short: "Processing",
    hint: "In the 2–3 month approval window",
    tone: "risk",
  },
  {
    key: "disbursed",
    label: "Facility Disbursed",
    short: "Disbursed",
    hint: "Facility released to the factory",
    tone: "committed",
  },
  {
    key: "invested",
    label: "Invested into HQ",
    short: "Invested",
    hint: "Capital banked by MCN Asset HQ",
    tone: "received",
  },
];

export const MDNA_STATUSES: {
  key: MdnaStatus;
  label: string;
  hint: string;
  tone: Tone;
}[] = [
  {
    key: "prospect",
    label: "Prospect",
    hint: "In discussion, nothing signed",
    tone: "idle",
  },
  {
    key: "signed",
    label: "Signed",
    hint: "Package agreement signed",
    tone: "risk",
  },
  {
    key: "paid",
    label: "Package Paid",
    hint: "Package paid in full to MDNA",
    tone: "committed",
  },
  {
    key: "invested",
    label: "Invested into HQ",
    hint: "Banked by MCN Asset HQ",
    tone: "received",
  },
];

export const NASDAQ_STATUSES: {
  key: NasdaqStatus;
  label: string;
  hint: string;
  tone: Tone;
}[] = [
  {
    key: "in_discussion",
    label: "In Discussion",
    hint: "Early conversations",
    tone: "idle",
  },
  {
    key: "loi_signed",
    label: "LOI Signed",
    hint: "Letter of intent executed",
    tone: "risk",
  },
  {
    key: "due_diligence",
    label: "Due Diligence",
    hint: "Financials under review",
    tone: "risk",
  },
  {
    key: "agreed",
    label: "Agreed to Join",
    hint: "Committed to the listing vehicle",
    tone: "committed",
  },
  {
    key: "onboarded",
    label: "Onboarded",
    hint: "Consolidated into the group",
    tone: "received",
  },
];

/**
 * Statuses whose PAT counts toward the group target. Earlier stages are
 * pipeline only — they are shown but never added to the headline figure.
 */
export const NASDAQ_COMMITTED_STATUSES: NasdaqStatus[] = [
  "agreed",
  "onboarded",
];
