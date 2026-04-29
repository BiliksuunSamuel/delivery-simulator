"use client";

import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { EVENT_COLORS } from "./StateBadge";
import type { SystemEvent } from "@/lib/types";

export function EventFeed({
  events,
  max = 50,
  className,
  filter,
  emptyText = "No events yet.",
}: {
  events: SystemEvent[] | undefined;
  max?: number;
  className?: string;
  filter?: (e: SystemEvent) => boolean;
  emptyText?: string;
}) {
  const filtered = (events ?? [])
    .filter((e) => (filter ? filter(e) : true))
    .slice(0, max);

  if (filtered.length === 0) {
    return (
      <div className={cn("text-xs text-muted-foreground p-4", className)}>
        {emptyText}
      </div>
    );
  }

  return (
    <ul className={cn("space-y-1.5", className)}>
      {filtered.map((e) => {
        const ago = (() => {
          try {
            return formatDistanceToNow(new Date(e.timestamp), { addSuffix: true });
          } catch {
            return "";
          }
        })();
        return (
          <li
            key={e.id}
            className={cn(
              "border-l-2 pl-3 py-1 bg-card/40 rounded-r text-[13px]",
              EVENT_COLORS[e.type] ?? "border-l-[var(--color-brand-muted)]"
            )}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium leading-tight">{e.summary}</span>
              <span className="text-[10px] text-muted-foreground shrink-0 font-mono tabular-nums">{ago}</span>
            </div>
            <div className="text-[10px] text-muted-foreground tracking-wide uppercase">{e.type}</div>
          </li>
        );
      })}
    </ul>
  );
}
