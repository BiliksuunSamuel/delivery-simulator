import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowRight, ArrowUp, type LucideIcon } from "lucide-react";

export interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  delta?: { value: number; suffix?: string } | null;
}

export function StatCard({ label, value, hint, icon: Icon, delta }: StatCardProps) {
  const direction = delta
    ? delta.value > 0
      ? "up"
      : delta.value < 0
        ? "down"
        : "flat"
    : null;
  const DeltaIcon =
    direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : ArrowRight;
  const deltaClass =
    direction === "up"
      ? "text-[var(--color-brand-teal)]"
      : direction === "down"
        ? "text-[var(--color-brand-coral)]"
        : "text-muted-foreground";

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm text-muted-foreground">{label}</div>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </div>
        <div className="mt-3 text-3xl font-semibold font-mono tabular-nums tracking-tight">
          {value}
        </div>
        {delta && (
          <div className={cn("mt-1 inline-flex items-center gap-1 text-xs", deltaClass)}>
            <DeltaIcon className="h-3 w-3" />
            <span className="tabular-nums">
              {Math.abs(delta.value)}
              {delta.suffix ?? ""}
            </span>
            <span className="text-muted-foreground">since yesterday</span>
          </div>
        )}
        {!delta && hint && (
          <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
        )}
      </CardContent>
    </Card>
  );
}
