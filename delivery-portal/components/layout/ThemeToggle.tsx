"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

const ORDER = ["light", "dark", "system"] as const;
type ThemeKey = (typeof ORDER)[number];

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- canonical hydration-guard for next-themes
  useEffect(() => setMounted(true), []);

  const current = (mounted ? (theme as ThemeKey) : undefined) ?? "system";
  const next = ORDER[(ORDER.indexOf(current as ThemeKey) + 1) % ORDER.length];

  const Icon = !mounted
    ? Sun
    : current === "system"
      ? Monitor
      : (resolvedTheme ?? current) === "dark"
        ? Moon
        : Sun;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setTheme(next)}
      title={`Theme: ${current} (click for ${next})`}
      aria-label="Toggle theme"
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="capitalize text-xs">{current}</span>
    </Button>
  );
}
