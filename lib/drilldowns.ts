import {
  FACTORY_STAGES,
  MDNA_STATUSES,
  MEC_ANNUAL_TARGET,
  MEC_PAT_MARGIN,
  MEC_POOL_RATE,
  MEC_STATUSES,
  MEC_STREAMS,
  MEC_TARGET_YEAR,
  MEC_UPWARD_RATE,
  MICANA_STAGES,
  MICANA_TENANT_STATUSES,
  NASDAQ_STATUSES,
} from "./constants";
import {
  airconRows,
  bungalowRows,
  commissionRows,
  factoryRows,
  isBungalowExited,
  isFactoryCommitted,
  isFactoryReceived,
  isFactoryStalled,
  isMdnaCommitted,
  isMdnaReceived,
  isMecCommitted,
  isMecLive,
  isMecReceived,
  isPayoutOverdue,
  isRenovationLate,
  isRenovationOverrun,
  isTenantOccupying,
  mdnaRows,
  mecRows,
  micanaTenantRows,
  nasdaqRows,
  ownerPayoutRows,
} from "./metrics";
import type { DashboardData } from "./data";
import type {
  DrillDownContent,
  DrillRow,
  FactoryStage,
  MdnaStatus,
  MecRecordStatus,
  MecStreamGroup,
  MecStreamKey,
  MicanaStage,
  MicanaTenantStatus,
  NasdaqStatus,
} from "./types";

const total = (rows: DrillRow[]) =>
  rows.reduce((sum, row) => sum + row.amount, 0);

/* -------------------------------------------------------------------------- */
/* Capital — combined across Factory + MDNA                                    */
/* -------------------------------------------------------------------------- */

export function receivedDrill(data: DashboardData, now: string): DrillDownContent {
  const rows = [
    ...factoryRows(data.factories.filter(isFactoryReceived), now),
    ...mdnaRows(data.members.filter(isMdnaReceived)),
  ];
  return {
    title: "Capital Received",
    subtitle:
      "Money actually banked by MCN Asset HQ — RM1M per factory, RM50k per MDNA member.",
    total: total(rows),
    totalLabel: `${rows.length} contributions`,
    amountHeader: "Into HQ (RM)",
    rows,
  };
}

export function committedDrill(data: DashboardData, now: string): DrillDownContent {
  const rows = [
    ...factoryRows(data.factories.filter(isFactoryCommitted), now),
    ...mdnaRows(data.members.filter(isMdnaCommitted)),
  ];
  return {
    title: "Capital Committed",
    subtitle:
      "Everything signed or disbursed, whether or not the money has reached HQ yet.",
    total: total(rows),
    totalLabel: `${rows.length} commitments`,
    amountHeader: "Into HQ (RM)",
    rows,
  };
}

export function inFlightDrill(data: DashboardData, now: string): DrillDownContent {
  const rows = [
    ...factoryRows(
      data.factories.filter((d) => isFactoryCommitted(d) && !isFactoryReceived(d)),
      now,
    ),
    ...mdnaRows(
      data.members.filter((m) => isMdnaCommitted(m) && !isMdnaReceived(m)),
    ),
  ];
  return {
    title: "Committed, Not Yet Banked",
    subtitle:
      "Capital that is contractually committed but has not landed in the HQ account. This is the gap between the two progress bands.",
    total: total(rows),
    totalLabel: `${rows.length} awaiting transfer`,
    amountHeader: "Into HQ (RM)",
    rows,
  };
}

export function activeDealsDrill(data: DashboardData, now: string): DrillDownContent {
  const rows = [
    ...factoryRows(
      data.factories.filter((d) => !isFactoryReceived(d)),
      now,
    ),
    ...mdnaRows(data.members.filter((m) => !isMdnaReceived(m))),
    ...nasdaqRows(data.companies.filter((c) => c.status !== "onboarded")),
    ...mecRows(
      data.mec.filter((r) => isMecLive(r) && !isMecReceived(r)),
    ),
  ];
  return {
    title: "Open Pipeline",
    subtitle:
      "Every record across all four business lines that has not yet completed. Factory and MDNA amounts are capital into HQ, Nasdaq amounts are profit-after-tax, and MEC amounts are gross revenue — they are never added together.",
    rows,
    amountHeader: "Amount (RM)",
    hideTotal: true,
  };
}

