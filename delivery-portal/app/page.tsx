"use client";

import { useMemo } from "react";
import { Bike, CheckCircle2, Package, Activity, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/domain/StatCard";
import { EventFeed } from "@/components/domain/EventFeed";
import { MapView, type MapMarker } from "@/components/domain/MapView";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useEvents,
  useOrders,
  useRetailers,
  useRiderLocations,
  useRiders,
} from "@/lib/hooks/useApi";

const ACTIVE_ORDER_STATES = new Set([
  "Created",
  "PendingRiderAccept",
  "RiderAccepted",
  "ArriveAtPickup",
  "ArriveAtDelivery",
] as const);
const SUCCEEDED_OR_INFLIGHT_STATES = new Set([
  "RiderAccepted",
  "ArriveAtPickup",
  "ArriveAtDelivery",
  "Delivered",
] as const);
const PRE_PICKUP_STATES = new Set([
  "Created",
  "PendingRiderAccept",
  "RiderAccepted",
] as const);

export default function DashboardPage() {
  const riders = useRiders();
  const orders = useOrders();
  const retailers = useRetailers();
  const riderLocations = useRiderLocations();
  const events = useEvents();

  const stats = useMemo(() => {
    const all = riders.data ?? [];
    const eligible = all.filter((r) => r.isEligible).length;
    const activeOrders = (orders.data ?? []).filter((o) =>
      ACTIVE_ORDER_STATES.has(o.state as never),
    ).length;
    const dispatched = (orders.data ?? []).filter((o) => !!o.dispatchedAt).length;
    const succeeded = (orders.data ?? []).filter((o) =>
      SUCCEEDED_OR_INFLIGHT_STATES.has(o.state as never),
    ).length;
    const successRate = dispatched > 0 ? Math.round((succeeded / dispatched) * 100) : 0;
    return {
      total: all.length,
      eligible,
      activeOrders,
      dispatched,
      successRate,
    };
  }, [riders.data, orders.data]);

  const markers = useMemo<MapMarker[]>(() => {
    const out: MapMarker[] = [];
    (retailers.data ?? []).forEach((r) =>
      out.push({
        id: `retailer-${r.id}`,
        latitude: r.latitude,
        longitude: r.longitude,
        kind: "retailer",
        label: r.name,
      })
    );
    const locByRider = new Map(
      (riderLocations.data ?? []).map((l) => [l.riderId, l]),
    );
    (riders.data ?? []).forEach((r) => {
      const loc = locByRider.get(r.id);
      if (!loc) return;
      let kind: MapMarker["kind"] = "rider-eligible";
      if (!r.isEligible) kind = "rider-ineligible";
      else if (r.state !== "OnlineIdle") kind = "rider-active";
      out.push({
        id: `rider-${r.id}`,
        latitude: loc.latitude,
        longitude: loc.longitude,
        kind,
        label: `${r.fullName} · ${r.state}`,
      });
    });
    (orders.data ?? [])
      .filter((o) => PRE_PICKUP_STATES.has(o.state as never))
      .forEach((o) => {
        const retailer = (retailers.data ?? []).find((rr) => rr.id === o.retailerId);
        if (!retailer) return;
        out.push({
          id: `order-${o.id}`,
          latitude: retailer.latitude,
          longitude: retailer.longitude,
          kind: "order",
          label: `Order ${o.id.slice(0, 6)} · ${o.state}`,
        });
      });
    return out;
  }, [retailers.data, riders.data, orders.data]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        subtitle="Live overview of fleet, demand, and dispatch outcomes."
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Total riders" value={stats.total} icon={Bike} />
        <StatCard label="Eligible now" value={stats.eligible} icon={ShieldCheck} />
        <StatCard label="Active orders" value={stats.activeOrders} icon={Package} />
        <StatCard label="Dispatches" value={stats.dispatched} icon={Activity} />
        <StatCard
          label="Success rate"
          value={`${stats.successRate}%`}
          icon={CheckCircle2}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Live map</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <MapView markers={markers} height="540px" className="px-4 pb-4" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center justify-between">
              <span>System events</span>
              <span className="text-[10px] text-muted-foreground tracking-wide">poll 2s</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 max-h-[540px] overflow-y-auto">
            <EventFeed events={events.data} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
