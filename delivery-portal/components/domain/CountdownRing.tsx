"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function CountdownRing({
  issuedAt,
  timesOutAt,
  size = 88,
  stroke = 6,
  children,
  className,
}: {
  issuedAt: string;
  timesOutAt: string;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);
  const start = new Date(issuedAt).getTime();
  const end = new Date(timesOutAt).getTime();
  const total = Math.max(1, end - start);
  const remaining = Math.max(0, end - now);
  const pct = Math.min(1, Math.max(0, remaining / total));
  const seconds = Math.ceil(remaining / 1000);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);
  const hot = remaining < 5_000;
  const stroke_color = hot
    ? "var(--color-brand-coral)"
    : "var(--color-brand-orange)";

  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--color-brand-muted-bg)"
          strokeWidth={stroke}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={stroke_color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 200ms linear, stroke 200ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-center">
        {children ?? (
          <span className="font-mono tabular-nums text-lg font-semibold">{seconds}s</span>
        )}
      </div>
    </div>
  );
}
