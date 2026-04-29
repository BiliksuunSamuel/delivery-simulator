"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bike,
  Store,
  Package,
  Bell,
  Award,
  Megaphone,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/riders", label: "Riders", icon: Bike },
  { href: "/retailers", label: "Retailers", icon: Store },
  { href: "/orders", label: "Orders", icon: Package },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/tiers", label: "Tiers", icon: Award },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/config", label: "Config", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="text-sm font-semibold tracking-tight text-sidebar-foreground">
          Rider Allocation Simulator
        </div>
        <div className="text-[11px] text-[var(--color-brand-orange)] tracking-wide mt-0.5">
          Hubtel · Internal Demo
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                active &&
                  "bg-sidebar-accent text-sidebar-foreground font-medium border-l-4 border-[var(--color-brand-orange)] pl-2"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-3 border-t border-sidebar-border text-[10px] text-sidebar-foreground/60">
        Mock-first build · v0.1
      </div>
    </aside>
  );
}
