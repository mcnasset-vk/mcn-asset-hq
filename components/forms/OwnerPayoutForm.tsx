"use client";

import { useActionState } from "react";

import { saveMicanaPayout, type FormState } from "@/app/(dashboard)/actions";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { formatRM } from "@/lib/format";
import type { MicanaBungalow, MicanaOwnerPayout } from "@/lib/types";

import { RecordFormSheet } from "./RecordFormSheet";

export function OwnerPayoutForm({
  open,
  onClose,
  payout,
  bungalows,
}: {
  open: boolean;
  onClose: () => void;
  payout?: MicanaOwnerPayout | null;
  bungalows: MicanaBungalow[];
}) {
  const [state, action] = useActionState<FormState, FormData>(
    saveMicanaPayout,
    {},
  );

  return (
    <RecordFormSheet
      open={open}
      onClose={onClose}
      title={payout ? "Edit month" : "Add month"}
      subtitle="One month of trading for one bungalow. Enter what came in and what it cost; the split is worked out from there."
      action={action}
      state={state}
    >
      {payout ? <input type="hidden" name="id" value={payout.id} /> : null}

      <SelectField
        label="Bungalow"
        name="bungalow_id"
        defaultValue={payout?.bungalowId ?? bungalows[0]?.id}
        options={bungalows.map((b) => ({
          value: b.id,
          label: `${b.bungalowName} — owner takes ${b.ownerSharePct}%`,
        }))}
      />

      <TextField
        label="Month"
        name="period_month"
        type="date"
        defaultValue={payout?.periodMonth}
        hint="Any day in the month; it is stored as the first. One line per bungalow per month."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Gross revenue (RM)"
          name="gross_revenue"
          type="number"
          defaultValue={String(payout?.grossRevenue ?? 0)}
          hint="Rent collected plus aircon billed on."
        />
        <TextField
          label="Operating cost (RM)"
          name="opex"
          type="number"
          defaultValue={String(payout?.opex ?? 0)}
          hint="Utilities, cleaning, upkeep, management."
        />
      </div>

      {payout ? (
        <div className="rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-[0.6875rem] leading-relaxed text-ink-muted">
          <p className="tnum">
            Net profit{" "}
            <span className="font-semibold text-ink">
              {formatRM(payout.netProfit)}
            </span>{" "}
            · owner takes {payout.ownerSharePct}% ={" "}
            <span className="font-semibold text-ink">
              {formatRM(payout.ownerAmount)}
            </span>{" "}
            · Micana keeps{" "}
            <span className="font-semibold text-ink">
              {formatRM(payout.netProfit - payout.ownerAmount)}
            </span>
          </p>
          <p className="mt-1">
            The share was fixed at {payout.ownerSharePct}% when this month was
            created, so renegotiating the bungalow will not re-split it.
          </p>
        </div>
      ) : null}

      <p className="rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-[0.6875rem] leading-relaxed text-ink-muted">
        Net profit and the owner&rsquo;s share are computed in the database from
        the two figures above and the bungalow&rsquo;s agreed percentage — they
        cannot be typed in. The due date is set automatically to the 15th of the
        following month. A loss month pays the owner nothing and the loss stays
        with Micana.
      </p>

      <TextAreaField label="Notes" name="notes" defaultValue={payout?.notes} />
    </RecordFormSheet>
  );
}
