"use client";

import { useActionState } from "react";

import { saveMicanaBungalow, type FormState } from "@/app/(dashboard)/actions";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import {
  MICANA_DEFAULT_AIRCON_ALLOWANCE_KWH,
  MICANA_DEFAULT_AIRCON_RATE,
  MICANA_DEFAULT_OWNER_SHARE_PCT,
  MICANA_STAGES,
} from "@/lib/constants";
import type { MicanaBungalow } from "@/lib/types";

import { RecordFormSheet } from "./RecordFormSheet";

export function MicanaBungalowForm({
  open,
  onClose,
  bungalow,
}: {
  open: boolean;
  onClose: () => void;
  bungalow?: MicanaBungalow | null;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    saveMicanaBungalow,
    {},
  );

  return (
    <RecordFormSheet
      open={open}
      onClose={onClose}
      title={bungalow ? "Edit bungalow" : "Add bungalow"}
      subtitle="Sourcing, renovation and the profit-share terms agreed with the owner."
      action={action}
      state={state}
    >
      {bungalow ? <input type="hidden" name="id" value={bungalow.id} /> : null}

      <TextField
        label="Bungalow name"
        name="bungalow_name"
        required
        defaultValue={bungalow?.bungalowName}
        placeholder="Bungalow · Damansara Heights"
      />

      <TextField
        label="Address"
        name="address"
        defaultValue={bungalow?.address}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Owner name"
          name="owner_name"
          required
          defaultValue={bungalow?.ownerName}
        />
        <TextField
          label="Owner telephone"
          name="owner_phone"
          type="tel"
          defaultValue={bungalow?.ownerPhone}
          placeholder="012-345 6789"
        />
      </div>

      <TextField
        label="Sourced by"
        name="sourced_by"
        defaultValue={bungalow?.sourcedBy}
      />

      <SelectField
        label="Stage"
        name="stage"
        defaultValue={bungalow?.stage ?? "identified"}
        options={MICANA_STAGES.map((s) => ({ value: s.key, label: s.label }))}
        hint="Moving the stage backwards clears the dates beyond it, so the record stays consistent."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Identified on"
          name="identified_at"
          type="date"
          defaultValue={bungalow?.identifiedAt}
        />
        <TextField
          label="Negotiation started"
          name="negotiation_started_at"
          type="date"
          defaultValue={bungalow?.negotiationStartedAt}
        />
        <TextField
          label="Terms agreed"
          name="agreed_at"
          type="date"
          defaultValue={bungalow?.agreedAt}
        />
        <TextField
          label="Operating since"
          name="operating_since"
          type="date"
          defaultValue={bungalow?.operatingSince}
        />
      </div>

      <p className="rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-[0.6875rem] leading-relaxed text-ink-muted">
        Renovation
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Renovation budget (RM)"
          name="renovation_budget"
          type="number"
          defaultValue={String(bungalow?.renovationBudget ?? 0)}
        />
        <TextField
          label="Spent so far (RM)"
          name="renovation_actual"
          type="number"
          defaultValue={String(bungalow?.renovationActual ?? 0)}
          hint="Flagged once it runs more than 5% past budget."
        />
        <TextField
          label="Renovation started"
          name="renovation_started_at"
          type="date"
          defaultValue={bungalow?.renovationStartedAt}
        />
        <TextField
          label="Target completion"
          name="target_completion_at"
          type="date"
          defaultValue={bungalow?.targetCompletionAt}
          hint="Past this date with no completion = flagged as late."
        />
        <TextField
          label="Actually completed"
          name="actual_completion_at"
          type="date"
          defaultValue={bungalow?.actualCompletionAt}
        />
        <TextField
          label="Contractor"
          name="contractor"
          defaultValue={bungalow?.contractor}
        />
      </div>

      <p className="rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-[0.6875rem] leading-relaxed text-ink-muted">
        Letting terms. The owner&rsquo;s share is applied to each month&rsquo;s
        net profit by the database — it is never typed into the payout itself.
        The aircon figures are the house defaults a tenancy inherits.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Lettable rooms"
          name="room_count"
          type="number"
          defaultValue={String(bungalow?.roomCount ?? 0)}
        />
        <TextField
          label="Owner share of net profit (%)"
          name="owner_share_pct"
          type="number"
          defaultValue={String(
            bungalow?.ownerSharePct ?? MICANA_DEFAULT_OWNER_SHARE_PCT,
          )}
        />
        <TextField
          label="Aircon included (kWh/month)"
          name="default_aircon_allowance_kwh"
          type="number"
          defaultValue={String(
            bungalow?.defaultAirconAllowanceKwh ??
              MICANA_DEFAULT_AIRCON_ALLOWANCE_KWH,
          )}
        />
        <TextField
          label="Aircon rate above allowance (RM/kWh)"
          name="default_aircon_rate_per_kwh"
          type="number"
          defaultValue={String(
            bungalow?.defaultAirconRatePerKwh ?? MICANA_DEFAULT_AIRCON_RATE,
          )}
        />
      </div>

      <TextField
        label="Exited the programme on"
        name="exited_at"
        type="date"
        defaultValue={bungalow?.exitedAt}
        hint="Set only when the bungalow is handed back. It leaves the funnel and stops counting toward occupancy."
      />

      <TextAreaField label="Notes" name="notes" defaultValue={bungalow?.notes} />
    </RecordFormSheet>
  );
}
