import {
  CAMPAIGN_START,
  CEC_ONBOARDING_STEPS,
  CEC_PROFILE_WEEKLY_TARGET,
  DELIVERABLE_CATEGORIES,
  EVENT_SUPPORT_STATUSES,
  FACTORY_HQ_INVESTMENT,
  LIFESTYLE_MONTHLY_FEE,
  FACTORY_STAGES,
  FUNDRAISING_DEADLINE,
  FUNDRAISING_TARGET,
  MDNA_HQ_INVESTMENT,
  MDNA_STATUSES,
  MEC_ANNUAL_TARGET,
  MEC_COMMITTED_STATUSES,
  MEC_FEE_STAGES,
  MEC_HEADCOUNT,
  MEC_PARTNERSHIP_QUOTA,
  MEC_PAT_MARGIN,
  MEC_POOL_RATE,
  MEC_PROJECT_TIERS,
  MEC_REVENUE_PER_STAFF,
  MEC_SERVICE_FEE_RATE,
  MEC_STATUSES,
  MEC_STREAMS,
  MEC_TARGET_YEAR,
  MEC_UPWARD_RATE,
  NASDAQ_COMMITTED_STATUSES,
  NASDAQ_PAT_TARGET,
  NASDAQ_STATUSES,
  PARTNERSHIP_FOCUS_AREAS,
  PARTNERSHIP_STATUSES,
} from "./constants";
import { clamp01, daysBetween, daysRemaining, ratio } from "./format";
import type { DashboardData } from "./data";
import type {
  CecChampion,
  Commission,
  Deliverable,
  DeliverableCategory,
  DrillRow,
  EventSupportStatus,
  FactoryDeal,
  FactoryStage,
  LifestyleEvent,
  MdnaMember,
  MdnaStatus,
  MecFeeStage,
  MecProjectTier,
  MecRecord,
  MecRecordStatus,
  MecStreamGroup,
  MecStreamKey,
  NasdaqCompany,
  NasdaqStatus,
  PartnershipFocusArea,
  PartnershipStatus,
  Tone,
} from "./types";

/* ==========================================================================
   THE RULE
   --------------------------------------------------------------------------
   Only two things count toward the RM20,000,000 target:
     Factory Cosif  — RM1,000,000 per factory
     MDNA Admin    — RM50,000 per member

   Two programmes are tracked against their own targets and contribute RM0:
     Nasdaq M&A     — profit-after-tax, against RM6,000,000
     MEC Asset (HR) — operating revenue, against RM6,690,000
   Neither is capital banked into HQ, so neither ever touches the RM20M figure.

   COMMITTED = legally committed, money not necessarily banked yet.
   RECEIVED  = actually in MCN Asset HQ's account. Received ⊆ Committed.
   ========================================================================== */

const STAGE_ORDER: FactoryStage[] = FACTORY_STAGES.map((s) => s.key);

export function stageRank(stage: FactoryStage): number {
  return STAGE_ORDER.indexOf(stage);
}

/** Committed once the RM4M facility is out the door. */
export function isFactoryCommitted(deal: FactoryDeal): boolean {
  return stageRank(deal.stage) >= stageRank("disbursed");
}

/** Received only when the RM1M has actually landed in HQ. */
export function isFactoryReceived(deal: FactoryDeal): boolean {
  return deal.stage === "invested";
}

/**
 * A factory sitting in the processing window past its expected disbursement
 * date. This is where deals die quietly, so it gets its own flag everywhere.
 */
export function isFactoryStalled(deal: FactoryDeal, now: string): boolean {
  if (deal.stage !== "processing" || !deal.expectedDisbursementAt) return false;
  return daysBetween(deal.expectedDisbursementAt, now) > 0;
}

export function factoryOverdueDays(deal: FactoryDeal, now: string): number {
  if (!deal.expectedDisbursementAt) return 0;
  return Math.max(0, daysBetween(deal.expectedDisbursementAt, now));
}

const MDNA_COMMITTED: MdnaStatus[] = ["signed", "paid", "invested"];

export function isMdnaCommitted(member: MdnaMember): boolean {
  return MDNA_COMMITTED.includes(member.status);
}

export function isMdnaReceived(member: MdnaMember): boolean {
  return member.status === "invested";
}

/* -------------------------------------------------------------------------- */
/* Capital summary — the headline                                              */
/* -------------------------------------------------------------------------- */

export interface CapitalSummary {
  target: number;
  received: number;
  committed: number;
  /** Committed but not yet banked — the hatched band on the progress bar. */
  inFlight: number;
  /** Still to be found, measured against money actually received. */
  gap: number;
  receivedPct: number;
  committedPct: number;
  factoryReceived: number;
  factoryCommitted: number;
  mdnaReceived: number;
  mdnaCommitted: number;
  daysLeft: number;
  deadline: string;
}

