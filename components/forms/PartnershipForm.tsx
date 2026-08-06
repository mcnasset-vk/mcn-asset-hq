"use client";

import { useActionState } from "react";

import {
  savePartnershipInitiative,
  type FormState,
} from "@/app/(dashboard)/actions";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import {
  PARTNERSHIP_FOCUS_AREAS,
  PARTNERSHIP_STATUSES,
} from "@/lib/constants";
import type { PartnershipInitiative } from "@/lib/types";

import { RecordFormSheet } from "./RecordFormSheet";

/** Module 2 — strategic partnership and ESG alignment. Carries no money. */
export function PartnershipForm({
  open,
  onClose,
  initiative,
}: {
  open: boolean;
  onClose: () => void;
  initiative?: PartnershipInitiative | null;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    savePartnershipInitiative,
    {},
  );

  return (
    <RecordFormSheet
      open={open}
      onClose={onClose}
      title={initiative ? "Edit initiative" : "Log a partnership initiative"}
      subtitle="Senior-led community initiatives, corporate co-branding and partnership network expansion. No revenue is recorded here."
      action={action}
      state={state}
    >
      {initiative ? (
        <input type="hidden" name="id" value={initiative.id} />
      ) : null}

      <TextField
        label="Partnership / initiative title"
        name="title"
        required
        defaultValue={initiative?.title}
      />

      <TextField
        label="Collaborating corporation / NGO"
        name="collaborator"
        defaultValue={initiative?.collaborator}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Strategic focus area"
          name="focus_area"
          defaultValue={initiative?.focusArea ?? "corporate_esg"}
          options={PARTNERSHIP_FOCUS_AREAS.map((f) => ({
            value: f.key,
            label: f.label,
          }))}
        />
        <SelectField
          label="Status"
          name="status"
          defaultValue={initiative?.status ?? "in_progress"}
          options={PARTNERSHIP_STATUSES.map((s) => ({
            value: s.key,
            label: s.label,
          }))}
        />
      </div>

      <TextAreaField
        label="Status update / milestone notes"
        name="milestone_notes"
        defaultValue={initiative?.milestoneNotes}
        hint="Qualitative audit trail — every save is timestamped and attributed."
      />
    </RecordFormSheet>
  );
}
