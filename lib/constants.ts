import type {
  CapitalStepKey,
  CapitalStepState,
  FactoryStage,
  MdnaStatus,
  ModuleKey,
  NasdaqStatus,
  Tone,
} from "./types";

/* -------------------------------------------------------------------------- */
/* Business rules — the numbers everything else derives from                    */
/* -------------------------------------------------------------------------- */

/** Capital MCN Asset HQ is raising. */
export const FUNDRAISING_TARGET = 20_000_000;

/** Hard deadline for the raise. */
export const FUNDRAISING_DEADLINE = "2026-11-30";

/** When the raise started — used for the run-rate / pace calculation. */
export const CAMPAIGN_START = "2026-01-01";

/** Group profit-after-tax required for the Nasdaq listing. */
export const NASDAQ_PAT_TARGET = 6_000_000;

/** Standard facility disbursed to an onboarded factory. */
export const FACTORY_DISBURSEMENT = 4_000_000;

/** Standard portion of that facility invested into MCN Asset HQ. */
export const FACTORY_HQ_INVESTMENT = 1_000_000;

/** Standard MDNA Senior Co-Living package price. */
export const MDNA_PACKAGE = 500_000;

/** Standard portion of the package invested into MCN Asset HQ. */
export const MDNA_HQ_INVESTMENT = 50_000;

/** Introducer commission, paid twice: on disbursement and on HQ investment. */
export const INTRODUCER_COMMISSION = 5_000;

/* -------------------------------------------------------------------------- */
/* Labels                                                                      */
/* -------------------------------------------------------------------------- */

export const MODULE_LABELS: Record<ModuleKey, string> = {
  factory: "Factory Cosif",
  mdna: "MDNA Senior Co-Living",
  nasdaq: "Nasdaq Listing M&A",
  commissions: "Introducer Commissions",
};

export const MODULE_HREF: Record<ModuleKey, string> = {
  factory: "/factory",
  mdna: "/mdna",
  nasdaq: "/nasdaq",
  commissions: "/commissions",
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
    label: "RM4M Disbursed",
    short: "Disbursed",
    hint: "Facility released to the factory",
    tone: "committed",
  },
  {
    key: "invested",
    label: "RM1M Invested into HQ",
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
    hint: "RM500k received by MDNA",
    tone: "committed",
  },
  {
    key: "invested",
    label: "Invested into HQ",
    hint: "RM50k banked by MCN Asset HQ",
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
 * Statuses whose PAT counts toward the RM6M target. Earlier stages are
 * pipeline only — they are shown but never added to the headline figure.
 */
export const NASDAQ_COMMITTED_STATUSES: NasdaqStatus[] = [
  "agreed",
  "onboarded",
];

/* -------------------------------------------------------------------------- */
/* 成交资本7步 — the seven steps to closing capital                             */
/* -------------------------------------------------------------------------- */

/**
 * The value-creation framework the raise is run against:
 * 《创造企业价值～成交资本7步》 — OE Edugroup 杰青商学院.
 *
 * Each step is scored from records already in this system, never from an
 * opinion typed into a box. `proof` names the evidence `metrics.ts` reads, so
 * the wording on screen and the arithmetic behind it cannot drift apart.
 */
export const CAPITAL_STEPS: {
  step: number;
  key: CapitalStepKey;
  /** 成交⋯ — what is being closed at this step. */
  zh: string;
  /** 建立⋯ — the enterprise capability it builds. */
  zhOutcome: string;
  label: string;
  outcome: string;
  /** The record set that proves the step, in the language of this dashboard. */
  proof: string;
}[] = [
  {
    step: 1,
    key: "trust",
    zh: "成交信任",
    zhOutcome: "建立企业信用",
    label: "Close Trust",
    outcome: "Build enterprise credit",
    proof: "Capital that has cleared into the HQ account",
  },
  {
    step: 2,
    key: "brand",
    zh: "成交品牌",
    zhOutcome: "建立企业影响力",
    label: "Close Brand",
    outcome: "Build enterprise influence",
    proof: "Counterparties engaged across all three business lines",
  },
  {
    step: 3,
    key: "organisation",
    zh: "成交组织",
    zhOutcome: "建立高绩效团队",
    label: "Close Organisation",
    outcome: "Build a high-performance team",
    proof: "Introducers and referrers who have closed at least one deal",
  },
  {
    step: 4,
    key: "system",
    zh: "成交系统",
    zhOutcome: "建立可复制经营模式",
    label: "Close System",
    outcome: "Build a replicable operating model",
    proof: "Share of records that complete the funnel, less what stalls in it",
  },
  {
    step: 5,
    key: "value",
    zh: "成交价值",
    zhOutcome: "持续创造社会价值",
    label: "Close Value",
    outcome: "Create social value continuously",
    proof: "Senior Co-Living places funded and delivered to residents",
  },
  {
    step: 6,
    key: "ecosystem",
    zh: "成交生态",
    zhOutcome: "共创共赢、彼此成就",
    label: "Close Ecosystem",
    outcome: "Co-create, win together",
    proof: "Commission actually paid out to the introducer network",
  },
  {
    step: 7,
    key: "legacy",
    zh: "成交传承",
    zhOutcome: "建立永续发展的企业",
    label: "Close Legacy",
    outcome: "Build a perpetual enterprise",
    proof: "Profit-after-tax committed to the Nasdaq listing vehicle",
  },
];

/**
 * Denominators for the four steps that are not already measured against a
 * board-approved figure. They are house assumptions, not contractual targets —
 * change them here and every score, bar and reading follows.
 */

/** Step 2 — counterparties that constitute national visibility. */
export const BRAND_REACH_TARGET = 100;

/** Step 3 — introducers with a closed deal that constitute a real network. */
export const ORGANISATION_INTRODUCER_TARGET = 12;

/** Step 4 — funnel completion rate at which the model counts as replicable. */
export const SYSTEM_THROUGHPUT_TARGET = 0.6;

/** Step 5 — Senior Co-Living places in the first delivery phase. */
export const SOCIAL_PLACES_TARGET = 40;

/** A step is closed at this score; below `PROVING` it is still being built. */
export const STEP_CLOSED_AT = 0.8;
export const STEP_PROVING_AT = 0.4;

export const CAPITAL_STEP_STATES: Record<
  CapitalStepState,
  { label: string; zh: string; hint: string; tone: Tone }
> = {
  not_started: {
    label: "Not started",
    zh: "未启动",
    hint: "No record in the system speaks to this step yet",
    tone: "idle",
  },
  building: {
    label: "Building",
    zh: "建立中",
    hint: "Under way, not yet at a level that would convince an investor",
    tone: "risk",
  },
  proving: {
    label: "Proving",
    zh: "验证中",
    hint: "Evidence is accumulating and holding up",
    tone: "committed",
  },
  closed: {
    label: "Closed",
    zh: "已成交",
    hint: "Proven by the records — this step is bankable",
    tone: "received",
  },
};