export function getCapitalSummary(
  data: DashboardData,
  now: string,
): CapitalSummary {
  const factoryReceived = sum(
    data.factories.filter(isFactoryReceived),
    (d) => d.hqInvestmentAmount,
  );
  const factoryCommitted = sum(
    data.factories.filter(isFactoryCommitted),
    (d) => d.hqInvestmentAmount,
  );
  const mdnaReceived = sum(
    data.members.filter(isMdnaReceived),
    (m) => m.hqInvestmentAmount,
  );
  const mdnaCommitted = sum(
    data.members.filter(isMdnaCommitted),
    (m) => m.hqInvestmentAmount,
  );

  const received = factoryReceived + mdnaReceived;
  const committed = factoryCommitted + mdnaCommitted;

  return {
    target: FUNDRAISING_TARGET,
    received,
    committed,
    inFlight: committed - received,
    gap: Math.max(0, FUNDRAISING_TARGET - received),
    receivedPct: clamp01(ratio(received, FUNDRAISING_TARGET)),
    committedPct: clamp01(ratio(committed, FUNDRAISING_TARGET)),
    factoryReceived,
    factoryCommitted,
    mdnaReceived,
    mdnaCommitted,
    daysLeft: daysRemaining(FUNDRAISING_DEADLINE, now),
    deadline: FUNDRAISING_DEADLINE,
  };
}

/* -------------------------------------------------------------------------- */
/* Pace — are we going to make it?                                             */
/* -------------------------------------------------------------------------- */

const DAYS_PER_MONTH = 30.44;

export interface Pace {
  monthsElapsed: number;
  monthsRemaining: number;
  /** RM per month achieved so far, on received capital. */
  actualPerMonth: number;
  /** RM per month needed from here to close the gap by the deadline. */
  requiredPerMonth: number;
  /** Where the current run-rate lands on deadline day. */
  projected: number;
  onTrack: boolean;
  /** How much faster than today's rate is needed, e.g. 2.4 = 2.4x. */
  multipleNeeded: number;
}

export function getPace(now: string, capital: CapitalSummary): Pace {
  const monthsElapsed = Math.max(
    0.5,
    daysBetween(CAMPAIGN_START, now) / DAYS_PER_MONTH,
  );
  const monthsRemaining = Math.max(
    0.1,
    daysBetween(now, FUNDRAISING_DEADLINE) / DAYS_PER_MONTH,
  );

  const actualPerMonth = capital.received / monthsElapsed;
  const requiredPerMonth = capital.gap / monthsRemaining;
  const projected = capital.received + actualPerMonth * monthsRemaining;

  return {
    monthsElapsed,
    monthsRemaining,
    actualPerMonth,
    requiredPerMonth,
    projected,
    onTrack: actualPerMonth >= requiredPerMonth,
    multipleNeeded: ratio(requiredPerMonth, actualPerMonth),
  };
}

/* -------------------------------------------------------------------------- */
/* Gap closer — the gap expressed in deals rather than ringgit                 */
/* -------------------------------------------------------------------------- */

export interface GapCloser {
  gap: number;
  /** Factories needed if the gap were closed by factories alone. */
  factoriesNeeded: number;
  /** MDNA members needed if closed by members alone. */
  membersNeeded: number;
  /** A realistic blend: use everything already committed, then split 50/50. */
  blendFactories: number;
  blendMembers: number;
  /** Gap left after every committed deal actually banks. */
  gapAfterCommitted: number;
}

export function getGapCloser(capital: CapitalSummary): GapCloser {
  const gap = capital.gap;
  const gapAfterCommitted = Math.max(0, capital.target - capital.committed);
  const half = gapAfterCommitted / 2;

  return {
    gap,
    factoriesNeeded: Math.ceil(gap / FACTORY_HQ_INVESTMENT),
    membersNeeded: Math.ceil(gap / MDNA_HQ_INVESTMENT),
    blendFactories: Math.ceil(half / FACTORY_HQ_INVESTMENT),
    blendMembers: Math.ceil(half / MDNA_HQ_INVESTMENT),
    gapAfterCommitted,
  };
}

/* -------------------------------------------------------------------------- */
/* Factory pipeline                                                            */
/* -------------------------------------------------------------------------- */

export interface StageBucket {
  key: FactoryStage;
  label: string;
  short: string;
  hint: string;
  tone: Tone;
  /** Factories sitting at this stage right now. */
  deals: FactoryDeal[];
  count: number;
  /** RM into HQ represented by the factories currently at this stage. */
  hqValue: number;
  /** RM4M facility value represented by this stage. */
  facilityValue: number;
  stalledCount: number;
  /**
   * Factories that have reached this stage *or beyond*. The funnel is drawn
   * from this so the shape narrows honestly — "currently at" counts would
   * produce a misleading zig-zag.
   */
  reachedCount: number;
  reachedHqValue: number;
}

export function getFactoryStages(
  data: DashboardData,
  now: string,
): StageBucket[] {
  return FACTORY_STAGES.map((stage) => {
    const deals = data.factories.filter((d) => d.stage === stage.key);
    const reached = data.factories.filter(
      (d) => stageRank(d.stage) >= stageRank(stage.key),
    );
    return {
      ...stage,
      deals,
      count: deals.length,
      hqValue: sum(deals, (d) => d.hqInvestmentAmount),
      facilityValue: sum(deals, (d) => d.disbursementAmount),
      stalledCount: deals.filter((d) => isFactoryStalled(d, now)).length,
      reachedCount: reached.length,
      reachedHqValue: sum(reached, (d) => d.hqInvestmentAmount),
    };
  });
}

