"use client";

import { useActionState } from "react";

import { saveOpsSyncLog, type FormState } from "@/app/(dashboard)/actions";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { HANDOFF_TYPES } from "@/lib/constants";
import type { OpsSyncLog } from "@/lib/types";

import { RecordFormSheet } from "./RecordFormSheet";

/** Module 2 — collaboration and sync with the Operations Manager. */
export function OpsSyncForm({
  open,
  onClose,
  log,
}: {
  open: boolean;
  onClose: () => void;
  log?: OpsSyncLog | null;
}) {
  const { data, now } = useDashboard();
  const [state, action] = useActionState<FormState, FormData>(
    saveOpsSyncLog,
    {},
  );

  // Both handoff sources in one list, since either can be the reference.
  const references = [
    ...data.media.map((m) => ({
      value: m.id,
      label: `Media — ${data.events.find((e) => e.id === m.eventId)?.name ?? "unlinked event"}`,
    })),
    ...data.cecs.map((c) => ({ value: c.id, label: `CEC — ${c.name}` })),
  ];

  return (
    <RecordFormSheet
      open={open}
      onClose={onClose}
      title={log ? "Edit sync log" : "Log a weekly sync"}
      subtitle="Handover of media and CEC profiles from the Operations Manager, plus the weekly progress note."
      action={action}
      state={state}
    >
      {log ? <input type="hidden" name="id" value={log.id} /> : null}

      <SelectField
        label="Handoff type"
        name="handoff_type"
        defaultValue={log?.handoffType ?? "other"}
        options={HANDOFF_TYPES.map((h) => ({ value: h.key, label: h.label }))}
      />

      <SelectField
        label="Handoff reference"
        name="handoff_ref"
        defaultValue={log?.handoffRef ?? ""}
        options={[
          { value: "", label: "— none —" },
          ...references,
        ]}
        hint={
          references.length === 0
            ? "Nothing has been handed over yet by the Operations Manager."
            : "Links this note to the exact item received."
        }
      />

      <TextField
        label="Week of"
        name="week_of"
        type="date"
        defaultValue={log?.weekOf ?? now}
      />

      <TextAreaField
        label="Weekly status note"
        name="status_note"
        defaultValue={log?.statusNote}
        hint="Progress, blockers or schedule alignment. Timestamped on save."
      />
    </RecordFormSheet>
  );
}
