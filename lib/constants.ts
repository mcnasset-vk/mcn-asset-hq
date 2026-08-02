import type {
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
};

export const MODULE_HREF: Record<ModuleKey, string> = {
  factory: "/factory",
  mdna: "/mdna",
  nasdaq: "/nasdaq",
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
