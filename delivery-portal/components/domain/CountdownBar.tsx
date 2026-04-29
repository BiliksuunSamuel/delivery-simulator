"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function CountdownBar({
  issuedAt,
  timesOutAt,
  className,
}: {
  issuedAt: string;
  timesOutAt: string;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  const start = new Date(issuedAt).getTime();
  const end = new Date(timesOutAt).getTime();
  const total = Math.max(1, end - start);
  const remaining = Math.max(0, end - now);
  const pct = Math.min(100, Math.max(0, (remaining / total) * 100));
  const seconds = Math.ceil(remaining / 1000);
  const hot = pct < 30;
  return (
    <div className={cn("space-y-1", className)}>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className="h-full transition-[width,background-color] duration-200"
          style={{
            width: `${pct}%`,
            backgroundColor: hot
              ? "var(--color-brand-coral)"
              : "var(--color-brand-orange)",
          }}
        />
      </div>
      <div className="text-[10px] text-muted-foreground font-mono tabular-nums text-right">
        {seconds}s remaining
      </div>
    </div>
  );
}