export function getStalledFactories(
  data: DashboardData,
  now: string,
): FactoryDeal[] {
  return data.factories.filter((d) => isFactoryStalled(d, now));
}

/* -------------------------------------------------------------------------- */
/* MDNA                                                                        */
/* -------------------------------------------------------------------------- */

export interface MdnaBucket {
  key: MdnaStatus;
  label: string;
  hint: string;
  tone: Tone;
  members: MdnaMember[];
  count: number;
  hqValue: number;
  packageValue: number;
}

export function getMdnaBuckets(data: DashboardData): MdnaBucket[] {
  return MDNA_STATUSES.map((status) => {
    const members = data.members.filter((m) => m.status === status.key);
    return {
      ...status,
      members,
      count: members.length,
      hqValue: sum(members, (m) => m.hqInvestmentAmount),
      packageValue: sum(members, (m) => m.packageAmount),
    };
  });
}

export interface MdnaSummary {
  totalMembers: number;
  packagesSold: number;
  packageValue: number;
  hqReceived: number;
  hqCommitted: number;
}

export function getMdnaSummary(data: DashboardData): MdnaSummary {
  const sold = data.members.filter(
    (m) => m.status === "paid" || m.status === "invested",
  );
  return {
    totalMembers: data.members.length,
    packagesSold: sold.length,
    packageValue: sum(sold, (m) => m.packageAmount),
    hqReceived: sum(
      data.members.filter(isMdnaReceived),
      (m) => m.hqInvestmentAmount,
    ),
    hqCommitted: sum(
      data.members.filter(isMdnaCommitted),
      (m) => m.hqInvestmentAmount,
    ),
  };
}

/* -------------------------------------------------------------------------- */
/* Nasdaq — measured in PAT, deliberately separate from the RM20M raise        */
/* -------------------------------------------------------------------------- */

export interface NasdaqBucket {
  key: NasdaqStatus;
  label: string;
  hint: string;
  tone: Tone;
  companies: NasdaqCompany[];
  count: number;
  pat: number;
  countsTowardTarget: boolean;
}

export interface NasdaqSummary {
  target: number;
  committedPat: number;
  pipelinePat: number;
  pct: number;
  pctWithPipeline: number;
  gap: number;
  companiesAgreed: number;
  totalCompanies: number;
  buckets: NasdaqBucket[];
}

export function getNasdaqSummary(data: DashboardData): NasdaqSummary {
  const buckets: NasdaqBucket[] = NASDAQ_STATUSES.map((status) => {
    const companies = data.companies.filter((c) => c.status === status.key);
    return {
      ...status,
      companies,
      count: companies.length,
      pat: sum(companies, (c) => c.patContribution),
      countsTowardTarget: NASDAQ_COMMITTED_STATUSES.includes(status.key),
    };
  });

  const committedPat = sum(
    data.companies.filter((c) =>
      NASDAQ_COMMITTED_STATUSES.includes(c.status),
    ),
    (c) => c.patContribution,
  );
  const pipelinePat = sum(
    data.companies.filter(
      (c) => !NASDAQ_COMMITTED_STATUSES.includes(c.status),
    ),
    (c) => c.patContribution,
  );

  return {
    target: NASDAQ_PAT_TARGET,
    committedPat,
    pipelinePat,
    pct: clamp01(ratio(committedPat, NASDAQ_PAT_TARGET)),
    pctWithPipeline: clamp01(
      ratio(committedPat + pipelinePat, NASDAQ_PAT_TARGET),
    ),
    gap: Math.max(0, NASDAQ_PAT_TARGET - committedPat),
    companiesAgreed: data.companies.filter((c) =>
      NASDAQ_COMMITTED_STATUSES.includes(c.status),
    ).length,
    totalCompanies: data.companies.length,
    buckets,
  };
}

/* -------------------------------------------------------------------------- */
/* MEC Asset (HR) — revenue, deliberately separate from the RM20M raise        */
/* -------------------------------------------------------------------------- */

/** Roll-ups are annual, so anything outside the target year is ignored. */
export function isMecInYear(record: MecRecord): boolean {
  return record.periodYear === MEC_TARGET_YEAR;
}

/** Dropped records never appear in a total, at any status. */
export function isMecLive(record: MecRecord): boolean {
  return record.status !== "lost" && isMecInYear(record);
}

/** Booked, billed or banked — the MEC equivalent of "committed". */
export function isMecCommitted(record: MecRecord): boolean {
  return MEC_COMMITTED_STATUSES.includes(record.status) && isMecInYear(record);
}

/** Cash actually in MEC Asset's account. */
export function isMecReceived(record: MecRecord): boolean {
  return record.status === "received" && isMecInYear(record);
}

/** In discussion only — shown, never counted as committed. */
export function isMecPipeline(record: MecRecord): boolean {
  return record.status === "enquiry" && isMecInYear(record);
}

