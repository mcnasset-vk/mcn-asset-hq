"use client";

import { useActionState } from "react";

import { saveAirconReading, type FormState } from "@/app/(dashboard)/actions";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import type {
  MicanaAirconReading,
  MicanaBungalow,
  MicanaTenant,
} from "@/lib/types";

import { RecordFormSheet } from "./RecordFormSheet";

export function AirconReadingForm({
  open,
  onClose,
  reading,
  bungalows,
  tenants,
}: {
  open: boolean;
  onClose: () => void;
  reading?: MicanaAirconReading | null;
  bungalows: MicanaBungalow[];
  tenants: MicanaTenant[];
}) {
  const [state, action] = useActionState<FormState, FormData>(
    saveAirconReading,
    {},
  );

  return (
    <RecordFormSheet
      open={open}
      onClose={onClose}
      title={reading ? "Edit meter reading" : "Add meter reading"}
      subtitle="One reading per room per month. Devices post the same figures automatically."
      action={action}
      state={state}
    >
      {reading ? <input type="hidden" name="id" value={reading.id} /> : null}

      <SelectField
        label="Bungalow"
        name="bungalow_id"
        defaultValue={reading?.bungalowId ?? bungalows[0]?.id}
        options={bungalows.map((b) => ({ value: b.id, label: b.bungalowName }))}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Room"
          name="room_label"
          required
          defaultValue={reading?.roomLabel}
          placeholder="Room 1"
        />
        <TextField
          label="Month"
          name="period_month"
          type="date"
          defaultValue={reading?.periodMonth}
          hint="Any day in the month; it is stored as the first."
        />
      </div>

      <SelectField
        label="Tenant billed"
        name="tenant_id"
        defaultValue={reading?.tenantId ?? ""}
        options={[
          { value: "", label: "Room was empty" },
          ...tenants.map((t) => ({
            value: t.id,
            label: `${t.tenantName} — ${t.bungalowName} ${t.roomLabel}`,
          })),
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Hours run"
          name="hours_run"
          type="number"
          defaultValue={String(reading?.hoursRun ?? 0)}
        />
        <TextField
          label="kWh used"
          name="kwh_used"
          type="number"
          defaultValue={String(reading?.kwhUsed ?? 0)}
        />
      </div>

      {reading ? (
        <p className="rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-[0.6875rem] leading-relaxed text-ink-muted">
          This reading was billed at{" "}
          <span className="tnum font-medium text-ink">
            RM {reading.ratePerKwh}
          </span>{" "}
          per kWh above{" "}
          <span className="tnum font-medium text-ink">
            {reading.allowanceKwh} kWh
          </span>
          , the rate and allowance in force when it was taken. Correcting the
          kWh re-bills at those figures, not at today&rsquo;s.
        </p>
      ) : null}

      <p className="rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-[0.6875rem] leading-relaxed text-ink-muted">
        The billable amount is computed in the database from the kWh above the
        allowance. It cannot be entered here, and changing the bungalow&rsquo;s
        rate later never rewrites a bill already taken.
      </p>

      <TextAreaField label="Notes" name="notes" defaultValue={reading?.notes} />
    </RecordFormSheet>
  );
}
