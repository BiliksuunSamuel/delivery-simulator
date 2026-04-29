import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import type { OrderState } from "@/lib/types";

const STEPS: { state: OrderState; label: string }[] = [
  { state: "Created", label: "Created" },
  { state: "PendingRiderAccept", label: "Pending rider" },
  { state: "RiderAccepted", label: "Accepted" },
  { state: "ArriveAtPickup", label: "At pickup" },
  { state: "ArriveAtDelivery", label: "At drop" },
  { state: "Delivered", label: "Delivered" },
];

export function OrderTimeline({ state }: { state: OrderState }) {
  if (state === "Cancelled" || state === "FailedToDispatch") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="rounded-full bg-[var(--color-brand-coral)]/15 text-[var(--color-brand-coral)] p-1">
          <X className="h-3.5 w-3.5" />
        </span>
        <span>
          {state === "Cancelled" ? "Order cancelled" : "Failed to dispatch"}
        </span>
      </div>
    );
  }
  const idx = STEPS.findIndex((s) => s.state === state);
  // Delivered is terminal — render it as fully completed (check + teal),
  // not as the in-progress "current" step with the orange ring.
  const isTerminal = state === "Delivered";
  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {STEPS.map((step, i) => {
        const reached = i <= idx;
        const current = i === idx && !isTerminal;
        return (
          <div key={step.state} className="flex items-center gap-1 shrink-0">
            <div
              className={cn(
                "rounded-full h-7 w-7 flex items-center justify-center text-[11px] font-medium font-mono tabular-nums transition-colors",
                reached &&
                  !current &&
                  "bg-[var(--color-brand-teal)] text-[var(--color-brand-teal-fg)]",
                current &&
                  "bg-[var(--color-brand-orange)] text-[var(--color-brand-orange-fg)] ring-2 ring-[var(--color-brand-orange)]/30 ring-offset-2 ring-offset-card",
                !reached && "bg-muted text-muted-foreground",
              )}
            >
              {reached && !current ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span
              className={cn(
                "text-xs whitespace-nowrap",
                current ? "font-medium" : "text-muted-foreground",
                !reached && "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-6 md:w-10 mx-1 rounded-full transition-colors",
                  i < idx ? "bg-[var(--color-brand-teal)]" : "bg-muted",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