export interface MecStreamBucket {
  key: MecStreamKey;
  label: string;
  short: string;
  group: MecStreamGroup;
  tone: Tone;
  hint: string;
  target: number;
  /** false for ESOS and Outsource — the panel must not print "0% of RM0". */
  hasTarget: boolean;
  /** Year-scoped, excluding lost. */
  records: MecRecord[];
  count: number;
  received: number;
  committed: number;
  pipeline: number;
  /** Committed but not yet paid. */
  inFlight: number;
  pct: number;
  receivedPct: number;
  pctWithPipeline: number;
  gap: number;
}

export function getMecStreams(data: DashboardData): MecStreamBucket[] {
  return MEC_STREAMS.map((stream) => {
    const all = data.mec.filter((r) => r.stream === stream.key);
    const records = all.filter(isMecLive);
    const received = sum(all.filter(isMecReceived), (r) => r.amount);
    const committed = sum(all.filter(isMecCommitted), (r) => r.amount);
    const pipeline = sum(all.filter(isMecPipeline), (r) => r.amount);

    return {
      ...stream,
      hasTarget: stream.target > 0,
      records,
      count: records.length,
      received,
      committed,
      pipeline,
      inFlight: committed - received,
      pct: clamp01(ratio(committed, stream.target)),
      receivedPct: clamp01(ratio(received, stream.target)),
      pctWithPipeline: clamp01(ratio(committed + pipeline, stream.target)),
      gap: Math.max(0, stream.target - committed),
    };
  });
}

export interface MecSummary {
  year: number;
  target: number;
  received: number;
  committed: number;
  inFlight: number;
  pipeline: number;
  gap: number;
  receivedPct: number;
  committedPct: number;
  pctWithPipeline: number;
  externalTarget: number;
  externalReceived: number;
  externalCommitted: number;
  internalTarget: number;
  internalReceived: number;
  internalCommitted: number;
  /** 10% of MEC revenue, flowing upward to MCN. */
  upwardReceived: number;
  upwardCommitted: number;
  /** 20% of MEC revenue, funding the operating / profit-sharing pool. */
  poolReceived: number;
  poolCommitted: number;
  patReceived: number;
  patCommitted: number;
  recordCount: number;
  streams: MecStreamBucket[];
}

export function getMecSummary(data: DashboardData): MecSummary {
  const streams = getMecStreams(data);
  const external = streams.filter((s) => s.group === "external");
  const internal = streams.filter((s) => s.group === "internal");

  const received = sum(streams, (s) => s.received);
  const committed = sum(streams, (s) => s.committed);
  const pipeline = sum(streams, (s) => s.pipeline);

  return {
    year: MEC_TARGET_YEAR,
    target: MEC_ANNUAL_TARGET,
    received,
    committed,
    inFlight: committed - received,
    pipeline,
    gap: Math.max(0, MEC_ANNUAL_TARGET - committed),
    receivedPct: clamp01(ratio(received, MEC_ANNUAL_TARGET)),
    committedPct: clamp01(ratio(committed, MEC_ANNUAL_TARGET)),
    pctWithPipeline: clamp01(
      ratio(committed + pipeline, MEC_ANNUAL_TARGET),
    ),
    externalTarget: sum(external, (s) => s.target),
    externalReceived: sum(external, (s) => s.received),
    externalCommitted: sum(external, (s) => s.committed),
    internalTarget: sum(internal, (s) => s.target),
    internalReceived: sum(internal, (s) => s.received),
    internalCommitted: sum(internal, (s) => s.committed),
    upwardReceived: received * MEC_UPWARD_RATE,
    upwardCommitted: committed * MEC_UPWARD_RATE,
    poolReceived: received * MEC_POOL_RATE,
    poolCommitted: committed * MEC_POOL_RATE,
    patReceived: received * MEC_PAT_MARGIN,
    patCommitted: committed * MEC_PAT_MARGIN,
    recordCount: sum(streams, (s) => s.count),
    streams,
  };
}

export interface MecPerStaff {
  /** Annual revenue one staff member is expected to carry. */
  band: { min: number; max: number };
  /** The same band at the PAT margin — RM190k to RM500k. */
  patBand: { min: number; max: number };
  /** 0 = headcount not declared. */
  headcount: number;
  revenuePerStaff: number | null;
  patPerStaff: number | null;
  /** Staff the annual target implies at each end of the band. */
  impliedStaffAtMin: number;
  impliedStaffAtMax: number;
  withinBand: boolean | null;
}

export function getMecPerStaff(summary: MecSummary): MecPerStaff {
  const band = MEC_REVENUE_PER_STAFF;
  const headcount = MEC_HEADCOUNT;
  const revenuePerStaff = headcount > 0 ? summary.committed / headcount : null;

  return {
    band,
    patBand: {
      min: band.min * MEC_PAT_MARGIN,
      max: band.max * MEC_PAT_MARGIN,
    },
    headcount,
    revenuePerStaff,
    patPerStaff:
      revenuePerStaff === null ? null : revenuePerStaff * MEC_PAT_MARGIN,
    // Fewer staff are needed if each carries the top of the band, so the
    // larger divisor gives the smaller number.
    impliedStaffAtMin: Math.ceil(ratio(summary.target, band.min)),
    impliedStaffAtMax: Math.ceil(ratio(summary.target, band.max)),
    withinBand:
      revenuePerStaff === null
        ? null
        : revenuePerStaff >= band.min && revenuePerStaff <= band.max,
  };
}

