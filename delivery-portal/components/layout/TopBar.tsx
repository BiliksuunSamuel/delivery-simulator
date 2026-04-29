"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { api, apiMode } from "@/lib/api";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/domain/ConfirmDialog";
import { ThemeToggle } from "./ThemeToggle";

const SECTIONS: Record<string, string> = {
  "": "Dashboard",
  dispatch: "Dispatch",
  riders: "Riders",
  retailers: "Retailers",
  orders: "Orders",
  notifications: "Notifications",
  tiers: "Tiers",
  campaigns: "Campaigns",
  config: "Configuration",
};

interface Crumb {
  label: string;
  href?: string;
}

function buildCrumbs(pathname: string): Crumb[] {
  const segs = pathname.split("/").filter(Boolean);
  if (segs.length === 0) return [{ label: SECTIONS[""] }];
  const crumbs: Crumb[] = [];
  const root = segs[0];
  if (SECTIONS[root]) {
    crumbs.push({ label: SECTIONS[root], href: `/${root}` });
  } else {
    crumbs.push({ label: root, href: `/${root}` });
  }
  if (segs.length > 1) {
    // /<root>/<id>/...; for known nested routes, use the last meaningful path part
    if (root === "notifications" && segs[2] === "inbox") {
      crumbs[0].href = "/notifications";
      crumbs.push({ label: "Inbox" });
    } else {
      // ID-style detail page — show truncated id (will be replaced by real label in future)
      const id = segs[1];
      crumbs.push({ label: id.length > 12 ? id.slice(0, 8) : id });
    }
  }
  return crumbs;
}

export function TopBar() {
  const pathname = usePathname();
  const qc = useQueryClient();
  const [resetOpen, setResetOpen] = useState(false);

  const handleReset = async () => {
    await api.resetState();
    await qc.invalidateQueries();
    toast.success("Simulator state reset");
  };

  const crumbs = buildCrumbs(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card/80 px-6 backdrop-blur">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <span key={i} className="flex items-center gap-1.5">
              {c.href && !isLast ? (
                <Link
                  href={c.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {c.label}
                </Link>
              ) : (
                <span className={isLast ? "font-medium" : "text-muted-foreground"}>
                  {c.label}
                </span>
              )}
              {!isLast && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            </span>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <Badge
          variant="secondary"
          className={
            apiMode === "mock"
              ? "bg-[var(--color-brand-orange)]/15 text-[var(--color-brand-orange)] border-transparent uppercase"
              : "bg-[var(--color-brand-teal)]/15 text-[var(--color-brand-teal)] border-transparent uppercase"
          }
        >
          {apiMode}
        </Badge>
        <ThemeToggle />
        <Button variant="outline" size="sm" onClick={() => setResetOpen(true)}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Reset state
        </Button>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset simulator state?"
        description="This wipes localStorage and re-seeds with the default 3 tiers / 3 retailers / 5 riders / 2 orders / 1 campaign. All other data you've created will be lost."
        confirmLabel="Reset state"
        destructive
        onConfirm={handleReset}
      />
    </header>
  );
}
