"use client";

import { useActionState } from "react";

import { saveEventMedia, type FormState } from "@/app/(dashboard)/actions";
import { useDashboard } from "@/components/providers/DashboardProvider";
import {
  CheckboxField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/ui/Field";
import type { EventMedia } from "@/lib/types";

import { RecordFormSheet } from "./RecordFormSheet";

/** Module 3 — event documentation and media handoff. */
export function EventMediaForm({
  open,
  onClose,
  media,
}: {
  open: boolean;
  onClose: () => void;
  media?: EventMedia | null;
}) {
  const { data } = useDashboard();
  const [state, action] = useActionState<FormState, FormData>(
    saveEventMedia,
    {},
  );

  return (
    <RecordFormSheet
      open={open}
      onClose={onClose}
      title={media ? "Edit media record" : "Log event media"}
      subtitle="Capture of event media and its transfer to the Ops Admin Associate."
      action={action}
      state={state}
    >
      {media ? <input type="hidden" name="id" value={media.id} /> : null}

      <SelectField
        label="Associated event"
        name="event_id"
        defaultValue={media?.eventId ?? data.events[0]?.id ?? ""}
        options={
          data.events.length === 0
            ? [{ value: "", label: "— no events logged yet —" }]
            : data.events.map((e) => ({ value: e.id, label: e.name }))
        }
      />

      <div className="grid gap-2 sm:grid-cols-2">
        <CheckboxField
          label="Photos"
          name="has_photos"
          defaultChecked={media?.hasPhotos ?? false}
        />
        <CheckboxField
          label="Videos"
          name="has_videos"
          defaultChecked={media?.hasVideos ?? false}
        />
      </div>

      <TextField
        label="Media folder / cloud link"
        name="media_url"
        defaultValue={media?.mediaUrl}
        placeholder="https://drive.google.com/..."
        hint="A link to the repository. Files are not uploaded through this form."
      />

      <CheckboxField
        label="Media transferred to Ops Admin Associate"
        name="handed_off"
        defaultChecked={media?.handedOff ?? false}
        hint="The handoff time is stamped by the database, so it cannot be back-dated."
      />

      <TextAreaField label="Notes" name="notes" defaultValue={media?.notes} />
    </RecordFormSheet>
  );
}