/* -------------------------------------------------------------------------- */
/* MEC partnership desk                                                        */
/* -------------------------------------------------------------------------- */

/**
 * The professional service fee earned on one sponsorship deal.
 *
 * Derived from the contract value every time it is read, never stored, so it
 * cannot drift from the amount. Nothing at proposal, half on signing, all on
 * delivery. A record with no fee stage set has earned nothing.
 */
export function mecServiceFee(record: MecRecord): {
  full: number;
  earned: number;
  outstanding: number;
} {
  const full = record.amount * MEC_SERVICE_FEE_RATE;
  const stage = MEC_FEE_STAGES.find((s) => s.key === record.feeStage);
  const earned = full * (stage?.earned ?? 0);
  return { full, earned, outstanding: full - earned };
}

export interface PartnershipSummary {
  /** Personal Year-1 quota — a slice of the corporate_sponsor stream. */
  quota: number;
  /** Contract value signed or delivered, against the quota. */
  contracted: number;
  /** Everything including proposals still open. */
  pipeline: number;
  quotaPct: number;
  quotaGap: number;
  /** Service fee across every owned deal, at the full 10%. */
  feeFull: number;
  /** The part actually earned given each deal's stage. */
  feeEarned: number;
  feeOutstanding: number;
  deals: MecRecord[];
  dealCount: number;
  byStage: {
    key: MecFeeStage;
    label: string;
    hint: string;
    tone: Tone;
    deals: MecRecord[];
    count: number;
    contractValue: number;
    feeEarned: number;
  }[];
  byTier: {
    key: MecProjectTier;
    label: string;
    count: number;
    contractValue: number;
  }[];
}

/**
 * Sponsorship performance for one owner. Pass `ownerId` to scope it to a
 * person; pass null to measure the whole desk.
 */
export function getPartnershipSummary(
  data: DashboardData,
  ownerId: string | null,
): PartnershipSummary {
  const deals = data.mec.filter(
    (r) =>
      r.stream === "corporate_sponsor" &&
      isMecLive(r) &&
      (ownerId === null || r.ownerId === ownerId),
  );

  // Quota measures signed business, so a proposal does not count toward it.
  const contracted = sum(
    deals.filter((d) => d.feeStage === "contract_signed" || d.feeStage === "delivered"),
    (d) => d.amount,
  );

  const feeFull = sum(deals, (d) => mecServiceFee(d).full);
  const feeEarned = sum(deals, (d) => mecServiceFee(d).earned);

  return {
    quota: MEC_PARTNERSHIP_QUOTA,
    contracted,
    pipeline: sum(deals, (d) => d.amount),
    quotaPct: clamp01(ratio(contracted, MEC_PARTNERSHIP_QUOTA)),
    quotaGap: Math.max(0, MEC_PARTNERSHIP_QUOTA - contracted),
    feeFull,
    feeEarned,
    feeOutstanding: feeFull - feeEarned,
    deals,
    dealCount: deals.length,
    byStage: MEC_FEE_STAGES.map((stage) => {
      const staged = deals.filter((d) => d.feeStage === stage.key);
      return {
        key: stage.key,
        label: stage.label,
        hint: stage.hint,
        tone: stage.tone,
        deals: staged,
        count: staged.length,
        contractValue: sum(staged, (d) => d.amount),
        feeEarned: sum(staged, (d) => mecServiceFee(d).earned),
      };
    }),
    byTier: MEC_PROJECT_TIERS.map((tier) => {
      const tiered = deals.filter((d) => d.projectTier === tier.key);
      return {
        key: tier.key,
        label: tier.label,
        count: tiered.length,
        contractValue: sum(tiered, (d) => d.amount),
      };
    }),
  };
}

export interface InitiativeSummary {
  total: number;
  byStatus: {
    key: PartnershipStatus;
    label: string;
    tone: Tone;
    count: number;
  }[];
  byFocus: { key: PartnershipFocusArea; label: string; count: number }[];
}

export function getInitiativeSummary(data: DashboardData): InitiativeSummary {
  const all = data.initiatives;
  return {
    total: all.length,
    byStatus: PARTNERSHIP_STATUSES.map((s) => ({
      ...s,
      count: all.filter((i) => i.status === s.key).length,
    })),
    byFocus: PARTNERSHIP_FOCUS_AREAS.map((f) => ({
      ...f,
      count: all.filter((i) => i.focusArea === f.key).length,
    })),
  };
}

export interface SynergySummary {
  total: number;
  /** Stakeholders engaged. A count — never added to any RM figure. */
  totalReach: number;
  bySubsidiary: { name: string; count: number; reach: number }[];
  byStatus: {
    key: PartnershipStatus;
    label: string;
    tone: Tone;
    count: number;
  }[];
}