/* -------------------------------------------------------------------------- */
/* Factory Cosif                                                               */
/* -------------------------------------------------------------------------- */

export function factoryStageDrill(
  data: DashboardData,
  stage: FactoryStage,
  now: string,
): DrillDownContent {
  const meta = FACTORY_STAGES.find((s) => s.key === stage)!;
  const deals = data.factories.filter((d) => d.stage === stage);
  const rows = factoryRows(deals, now);
  return {
    title: `Factory Cosif — ${meta.label}`,
    subtitle: meta.hint,
    total: total(rows),
    totalLabel: `${rows.length} ${rows.length === 1 ? "factory" : "factories"} · RM1M into HQ each`,
    amountHeader: "Into HQ (RM)",
    rows,
  };
}

export function allFactoriesDrill(data: DashboardData, now: string): DrillDownContent {
  const rows = factoryRows(data.factories, now);
  return {
    title: "Factory Cosif — All Factories",
    subtitle:
      "Every factory in the programme, from document submission through to the RM1M investment into HQ.",
    total: total(rows),
    totalLabel: `${rows.length} factories at full pipeline value`,
    amountHeader: "Into HQ (RM)",
    rows,
  };
}

export function stalledFactoriesDrill(data: DashboardData, now: string): DrillDownContent {
  const deals = data.factories.filter((d) => isFactoryStalled(d, now));
  const rows = factoryRows(deals, now);
  return {
    title: "Stalled in Processing",
    subtitle:
      "Factories past their expected 2–3 month disbursement window. These are counted as pipeline, not committed.",
    total: total(rows),
    totalLabel: `${rows.length} at risk`,
    amountHeader: "Into HQ (RM)",
    rows,
  };
}

/* -------------------------------------------------------------------------- */
/* MDNA                                                                        */
/* -------------------------------------------------------------------------- */

export function mdnaStatusDrill(data: DashboardData, status: MdnaStatus): DrillDownContent {
  const meta = MDNA_STATUSES.find((s) => s.key === status)!;
  const members = data.members.filter((m) => m.status === status);
  const rows = mdnaRows(members);
  return {
    title: `MDNA Admin — ${meta.label}`,
    subtitle: meta.hint,
    total: total(rows),
    totalLabel: `${rows.length} members · RM50k into HQ each`,
    amountHeader: "Into HQ (RM)",
    rows,
  };
}

export function allMdnaDrill(data: DashboardData): DrillDownContent {
  const rows = mdnaRows(data.members);
  return {
    title: "MDNA Admin — All Members",
    subtitle:
      "Every member on the RM500,000 package. RM50,000 of each package is invested into MCN Asset HQ.",
    total: total(rows),
    totalLabel: `${rows.length} members at full pipeline value`,
    amountHeader: "Into HQ (RM)",
    rows,
  };
}

/* -------------------------------------------------------------------------- */
/* Nasdaq                                                                      */
/* -------------------------------------------------------------------------- */

export function nasdaqStatusDrill(
  data: DashboardData,
  status: NasdaqStatus,
): DrillDownContent {
  const meta = NASDAQ_STATUSES.find((s) => s.key === status)!;
  const companies = data.companies.filter((c) => c.status === status);
  const rows = nasdaqRows(companies);
  return {
    title: `Nasdaq Listing — ${meta.label}`,
    subtitle: `${meta.hint}. Amounts are profit-after-tax contributions toward the RM6M group target.`,
    total: total(rows),
    totalLabel: `${rows.length} ${rows.length === 1 ? "company" : "companies"} · PAT`,
    amountHeader: "PAT (RM)",
    rows,
  };
}

