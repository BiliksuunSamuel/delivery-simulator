"use client";

import type { ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface SelectOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

interface Props {
  value: string;
  onValueChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  /**
   * Marks the trigger as invalid for ARIA + the styling rule on the trigger.
   * Wired so FormField can pass through the `aria-invalid` attribute it computes.
   */
  ["aria-invalid"]?: boolean;
}

/**
 * Higher-level Select that takes a flat options array and renders both the
 * popup items and a label-aware trigger. Uses base-ui's `items` prop so
 * `<SelectValue>` renders the option's label instead of the raw value
 * (which is otherwise the default for arbitrary string/number values).
 */
export function SelectField({
  value,
  onValueChange,
  options,
  placeholder,
  id,
  disabled,
  className,
  "aria-invalid": ariaInvalid,
}: Props) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onValueChange((v as string | null) ?? "")}
      disabled={disabled}
      items={options}
    >
      <SelectTrigger
        id={id}
        aria-invalid={ariaInvalid || undefined}
        className={className}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