export function getSynergySummary(data: DashboardData): SynergySummary {
  const all = data.synergy;
  const map = new Map<string, { name: string; count: number; reach: number }>();
  for (const log of all) {
    const entry = map.get(log.subsidiary) ?? {
      name: log.subsidiary,
      count: 0,
      reach: 0,
    };
    entry.count += 1;
    entry.reach += log.reachMetric;
    map.set(log.subsidiary, entry);
  }

  return {
    total: all.length,
    totalReach: sum(all, (l) => l.reachMetric),
    bySubsidiary: [...map.values()].sort((a, b) => b.reach - a.reach),
    byStatus: PARTNERSHIP_STATUSES.map((s) => ({
      ...s,
      count: all.filter((l) => l.status === s.key).length,
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* MEC Lifestyle — operations desk                                             */
/* -------------------------------------------------------------------------- */

/** How far through the four-step checklist a champion is. */
export function cecProgress(cec: CecChampion): {
  done: number;
  total: number;
  complete: boolean;
} {
  const done = CEC_ONBOARDING_STEPS.filter((s) => cec[s.key]).length;
  return {
    done,
    total: CEC_ONBOARDING_STEPS.length,
    complete: done === CEC_ONBOARDING_STEPS.length,
  };
}

export interface LifestyleOpsSummary {
  cecTotal: number;
  cecComplete: number;
  /** Onboarded but not yet handed to the Ops Admin Associate. */
  cecAwaitingHandoff: CecChampion[];
  eventTotal: number;
  eventsByStatus: {
    key: EventSupportStatus;
    label: string;
    hint: string;
    tone: Tone;
    events: LifestyleEvent[];
    count: number;
  }[];
  serviceCallCount: number;
  /** Completed events with no media handed off yet — the real backlog. */
  mediaOutstanding: LifestyleEvent[];
  mediaHandedOff: number;
  /** The monthly fee, and whether this month has been invoiced. */
  monthlyFee: number;
  invoicesSubmitted: number;
  invoicedToDate: number;
}

export function getLifestyleOpsSummary(
  data: DashboardData,
  now: string,
): LifestyleOpsSummary {
  const period = now.slice(0, 7);
  void period;

  const mediaByEvent = new Map(data.media.map((m) => [m.eventId, m]));
  const completed = data.events.filter((e) => e.supportStatus === "completed");

  const submitted = data.invoices.filter((i) => i.status === "submitted");

  return {
    cecTotal: data.cecs.length,
    cecComplete: data.cecs.filter((c) => cecProgress(c).complete).length,
    cecAwaitingHandoff: data.cecs.filter(
      (c) => c.profileSecured && !c.handedToAdmin,
    ),
    eventTotal: data.events.length,
    eventsByStatus: EVENT_SUPPORT_STATUSES.map((status) => {
      const events = data.events.filter((e) => e.supportStatus === status.key);
      return { ...status, events, count: events.length };
    }),
    serviceCallCount: data.serviceCalls.length,
    mediaOutstanding: completed.filter(
      (e) => !mediaByEvent.get(e.id)?.handedOff,
    ),
    mediaHandedOff: data.media.filter((m) => m.handedOff).length,
    monthlyFee: LIFESTYLE_MONTHLY_FEE,
    invoicesSubmitted: submitted.length,
    // A cost to MEC. Deliberately never added to any revenue figure.
    invoicedToDate: sum(submitted, (i) => i.amount),
  };
}

/* -------------------------------------------------------------------------- */
/* Ops Admin Associate — deliverable-based fees                                */
/* -------------------------------------------------------------------------- */

export interface DeliverableBreakdown {
  key: DeliverableCategory;
  label: string;
  unit: string;
  hint: string;
  tone: Tone;
  /** The current rate card figure, for display. */
  currentRate: number;
  count: number;
  /** Sum of each deliverable's own stored rate — the billable figure. */
  fee: number;
  items: Deliverable[];
}

export interface DeliverableSummary {
  year: number;
  month: number;
  /** Deliverables in the billing month, whoever logged them. */
  items: Deliverable[];
  breakdown: DeliverableBreakdown[];
  totalCount: number;
  /** What the month is worth, summing each row's agreed rate. */
  totalFee: number;
  /** Already rolled into an invoice, so not billable again. */
  invoicedFee: number;
  /** Logged but not yet on any invoice — what the next invoice is worth. */
  unbilledFee: number;
  /** CEC profiles published this month against the one-per-week target. */
  cecProfileCount: number;
  cecProfileTarget: number;
}

/**
 * Aggregates one billing month against the rate card.
 *
 * Fees sum each deliverable's own `rateApplied`, never the current constant,
 * so a renegotiated rate card cannot retroactively change what a past month
 * was worth.
 */
export function getDeliverableSummary(
  data: DashboardData,
  year: number,
  month: number,
  ownerId: string | null,
): DeliverableSummary {
  const items = data.deliverables.filter((d) => {
    if (ownerId !== null && d.ownerId !== ownerId) return false;
    const on = new Date(`${d.occurredOn}T00:00:00Z`);
    return on.getUTCFullYear() === year && on.getUTCMonth() + 1 === month;
  });

  const breakdown: DeliverableBreakdown[] = DELIVERABLE_CATEGORIES.map((cat) => {
    const own = items.filter((d) => d.category === cat.key);
    return {
      key: cat.key,
      label: cat.label,
      unit: cat.unit,
      hint: cat.hint,
      tone: cat.tone,
      currentRate: cat.rate,
      count: own.length,
      fee: sum(own, (d) => d.rateApplied),
      items: own,
    };
  });

  const invoiced = items.filter((d) => d.invoiceId !== null);
  const unbilled = items.filter((d) => d.invoiceId === null);

  // Weeks in the month, so the profile target scales with a short February.
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return {
    year,
    month,
    items,
    breakdown,
    totalCount: items.length,
    totalFee: sum(items, (d) => d.rateApplied),
    invoicedFee: sum(invoiced, (d) => d.rateApplied),
    unbilledFee: sum(unbilled, (d) => d.rateApplied),
    cecProfileCount: items.filter((d) => d.category === "cec_profile").length,
    cecProfileTarget: Math.round(
      (daysInMonth / 7) * CEC_PROFILE_WEEKLY_TARGET,
    ),
  };
}

/* -------------------------------------------------------------------------- */
/* Introducer commissions — a liability, not revenue                          */
/* -------------------------------------------------------------------------- */

export interface CommissionSummary {
  accrued: number;
  paid: number;
  lifetime: number;
  accruedCount: number;
  paidCount: number;
  overdue: Commission[];
  overdueAmount: number;
  byIntroducer: {
    name: string;
    phone: string;
    accrued: number;
    paid: number;
    count: number;
  }[];
}

export function getCommissionSummary(
  data: DashboardData,
  now: string,
): CommissionSummary {
  const accruedRows = data.commissions.filter((c) => c.status === "accrued");
  const paidRows = data.commissions.filter((c) => c.status === "paid");
  const overdue = accruedRows.filter((c) => daysBetween(c.dueAt, now) > 0);

  const map = new Map<string, CommissionSummary["byIntroducer"][number]>();
  for (const row of data.commissions) {
    const entry = map.get(row.introducerName) ?? {
      name: row.introducerName,
      phone: row.introducerPhone,
      accrued: 0,
      paid: 0,
      count: 0,
    };
    if (row.status === "paid") entry.paid += row.amount;
    else entry.accrued += row.amount;
    entry.count += 1;
    map.set(row.introducerName, entry);
  }

  return {
    accrued: sum(accruedRows, (c) => c.amount),
    paid: sum(paidRows, (c) => c.amount),
    lifetime: sum(data.commissions, (c) => c.amount),
    accruedCount: accruedRows.length,
    paidCount: paidRows.length,
    overdue,
    overdueAmount: sum(overdue, (c) => c.amount),
    byIntroducer: [...map.values()].sort((a, b) => b.accrued - a.accrued),
  };
}

/* -------------------------------------------------------------------------- */
/* Monthly capital trend                                                       */
/* -------------------------------------------------------------------------- */

export interface TrendPoint {
  month: string;
  label: string;
  received: number;
  cumulative: number;
  /** Straight-line pace that would land exactly on target at the deadline. */
  targetPace: number;
  isFuture: boolean;
}

export function getCapitalTrend(
  data: DashboardData,
  now: string,
): TrendPoint[] {
  const start = new Date(`${CAMPAIGN_START}T00:00:00Z`);
  const end = new Date(`${FUNDRAISING_DEADLINE}T00:00:00Z`);
  const nowDate = new Date(`${now.slice(0, 10)}T00:00:00Z`);

  const months: { key: string; label: string; date: Date }[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    months.push({
      key: `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`,
      label: cursor.toLocaleString("en-MY", { month: "short", timeZone: "UTC" }),
      date: new Date(cursor),
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  const events: { month: string; amount: number }[] = [
    ...data.factories.filter((d) => d.investedAt).map((d) => ({
      month: d.investedAt!.slice(0, 7),
      amount: d.hqInvestmentAmount,
    })),
    ...data.members.filter((m) => m.investedAt).map((m) => ({
      month: m.investedAt!.slice(0, 7),
      amount: m.hqInvestmentAmount,
    })),
  ];

  let running = 0;
  return months.map((m, i) => {
    const received = sum(
      events.filter((e) => e.month === m.key),
      (e) => e.amount,
    );
    const isFuture = m.date > nowDate;
    if (!isFuture) running += received;
    return {
      month: m.key,
      label: m.label,
      received: isFuture ? 0 : received,
      cumulative: isFuture ? 0 : running,
      targetPace: Math.round((FUNDRAISING_TARGET / months.length) * (i + 1)),
      isFuture,
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Drill-down row mappers — every module funnels into one table shape          */
/* -------------------------------------------------------------------------- */

const FACTORY_TONE: Record<FactoryStage, Tone> = {
  submitted: "idle",
  processing: "risk",
  disbursed: "committed",
  invested: "received",
};

export function factoryRows(deals: FactoryDeal[], now: string): DrillRow[] {
  return deals.map((deal) => {
    const stage = FACTORY_STAGES.find((s) => s.key === deal.stage)!;
    const overdue = factoryOverdueDays(deal, now);
    const stalled = isFactoryStalled(deal, now);
    return {
      id: deal.id,
      name: deal.companyName,
      subtitle: `${deal.contactPerson} · introduced by ${deal.introducerName}`,
      phone: deal.phone,
      amount: deal.hqInvestmentAmount,
      amountLabel: "into HQ",
      statusLabel: stage.label,
      statusTone: stalled ? "stalled" : FACTORY_TONE[deal.stage],
      date:
        deal.investedAt ??
        deal.disbursedAt ??
        deal.processingStartedAt ??
        deal.submittedAt,
      dateLabel: deal.investedAt
        ? "Invested"
        : deal.disbursedAt
          ? "Disbursed"
          : deal.processingStartedAt
            ? "Processing since"
            : "Submitted",
      documents: deal.documents,
      flag: stalled
        ? `${overdue} days past the expected disbursement window`
        : undefined,
    };
  });
}

const MDNA_TONE: Record<MdnaStatus, Tone> = {
  prospect: "idle",
  signed: "risk",
  paid: "committed",
  invested: "received",
};

export function mdnaRows(members: MdnaMember[]): DrillRow[] {
  return members.map((member) => {
    const status = MDNA_STATUSES.find((s) => s.key === member.status)!;
    return {
      id: member.id,
      name: member.memberName,
      subtitle: `RM500k package · referred by ${member.referrer}`,
      phone: member.phone,
      amount: member.hqInvestmentAmount,
      amountLabel: "into HQ",
      statusLabel: status.label,
      statusTone: MDNA_TONE[member.status],
      date: member.investedAt ?? member.paidAt ?? member.signedAt,
      dateLabel: member.investedAt
        ? "Invested"
        : member.paidAt
          ? "Paid"
          : member.signedAt
            ? "Signed"
            : "No date",
      documents: member.documents,
    };
  });
}

const NASDAQ_TONE: Record<NasdaqStatus, Tone> = {
  in_discussion: "idle",
  loi_signed: "risk",
  due_diligence: "risk",
  agreed: "committed",
  onboarded: "received",
};

export function nasdaqRows(companies: NasdaqCompany[]): DrillRow[] {
  return companies.map((company) => {
    const status = NASDAQ_STATUSES.find((s) => s.key === company.status)!;
    return {
      id: company.id,
      name: company.companyName,
      subtitle: `${company.contactPerson} · ${company.sector}`,
      phone: company.phone,
      amount: company.patContribution,
      amountLabel: "PAT",
      statusLabel: status.label,
      statusTone: NASDAQ_TONE[company.status],
      date: company.agreedAt,
      dateLabel: "Agreed",
      documents: company.documents,
      flag: NASDAQ_COMMITTED_STATUSES.includes(company.status)
        ? undefined
        : "Pipeline only — not yet counted toward the RM6M PAT target",
    };
  });
}

const MEC_TONE: Record<MecRecordStatus, Tone> = {
  enquiry: "idle",
  contracted: "risk",
  invoiced: "committed",
  received: "received",
  lost: "stalled",
};

/**
 * MEC rows carry gross revenue. The 10% upward and 20% pool figures are
 * derived views of the same rows — see `mecDerivedDrill` in drilldowns.ts.
 */
export function mecRows(records: MecRecord[]): DrillRow[] {
  return records.map((record) => {
    const stream = MEC_STREAMS.find((s) => s.key === record.stream)!;
    const status = MEC_STATUSES.find((s) => s.key === record.status)!;
    const units =
      record.units !== null && record.unitLabel
        ? ` · ${record.units} ${record.unitLabel}`
        : "";

    return {
      id: record.id,
      name: record.clientName,
      subtitle: `${stream.label}${units}`,
      phone: record.phone,
      amount: record.amount,
      amountLabel: "revenue",
      statusLabel: status.label,
      statusTone: MEC_TONE[record.status],
      date: record.receivedAt ?? record.invoicedAt ?? record.contractedAt,
      dateLabel: record.receivedAt
        ? "Paid"
        : record.invoicedAt
          ? "Invoiced"
          : record.contractedAt
            ? "Contracted"
            : "No date",
      documents: record.documents,
      flag:
        record.status === "enquiry"
          ? "Pipeline only — not yet counted as committed MEC revenue"
          : record.status === "lost"
            ? "Dropped — excluded from every MEC total"
            : undefined,
    };
  });
}

export function commissionRows(rows: Commission[], now: string): DrillRow[] {
  return rows.map((row) => {
    const overdueDays =
      row.status === "accrued" ? Math.max(0, daysBetween(row.dueAt, now)) : 0;
    return {
      id: row.id,
      name: row.introducerName,
      subtitle: `${row.factoryName} · on ${row.trigger === "disbursement" ? "RM4M disbursement" : "RM1M HQ investment"}`,
      phone: row.introducerPhone,
      amount: row.amount,
      amountLabel: row.status === "paid" ? "paid" : "payable",
      statusLabel: row.status === "paid" ? "Paid" : "Accrued",
      statusTone:
        row.status === "paid" ? "received" : overdueDays > 0 ? "stalled" : "risk",
      date: row.paidAt ?? row.dueAt,
      dateLabel: row.paidAt ? "Paid" : "Due",
      documents: row.documents,
      flag: overdueDays > 0 ? `${overdueDays} days overdue` : undefined,
    };
  });
}

/* -------------------------------------------------------------------------- */

function sum<T>(items: T[], pick: (item: T) => number): number {
  return items.reduce((total, item) => total + pick(item), 0);
}

