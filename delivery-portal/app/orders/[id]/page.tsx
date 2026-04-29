"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Check, ChevronLeft, Package, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/domain/ConfirmDialog";
import { CountdownBar } from "@/components/domain/CountdownBar";
import { OrderTimeline } from "@/components/domain/OrderTimeline";
import { EventFeed } from "@/components/domain/EventFeed";
import { OrderStateBadge, NotificationStatusBadge } from "@/components/domain/StateBadge";
import { MapView, type MapMarker } from "@/components/domain/MapView";
import {
  POLL,
  useDispatchAttempt,
  useDispatchOrder,
  useEvents,
  useNotifications,
  useOrder,
  useOrderPerformance,
  useRespondNotification,
  useRetailers,
  useRiders,
  useTransitionOrderState,
} from "@/lib/hooks/useApi";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  return name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function safeRel(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "—";
  }
}

export default function OrderDetailPage(props: PageProps<"/orders/[id]">) {
  const { id } = use(props.params);
  const order = useOrder(id, POLL.fast);
  const retailers = useRetailers();
  const riders = useRiders();
  const attempt = useDispatchAttempt(id, POLL.fast);
  const notifications = useNotifications({ orderId: id }, POLL.fast);
  const performance = useOrderPerformance(id, POLL.fast);
  const events = useEvents(POLL.fast);
  const dispatchOrder = useDispatchOrder();
  const transition = useTransitionOrderState();
  const respond = useRespondNotification();
  const [cancelOpen, setCancelOpen] = useState(false);
  // Pickup → drop route. Defaults to a straight line so the polyline is
  // there immediately; once OSRM responds we swap in the road-following
  // geometry. Falls back to the straight line on any fetch failure.
  const [trackPath, setTrackPath] = useState<Array<[number, number]> | null>(null);

  const pickupLat = order.data?.pickupLatitude;
  const pickupLng = order.data?.pickupLongitude;
  const dropLat = order.data?.dropLatitude;
  const dropLng = order.data?.dropLongitude;

  useEffect(() => {
    if (
      pickupLat == null ||
      pickupLng == null ||
      dropLat == null ||
      dropLng == null
    ) {
      return;
    }
    // Seed with the straight line so the polyline appears instantly.
    setTrackPath([
      [pickupLat, pickupLng],
      [dropLat, dropLng],
    ]);
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${pickupLng},${pickupLat};${dropLng},${dropLat}?overview=full&geometries=geojson`,
          { signal: ctrl.signal },
        );
        if (!res.ok) return;
        const data: {
          routes?: Array<{ geometry: { coordinates: [number, number][] } }>;
        } = await res.json();
        const coords = data.routes?.[0]?.geometry.coordinates;
        if (!coords?.length || ctrl.signal.aborted) return;
        // OSRM returns [lng, lat]; Leaflet expects [lat, lng].
        setTrackPath(coords.map(([lng, lat]) => [lat, lng]));
      } catch {
        // Network/CORS/parse failures leave the straight line in place.
      }
    })();
    return () => ctrl.abort();
  }, [pickupLat, pickupLng, dropLat, dropLng]);

  if (order.isLoading || !order.data) {
    return <div className="text-sm text-muted-foreground">Loading order…</div>;
  }
  const o = order.data;
  const retailer = (retailers.data ?? []).find((r) => r.id === o.retailerId);
  const assignedRider = (riders.data ?? []).find(
    (r) => r.id === o.assignedRiderId,
  );

  // Build the rider response panel: every candidate from the dispatch
  // attempt with its current notification status.
  const candidates = attempt.data?.candidates ?? [];
  const notifByRider = new Map(
    (notifications.data ?? []).map((n) => [n.riderId, n]),
  );
  const isPendingPhase = o.state === "PendingRiderAccept";

  const triggerDispatch = async () => {
    await dispatchOrder.mutateAsync(o.id);
    toast.success("Dispatch triggered.");
  };

  const confirmCancel = async () => {
    await transition.mutateAsync({ id: o.id, newState: "Cancelled" });
    toast.success("Order cancelled.");
  };

  const respondToOffer = async (
    notificationId: string,
    action: "accept" | "decline",
  ) => {
    await respond.mutateAsync({ id: notificationId, action });
    toast.success(action === "accept" ? "Offer accepted" : "Offer declined");
  };

  const markers: MapMarker[] = [];
  if (retailer) {
    markers.push({
      id: "pickup",
      latitude: o.pickupLatitude,
      longitude: o.pickupLongitude,
      kind: "retailer",
      label: `Pickup: ${retailer.name}`,
    });
  }
  markers.push({
    id: "drop",
    latitude: o.dropLatitude,
    longitude: o.dropLongitude,
    kind: "drop",
    label: o.dropAddress ?? "Drop",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/orders"
          className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Orders
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Package className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono text-sm">{o.id.slice(0, 8)}</span>
        <OrderStateBadge state={o.state} />
        <span className="text-xs text-muted-foreground">
          Created <span className="font-mono">{safeRel(o.createdAt)}</span>
        </span>
        {retailer && <span className="text-sm">· {retailer.name}</span>}

        <div className="ml-auto flex items-center gap-2">
          {(o.state === "Created" || o.state === "FailedToDispatch") && (
            <Button
              variant="accent"
              onClick={triggerDispatch}
              disabled={dispatchOrder.isPending}
            >
              <Zap className="h-3.5 w-3.5 mr-1.5" />
              {o.state === "FailedToDispatch" ? "Retry dispatch" : "Trigger dispatch"}
            </Button>
          )}
          {o.state !== "Delivered" && o.state !== "Cancelled" && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setCancelOpen(true)}
            >
              Cancel order
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="py-5">
          <OrderTimeline state={o.state} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Pickup &amp; drop</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {retailer && (
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Pickup</div>
                <div className="font-medium">{retailer.name}</div>
                <div className="text-xs text-muted-foreground">{retailer.address}</div>
              </div>
            )}
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Drop</div>
              <div className="text-sm">
                {o.dropAddress ?? (
                  <span className="font-mono">
                    {o.dropLatitude.toFixed(4)}, {o.dropLongitude.toFixed(4)}
                  </span>
                )}
              </div>
            </div>
            {assignedRider && (
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Assigned rider</div>
                <Link
                  href={`/riders/${assignedRider.id}`}
                  className="text-sm font-medium underline-offset-2 hover:underline"
                >
                  {assignedRider.fullName}
                </Link>
                <div className="text-xs text-muted-foreground font-mono">
                  {assignedRider.phone}
                </div>
              </div>
            )}
            <MapView
              markers={markers}
              trackPath={trackPath ?? undefined}
              height="220px"
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center justify-between">
              <span>
                Notified riders{" "}
                <span className="font-mono tabular-nums text-xs text-muted-foreground">
                  ({candidates.length})
                </span>
              </span>
              {isPendingPhase && (
                <span className="text-[11px] text-[var(--color-brand-orange)]">
                  Awaiting acceptance
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {candidates.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                {o.state === "Created"
                  ? "No dispatch attempt yet. Trigger dispatch to notify riders."
                  : "No riders were notified for this order."}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Rider</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Earn</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Responded</TableHead>
                    <TableHead className="w-44 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map((c) => {
                    const rider = (riders.data ?? []).find(
                      (r) => r.id === c.riderId,
                    );
                    const notif = notifByRider.get(c.riderId);
                    const isWinner =
                      attempt.data?.winningRiderId === c.riderId;
                    const isActive =
                      isPendingPhase && notif?.status === "Pending";
                    return (
                      <TableRow
                        key={c.riderId}
                        className={cn(
                          "transition-all",
                          isWinner && "bg-[var(--color-brand-teal)]/10",
                          isActive && "bg-[var(--color-brand-orange)]/5",
                        )}
                      >
                        <TableCell className="font-mono tabular-nums text-xs">
                          {c.rank}
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-[var(--color-brand-navy)] text-[var(--color-brand-navy-fg)] text-[11px]">
                                {rider ? initials(rider.fullName) : "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {rider?.fullName ?? c.riderId.slice(0, 8)}
                              </div>
                              {rider && (
                                <div className="text-[11px] text-muted-foreground">
                                  {rider.acceptanceRate}% accept · load{" "}
                                  {rider.currentLoad}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono tabular-nums">
                          {(c.distanceMeters / 1000).toFixed(2)} km
                        </TableCell>
                        <TableCell>
                          {notif?.estimatedPayoutGhs != null ? (
                            <span className="font-mono tabular-nums font-medium text-[var(--color-brand-teal)]">
                              GHS {notif.estimatedPayoutGhs.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {notif ? (
                            <div className="space-y-1.5">
                              <NotificationStatusBadge status={notif.status} />
                              {isActive && (
                                <CountdownBar
                                  issuedAt={notif.issuedAt}
                                  timesOutAt={notif.timesOutAt}
                                  className="w-28"
                                />
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              not yet sent
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {safeRel(notif?.respondedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          {isActive && notif ? (
                            <div className="inline-flex gap-1.5">
                              <Button
                                size="sm"
                                className="bg-[var(--color-brand-teal)] text-[var(--color-brand-teal-fg)] hover:bg-[var(--color-brand-teal)]/90"
                                onClick={() =>
                                  respondToOffer(notif.id, "accept")
                                }
                                disabled={respond.isPending}
                              >
                                <Check className="h-3 w-3 mr-1" /> Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  respondToOffer(notif.id, "decline")
                                }
                                disabled={respond.isPending}
                              >
                                <X className="h-3 w-3 mr-1" /> Decline
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">
                              {isWinner ? "Won" : "—"}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {(performance.data?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">
              Rider performance log
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(performance.data ?? []).map((p) => {
                  const rider = (riders.data ?? []).find(
                    (r) => r.id === p.riderId,
                  );
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {rider?.fullName ?? p.riderId.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border-transparent",
                            p.status === "Accepted" &&
                              "bg-[var(--color-brand-teal)]/15 text-[var(--color-brand-teal)]",
                            (p.status === "Declined" ||
                              p.status === "TimedOut") &&
                              "bg-[var(--color-brand-coral)]/15 text-[var(--color-brand-coral)]",
                          )}
                        >
                          {p.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-md truncate">
                        {p.notes ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {safeRel(p.timestamp)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Order activity</CardTitle>
        </CardHeader>
        <CardContent className="p-3 max-h-[320px] overflow-y-auto">
          <EventFeed
            events={events.data}
            filter={(e) =>
              ((e.details ?? {}) as { orderId?: string }).orderId === o.id
            }
            emptyText="No events for this order yet."
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={`Cancel order ${o.id.slice(0, 8)}?`}
        description={
          o.assignedRiderId
            ? "This stops the order, releases the assigned rider, and writes a cancelledAt timestamp on their performance record."
            : "This stops the order. It cannot be undone — you'll need to create a new order to retry."
        }
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        destructive
        onConfirm={confirmCancel}
      />
    </div>
  );
}
