import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

const CONTROL =
  "w-full rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none disabled:opacity-50";

function Wrapper({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-xs font-medium text-ink-muted">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="mt-1 block text-[0.6875rem] text-ink-subtle">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export function TextField({
  label,
  name,
  defaultValue,
  placeholder,
  required,
  hint,
  className,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  className?: string;
  type?: "text" | "tel" | "number" | "date";
}) {
  return (
    <Wrapper label={label} hint={hint} className={className}>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue ?? ""}
        className={CONTROL}
      />
    </Wrapper>
  );
}

export function SelectField({
  label,
  name,
  defaultValue,
  options,
  hint,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
  hint?: string;
  className?: string;
}) {
  return (
    <Wrapper label={label} hint={hint} className={className}>
      <select name={name} defaultValue={defaultValue} className={CONTROL}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Wrapper>
  );
}

export function TextAreaField({
  label,
  name,
  defaultValue,
  hint,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  hint?: string;
  className?: string;
}) {
  return (
    <Wrapper label={label} hint={hint} className={className}>
      <textarea
        name={name}
        rows={3}
        defaultValue={defaultValue ?? ""}
        className={cn(CONTROL, "resize-y")}
      />
    </Wrapper>
  );
}
