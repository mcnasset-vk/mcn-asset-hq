import {
  CAMPAIGN_START,
  FACTORY_HQ_INVESTMENT,
  FACTORY_STAGES,
  FUNDRAISING_DEADLINE,
  FUNDRAISING_TARGET,
  MDNA_HQ_INVESTMENT,
  MDNA_STATUSES,
  NASDAQ_COMMITTED_STATUSES,
  NASDAQ_PAT_TARGET,
  NASDAQ_STATUSES,
} from "./constants";
import { clamp01, daysBetween, daysRemaining, ratio } from "./format";
import type { DashboardData } from "./data";
import type {
  Commission,
  DrillRow,
  FactoryDeal,
  FactoryStage,
  MdnaMember,
  MdnaStatus,
  NasdaqCompany,
  NasdaqStatus,
  Tone,
} from "./types";

/* ==========================================================================
   THE RULE
   --------------------------------------------------------------------------
   Only two things count toward the RM20,000,000 target:
     Factory Cosif  — RM1,000,000 per factory
     MDNA Co-Living — RM50,000 per member
   Nasdaq M&A is measured in profit-after-tax and never touches this figure.

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