export function nasdaqCommittedDrill(data: DashboardData): DrillDownContent {
  const companies = data.companies.filter(
    (c) => c.status === "agreed" || c.status === "onboarded",
  );
  const rows = nasdaqRows(companies);
  return {
    title: "Nasdaq Listing — Committed PAT",
    subtitle:
      "Companies that have agreed to join or are already onboarded. Only these count toward the RM6M PAT target.",
    total: total(rows),
    totalLabel: `${rows.length} companies · PAT`,
    amountHeader: "PAT (RM)",
    rows,
  };
}

export function allNasdaqDrill(data: DashboardData): DrillDownContent {
  const rows = nasdaqRows(data.companies);
  return {
    title: "Nasdaq Listing — All Companies",
    subtitle:
      "The full M&A programme. Amounts are profit-after-tax, not capital raised — they never feed the RM20M target.",
    total: total(rows),
    totalLabel: `${rows.length} companies · PAT`,
    amountHeader: "PAT (RM)",
    rows,
  };
}

/* -------------------------------------------------------------------------- */
/* MEC Asset (HR)                                                              */
/* -------------------------------------------------------------------------- */

const MEC_NOTE =
  "MEC revenue is tracked against its own RM6,690,000 annual target and contributes RM0 to the RM20,000,000 raise.";

export function mecStreamDrill(
  data: DashboardData,
  stream: MecStreamKey,
): DrillDownContent {
  const meta = MEC_STREAMS.find((s) => s.key === stream)!;
  const rows = mecRows(data.mec.filter((r) => r.stream === stream && isMecLive(r)));
  return {
    title: `MEC Asset — ${meta.label}`,
    subtitle: meta.hint,
    total: total(rows),
    totalLabel: meta.target
      ? `${rows.length} records · RM${meta.target.toLocaleString("en-MY")} annual target`
      : `${rows.length} records · no annual target set`,
    amountHeader: "Revenue (RM)",
    rows,
  };
}

export function mecStatusDrill(
  data: DashboardData,
  status: MecRecordStatus,
): DrillDownContent {
  const meta = MEC_STATUSES.find((s) => s.key === status)!;
  const rows = mecRows(
    data.mec.filter(
      (r) => r.status === status && r.periodYear === MEC_TARGET_YEAR,
    ),
  );
  return {
    title: `MEC Asset — ${meta.label}`,
    subtitle: `${meta.hint}. ${MEC_NOTE}`,
    total: total(rows),
    totalLabel: `${rows.length} ${rows.length === 1 ? "record" : "records"}`,
    amountHeader: "Revenue (RM)",
    rows,
  };
}

export function mecGroupDrill(
  data: DashboardData,
  group: MecStreamGroup,
): DrillDownContent {
  const keys = MEC_STREAMS.filter((s) => s.group === group).map((s) => s.key);
  const rows = mecRows(
    data.mec.filter((r) => keys.includes(r.stream) && isMecLive(r)),
  );
  const target = MEC_STREAMS.filter((s) => s.group === group).reduce(
    (t, s) => t + s.target,
    0,
  );
  return {
    title: group === "external" ? "MEC Asset — External Revenue" : "MEC Asset — Internal Revenue",
    subtitle:
      group === "external"
        ? "Ticketing, corporate sponsorship, subscriptions, advisory and training sold outside the group."
        : "ESOS administration, outsourced admin and event support, and payroll services provided to group companies.",
    total: total(rows),
    totalLabel: `${rows.length} records · RM${target.toLocaleString("en-MY")} annual target`,
    amountHeader: "Revenue (RM)",
    rows,
  };
}

export function mecCommittedDrill(data: DashboardData): DrillDownContent {
  const rows = mecRows(data.mec.filter(isMecCommitted));
  return {
    title: "MEC Asset — Revenue Committed",
    subtitle: `Everything contracted, invoiced or already paid. ${MEC_NOTE}`,
    total: total(rows),
    totalLabel: `${rows.length} ${rows.length === 1 ? "record" : "records"}`,
    amountHeader: "Revenue (RM)",
    rows,
  };
}

