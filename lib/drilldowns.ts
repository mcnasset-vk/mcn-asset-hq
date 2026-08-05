import {
  CAPITAL_STEPS,
  FACTORY_STAGES,
  MDNA_STATUSES,
  NASDAQ_STATUSES,
} from "./constants";
import {
  commissionRows,
  factoryRows,
  isFactoryCommitted,
  isFactoryReceived,
  isFactoryStalled,
  isMdnaCommitted,
  isMdnaReceived,
  mdnaRows,
  nasdaqRows,
} from "./metrics";
import type { DashboardData } from "./data";
import type {
  CapitalStepKey,
  DrillDownContent,
  DrillRow,
  FactoryStage,
  MdnaStatus,
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
  ];
  return {
    title: "Open Pipeline",
    subtitle:
      "Every record across all three modules that has not yet completed. Factory and MDNA amounts are capital into HQ; Nasdaq amounts are profit-after-tax, so the two are never added together.",
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
    title: `MDNA Senior Co-Living — ${meta.label}`,
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
    title: "MDNA Senior Co-Living — All Members",
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

/* -------------------------------------------------------------------------- */
/* 成交资本7步 — every step opens the records that scored it                    */
/* -------------------------------------------------------------------------- */

export function capitalStepDrill(
  data: DashboardData,
  key: CapitalStepKey,
  now: string,
): DrillDownContent {
  const step = CAPITAL_STEPS.find((s) => s.key === key)!;
  const heading = `${step.step}. ${step.zh} · ${step.label}`;

  switch (key) {
    case "trust":
      return {
        ...receivedDrill(data, now),
        title: heading,
        subtitle: `${step.zhOutcome} — ${step.outcome}. Enterprise credit is the money that has actually cleared; this is every ringgit of it.`,
      };

    case "brand": {
      const rows = [
        ...factoryRows(data.factories, now),
        ...mdnaRows(data.members),
        ...nasdaqRows(data.companies),
      ];
      return {
        title: heading,
        subtitle: `${step.zhOutcome} — ${step.outcome}. Every counterparty MCN Asset HQ has reached, at any stage. Factory and MDNA amounts are capital into HQ; Nasdaq amounts are profit-after-tax, so they are never summed.`,
        rows,
        amountHeader: "Amount (RM)",
        hideTotal: true,
      };
    }

    case "organisation": {
      const rows = [
        ...factoryRows(data.factories.filter(isFactoryCommitted), now),
        ...mdnaRows(data.members.filter(isMdnaCommitted)),
      ];
      return {
        title: heading,
        subtitle: `${step.zhOutcome} — ${step.outcome}. Deals closed by the introducer and referrer network. The names on these rows are the team that actually produces.`,
        total: total(rows),
        totalLabel: `${rows.length} closed by the network`,
        amountHeader: "Into HQ (RM)",
        rows,
      };
    }

    case "system": {
      const stalled = data.factories.filter((d) => isFactoryStalled(d, now));
      const open = [
        ...factoryRows(
          data.factories.filter((d) => !isFactoryReceived(d) && !isFactoryStalled(d, now)),
          now,
        ),
        ...mdnaRows(data.members.filter((m) => !isMdnaReceived(m))),
      ];
      // Stalled deals first — they are what drags this step's score down.
      const rows = [...factoryRows(stalled, now), ...open];
      return {
        title: heading,
        subtitle: `${step.zhOutcome} — ${step.outcome}. Everything still moving through the process, stalled records first. A replicable model is one where these clear predictably.`,
        total: total(rows),
        totalLabel: `${rows.length} in process · ${stalled.length} stalled`,
        amountHeader: "Into HQ (RM)",
        rows,
      };
    }

    case "value": {
      const rows = mdnaRows(
        data.members.filter((m) => m.status === "paid" || m.status === "invested"),
      );
      return {
        title: heading,
        subtitle: `${step.zhOutcome} — ${step.outcome}. Senior Co-Living places paid for in full. Each one is a resident housed, which is the social value the raise is meant to produce.`,
        total: total(rows),
        totalLabel: `${rows.length} places funded`,
        amountHeader: "Into HQ (RM)",
        rows,
      };
    }

    case "ecosystem":
      return {
        ...commissionDrill(data, "all", now),
        title: heading,
        subtitle: `${step.zhOutcome} — ${step.outcome}. What the introducer network has been paid. An ecosystem that is owed money is not yet an ecosystem.`,
      };

    case "legacy":
      return {
        ...nasdaqCommittedDrill(data),
        title: heading,
        subtitle: `${step.zhOutcome} — ${step.outcome}. Companies committed to the listing vehicle, measured in profit-after-tax. This never touches the RM20M figure.`,
      };
  }
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
