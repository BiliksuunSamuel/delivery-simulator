"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

const VAR_NAMES = [
  "--color-brand-navy",
  "--color-brand-navy-fg",
  "--color-brand-orange",
  "--color-brand-coral",
  "--color-brand-teal",
  "--color-brand-muted",
  "--color-brand-surface",
  "--color-brand-bg",
] as const;

export type ThemeColours = Record<(typeof VAR_NAMES)[number], string> & {
  resolvedTheme: "light" | "dark";
};

function readVars(): Omit<ThemeColours, "resolvedTheme"> {
  if (typeof window === "undefined") {
    return Object.fromEntries(VAR_NAMES.map((v) => [v, ""])) as Omit<
      ThemeColours,
      "resolvedTheme"
    >;
  }
  const styles = getComputedStyle(document.documentElement);
  return Object.fromEntries(
    VAR_NAMES.map((v) => [v, styles.getPropertyValue(v).trim()])
  ) as Omit<ThemeColours, "resolvedTheme">;
}

export function useThemeColours(): ThemeColours {
  const { resolvedTheme } = useTheme();
  const [vars, setVars] = useState(() => readVars());

  useEffect(() => {
    // Re-read on next tick so the .dark class swap has landed.
    const id = window.setTimeout(() => setVars(readVars()), 0);
    return () => window.clearTimeout(id);
  }, [resolvedTheme]);

  return {
    ...vars,
    resolvedTheme: (resolvedTheme === "dark" ? "dark" : "light") as "light" | "dark",
  };
}
