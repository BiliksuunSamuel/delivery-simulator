"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type { FieldError, FieldValues, Path, UseFormReturn } from "react-hook-form";

interface Props<T extends FieldValues> {
  form: UseFormReturn<T>;
  name: Path<T>;
  label: string;
  required?: boolean;
  description?: string;
  className?: string;
  children: (field: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby": string | undefined;
  }) => ReactNode;
}

export function FormField<T extends FieldValues>({
  form,
  name,
  label,
  required,
  description,
  className,
  children,
}: Props<T>) {
  const id = `f-${String(name)}`;
  const errorId = `${id}-err`;
  const error = form.formState.errors[name] as FieldError | undefined;
  const hasError = Boolean(error);
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required && (
          <span aria-hidden className="ml-1 text-[var(--color-brand-coral)]">
            *
          </span>
        )}
      </Label>
      {children({
        id,
        "aria-invalid": hasError,
        "aria-describedby": hasError ? errorId : undefined,
      })}
      {hasError && (
        <p id={errorId} className="text-xs text-[var(--color-brand-coral)]">
          {error?.message ?? "Invalid value"}
        </p>
      )}
      {!hasError && description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-md border border-[var(--color-brand-coral)]/40 bg-[var(--color-brand-coral)]/10 px-3 py-2 text-sm text-[var(--color-brand-coral)]"
    >
      {message}
    </div>
  );
}