export function allMecDrill(data: DashboardData): DrillDownContent {
  const rows = mecRows(data.mec.filter(isMecLive));
  return {
    title: "MEC Asset (HR) — All Records",
    subtitle: `Every live record across the eight revenue streams. ${MEC_NOTE}`,
    total: total(rows),
    totalLabel: `${rows.length} records against RM${MEC_ANNUAL_TARGET.toLocaleString("en-MY")}`,
    amountHeader: "Revenue (RM)",
    rows,
  };
}

/**
 * The 10% / 20% / PAT tiles restated as rows, so the drill-down total is
 * literally the figure on the tile — clickable proof of the arithmetic.
 */
export function mecDerivedDrill(
  data: DashboardData,
  kind: "upward" | "pool" | "pat",
): DrillDownContent {
  const meta = {
    upward: {
      rate: MEC_UPWARD_RATE,
      title: "MEC Asset — 10% Upward to MCN",
      subtitle:
        "Ten per cent of every ringgit MEC has been paid, flowing upward to MCN. Shown per record.",
      header: "10% to MCN (RM)",
      label: "10% upward",
    },
    pool: {
      rate: MEC_POOL_RATE,
      title: "MEC Asset — 20% Operating & Profit Pool",
      subtitle:
        "Twenty per cent of every ringgit MEC has been paid, funding operations and the staff profit-sharing pool.",
      header: "20% pool (RM)",
      label: "20% pool",
    },
    pat: {
      rate: MEC_PAT_MARGIN,
      title: "MEC Asset — Profit After Tax",
      subtitle:
        "Revenue paid to MEC at the 10% PAT margin. An estimate from the margin, not an accounted figure.",
      header: "PAT (RM)",
      label: "PAT at 10%",
    },
  }[kind];

  const rows = mecRows(data.mec.filter(isMecReceived)).map((row) => ({
    ...row,
    amount: row.amount * meta.rate,
    amountLabel: meta.label,
  }));

  return {
    title: meta.title,
    subtitle: meta.subtitle,
    total: total(rows),
    totalLabel: `${rows.length} paid records`,
    amountHeader: meta.header,
    rows,
  };
}

/* -------------------------------------------------------------------------- */
/* Micana — bungalows                                                          */
/* -------------------------------------------------------------------------- */

export function micanaStageDrill(
  data: DashboardData,
  stage: MicanaStage,
  now: string,
): DrillDownContent {
  const meta = MICANA_STAGES.find((s) => s.key === stage)!;
  const bungalows = data.bungalows.filter(
    (b) => b.stage === stage && !isBungalowExited(b),
  );
  const rows = bungalowRows(bungalows, now);
  return {
    title: `Micana — ${meta.label}`,
    subtitle: meta.hint,
    total: total(rows),
    totalLabel: `${rows.length} ${rows.length === 1 ? "bungalow" : "bungalows"} · renovation value`,
    amountHeader: "Renovation (RM)",
    rows,
  };
}

export function allBungalowsDrill(
  data: DashboardData,
  now: string,
): DrillDownContent {
  const rows = bungalowRows(data.bungalows, now);
  return {
    title: "Micana — All Bungalows",
    subtitle:
      "Every bungalow in the programme, from first sighting through renovation to operating. Amounts are renovation spend, not capital.",
    total: total(rows),
    totalLabel: `${rows.length} bungalows`,
    amountHeader: "Renovation (RM)",
    rows,
  };
}

export function renovationOverrunDrill(
  data: DashboardData,
  now: string,
): DrillDownContent {
  const rows = bungalowRows(
    data.bungalows.filter((b) => !isBungalowExited(b) && isRenovationOverrun(b)),
    now,
  );
  return {
    title: "Renovations Over Budget",
    subtitle:
      "Bungalows whose fit-out has run more than 5% past its budget. The amount shown is what has actually been spent.",
    total: total(rows),
    totalLabel: `${rows.length} over budget`,
    amountHeader: "Spent (RM)",
    rows,
  };
}

export function renovationLateDrill(
  data: DashboardData,
  now: string,
): DrillDownContent {
  const rows = bungalowRows(
    data.bungalows.filter((b) => isRenovationLate(b, now)),
    now,
  );
  return {
    title: "Renovations Past Target",
    subtitle:
      "Fit-outs past their target completion date with no completion recorded. Every week here is a week of rent not being earned.",
    total: total(rows),
    totalLabel: `${rows.length} running late`,
    amountHeader: "Spent (RM)",
    rows,
  };
}

