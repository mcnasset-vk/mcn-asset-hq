"use client";

import { useActionState } from "react";

import { saveLifestyleEvent, type FormState } from "@/app/(dashboard)/actions";
import { useDashboard } from "@/components/providers/DashboardProvider";
import {
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/ui/Field";
import { EVENT_SUPPORT_STATUSES } from "@/lib/constants";
import type { LifestyleEvent } from "@/lib/types";

import { RecordFormSheet } from "./RecordFormSheet";

/** Module 2 — event coordination and on-site support. */
export function LifestyleEventForm({
  open,
  onClose,
  event,
}: {
  open: boolean;
  onClose: () => void;
  event?: LifestyleEvent | null;
}) {
  const { data } = useDashboard();
  const [state, action] = useActionState<FormState, FormData>(
    saveLifestyleEvent,
    {},
  );

  return (
    <RecordFormSheet
      open={open}
      onClose={onClose}
      title={event ? "Edit event" : "Log an event"}
      subtitle="Planning, coordination and on-ground execution of MEC Lifestyle community events."
      action={action}
      state={state}
    >
      {event ? <input type="hidden" name="id" value={event.id} /> : null}

      <TextField
        label="Event name"
        name="name"
        required
        defaultValue={event?.name}
      />

      <TextField
        label="Activity type"
        name="activity_type"
        defaultValue={event?.activityType}
        placeholder="Community wellness morning"
      />

      <SelectField
        label="Lead CEC for event"
        name="lead_cec_id"
        defaultValue={event?.leadCecId ?? ""}
        options={[
          { value: "", label: "— not assigned —" },
          ...data.cecs.map((c) => ({ value: c.id, label: c.name })),
        ]}
        hint={
          data.cecs.length === 0
            ? "No champions onboarded yet — add one in the CEC module first."
            : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Event date"
          name="event_date"
          type="date"
          defaultValue={event?.eventDate}
        />
        <TextField
          label="Location"
          name="location"
          defaultValue={event?.location}
        />
      </div>

      <SelectField
        label="On-site support status"
        name="support_status"
        defaultValue={event?.supportStatus ?? "planning"}
        options={EVENT_SUPPORT_STATUSES.map((s) => ({
          value: s.key,
          label: s.label,
        }))}
      />

      <TextAreaField label="Notes" name="notes" defaultValue={event?.notes} />
    </RecordFormSheet>
  );
}
