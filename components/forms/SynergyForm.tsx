"use client";

import { useActionState } from "react";

import { saveSynergyLog, type FormState } from "@/app/(dashboard)/actions";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { MCN_SUBSIDIARIES, PARTNERSHIP_STATUSES } from "@/lib/constants";
import type { SynergyLog } from "@/lib/types";

import { RecordFormSheet } from "./RecordFormSheet";

/** Module 3 — cross-subsidiary collaboration. Reach is a count, not money. */
export function SynergyForm({
  open,
  onClose,
  log,
}: {
  open: boolean;
  onClose: () => void;
  log?: SynergyLog | null;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    saveSynergyLog,
    {},
  );

  return (
    <RecordFormSheet
      open={open}
      onClose={onClose}
      title={log ? "Edit synergy log" : "Log group synergy"}
      subtitle="Cross-subsidiary collaboration and external relationship networks across the MCN Group pillars."
      action={action}
      state={state}
    >
      {log ? <input type="hidden" name="id" value={log.id} /> : null}

      <SelectField
        label="Target group unit / subsidiary"
        name="subsidiary"
        defaultValue={log?.subsidiary ?? MCN_SUBSIDIARIES[0]}
        options={MCN_SUBSIDIARIES.map((s) => ({ value: s, label: s }))}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Partnership reach"
          name="reach_metric"
          type="number"
          defaultValue={String(log?.reachMetric ?? 0)}
          hint="Stakeholders or corporations engaged — a count, never an amount."
        />
        <SelectField
          label="Strategic alignment status"
          name="status"
          defaultValue={log?.status ?? "in_progress"}
          options={PARTNERSHIP_STATUSES.map((s) => ({
            value: s.key,
            label: s.label,
          }))}
        />
      </div>

      <TextAreaField label="Notes" name="notes" defaultValue={log?.notes} />
    </RecordFormSheet>
  );
}