/* -------------------------------------------------------------------------- */
/* Micana — tenants                                                            */
/* -------------------------------------------------------------------------- */

export function micanaTenantStatusDrill(
  data: DashboardData,
  status: MicanaTenantStatus,
): DrillDownContent {
  const meta = MICANA_TENANT_STATUSES.find((s) => s.key === status)!;
  const rows = micanaTenantRows(
    data.tenants.filter((t) => t.status === status),
  );
  return {
    title: `Micana Tenants — ${meta.label}`,
    subtitle: meta.hint,
    total: total(rows),
    totalLabel: `${rows.length} ${rows.length === 1 ? "tenant" : "tenants"} · monthly rent`,
    amountHeader: "Monthly Rent (RM)",
    rows,
  };
}

export function micanaTenantDrill(
  data: DashboardData,
  filter: "all" | "occupying" | "vacating" | "pipeline",
): DrillDownContent {
  const source = data.tenants.filter((t) => {
    if (filter === "all") return true;
    if (filter === "occupying") return isTenantOccupying(t);
    if (filter === "vacating") return t.status === "notice";
    return t.status === "enquiry" || t.status === "reserved";
  });
  const rows = micanaTenantRows(source);

  const titles = {
    all: "Micana Tenants — All",
    occupying: "Rooms Currently Filled",
    vacating: "Rooms Needing a Refill",
    pipeline: "Tenant Pipeline",
  } as const;

  const subtitles = {
    all: "Every tenancy on record, across every bungalow.",
    occupying:
      "Tenants in residence, including those under notice — the rooms earning rent today.",
    vacating:
      "Tenants who have given notice. These rooms come empty unless they are refilled.",
    pipeline: "Enquiries and reservations that have not yet moved in.",
  } as const;

  return {
    title: titles[filter],
    subtitle: subtitles[filter],
    total: total(rows),
    totalLabel: `${rows.length} ${rows.length === 1 ? "tenant" : "tenants"} · monthly rent`,
    amountHeader: "Monthly Rent (RM)",
    rows,
  };
}

export function bungalowTenantsDrill(
  data: DashboardData,
  bungalowId: string,
): DrillDownContent {
  const bungalow = data.bungalows.find((b) => b.id === bungalowId);
  const rows = micanaTenantRows(
    data.tenants.filter((t) => t.bungalowId === bungalowId),
  );
  return {
    title: `Tenants — ${bungalow?.bungalowName ?? "Bungalow"}`,
    subtitle: `${bungalow?.roomCount ?? 0} lettable rooms. Every tenancy recorded against this bungalow.`,
    total: total(rows),
    totalLabel: `${rows.length} ${rows.length === 1 ? "tenancy" : "tenancies"}`,
    amountHeader: "Monthly Rent (RM)",
    rows,
  };
}

/* -------------------------------------------------------------------------- */
/* Micana — aircon                                                             */
/* -------------------------------------------------------------------------- */

export function airconDrill(
  data: DashboardData,
  filter: "all" | "billable",
  month?: string,
): DrillDownContent {
  const source = data.airconReadings.filter((r) => {
    if (month && r.periodMonth !== month) return false;
    return filter === "all" || r.billableKwh > 0;
  });
  const rows = airconRows(source, data.tenants);
  return {
    title:
      filter === "billable" ? "Aircon Above Allowance" : "Aircon Meter Readings",
    subtitle:
      "kWh above the included allowance is billed on to the tenant at the bungalow's rate. The allowance and rate are snapshotted when each reading lands, so changing house policy never rewrites an old bill.",
    total: total(rows),
    totalLabel: `${rows.length} ${rows.length === 1 ? "reading" : "readings"}`,
    amountHeader: "Billed (RM)",
    rows,
  };
}

export function bungalowAirconDrill(
  data: DashboardData,
  bungalowId: string,
  month?: string,
): DrillDownContent {
  const bungalow = data.bungalows.find((b) => b.id === bungalowId);
  const source = data.airconReadings.filter(
    (r) => r.bungalowId === bungalowId && (!month || r.periodMonth === month),
  );
  const rows = airconRows(source, data.tenants);
  return {
    title: `Aircon — ${bungalow?.bungalowName ?? "Bungalow"}`,
    subtitle: `Included allowance ${bungalow?.defaultAirconAllowanceKwh ?? 0} kWh per room per month, charged at RM ${bungalow?.defaultAirconRatePerKwh ?? 0} per kWh above it.`,
    total: total(rows),
    totalLabel: `${rows.length} ${rows.length === 1 ? "reading" : "readings"}`,
    amountHeader: "Billed (RM)",
    rows,
  };
}

/* -------------------------------------------------------------------------- */
/* Micana — owner profit share                                                 */
/* -------------------------------------------------------------------------- */

export function micanaPayoutDrill(
  data: DashboardData,
  filter: "all" | "accrued" | "paid" | "overdue",
  now: string,
): DrillDownContent {
  const source = data.ownerPayouts.filter((p) => {
    if (filter === "all") return true;
    if (filter === "paid") return p.status === "paid";
    if (filter === "accrued") return p.status === "accrued";
    return isPayoutOverdue(p, now);
  });
  const rows = ownerPayoutRows(source, now);

  const titles = {
    all: "Owner Profit Share — All",
    accrued: "Outstanding Owner Payouts",
    paid: "Owner Payouts Settled",
    overdue: "Overdue Owner Payouts",
  } as const;

  return {
    title: titles[filter],
    subtitle:
      "Each bungalow's monthly net profit, split with its owner at the agreed percentage. The split is computed in the database and cannot be entered by hand. A loss month pays the owner nothing.",
    total: total(rows),
    totalLabel: `${rows.length} monthly ${rows.length === 1 ? "line" : "lines"}`,
    amountHeader: "Owner Share (RM)",
    rows,
  };
}

export function ownerPayoutDrill(
  data: DashboardData,
  ownerName: string,
  now: string,
): DrillDownContent {
  const rows = ownerPayoutRows(
    data.ownerPayouts.filter((p) => p.ownerName === ownerName),
    now,
  );
  return {
    title: `Owner Profit Share — ${ownerName}`,
    subtitle: "Every month of profit share generated for this owner.",
    total: total(rows),
    totalLabel: `${rows.length} monthly lines`,
    amountHeader: "Owner Share (RM)",
    rows,
  };
}

/* -------------------------------------------------------------------------- */
/* Commissions                                                                 */
/* -------------------------------------------------------------------------- */

export function commissionDrill(
  data: DashboardData,
  filter: "all" | "accrued" | "paid" | "overdue",
  now: string,
): DrillDownContent {
  const source = data.commissions.filter((c) => {
    if (filter === "all") return true;
    if (filter === "paid") return c.status === "paid";
    if (filter === "accrued") return c.status === "accrued";
    return c.status === "accrued" && new Date(c.dueAt) < new Date(now);
  });
  const rows = commissionRows(source, now);

  const titles = {
    all: "Introducer Commissions — All",
    accrued: "Outstanding Commissions",
    paid: "Commissions Paid",
    overdue: "Overdue Commissions",
  } as const;

  return {
    title: titles[filter],
    subtitle:
      "RM5,000 becomes payable on the RM4M disbursement and a further RM5,000 on the RM1M investment into HQ.",
    total: total(rows),
    totalLabel: `${rows.length} commission ${rows.length === 1 ? "line" : "lines"}`,
    amountHeader: "Commission (RM)",
    rows,
  };
}

export function introducerDrill(
  data: DashboardData,
  name: string,
  now: string,
): DrillDownContent {
  const rows = commissionRows(
    data.commissions.filter((c) => c.introducerName === name),
    now,
  );
  return {
    title: `Commissions — ${name}`,
    subtitle: "Every commission line generated by this introducer.",
    total: total(rows),
    totalLabel: `${rows.length} lines`,
    amountHeader: "Commission (RM)",
    rows,
  };
}
