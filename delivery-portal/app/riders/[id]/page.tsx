"use client";

import { use, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/forms/SelectField";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MapView,
  type MapMarker,
  type TrafficPoint,
} from "@/components/domain/MapView";
import { EventFeed } from "@/components/domain/EventFeed";
import { Pagination } from "@/components/domain/Pagination";
import { PerformanceBreakdownDialog } from "@/components/domain/PerformanceBreakdownDialog";
import { StatCard } from "@/components/domain/StatCard";
import {
  EligibilityPill,
  RiderPerformanceStatusBadge,
  RiderStateBadge,
} from "@/components/domain/StateBadge";
import {
  useDeleteRider,
  useEvents,
  useOverrideRiderEligibility,
  useRider,
  useRiderLocation,
  useRiderPerformance,
  useRiderPerformanceSummary,
  useTiers,
  useTransitionRiderState,
  useUpdateRider,
  useUpdateRiderLocation,
} from "@/lib/hooks/useApi";
import { EntityActionsMenu } from "@/components/domain/EntityActionsMenu";
import { ConfirmDialog } from "@/components/domain/ConfirmDialog";
import { RiderFormDialog } from "@/components/forms/RiderFormDialog";
import { useRouter } from "next/navigation";
import { validRiderTransitions } from "@/lib/utils/state-machines";
import type { KycStatus, RiderPerformance, RiderState } from "@/lib/types";
import { toast } from "sonner";

export default function RiderDetailPage(props: PageProps<"/riders/[id]">) {
  const { id } = use(props.params);
  const rider = useRider(id);
  const tiers = useTiers();
  const events = useEvents();
  const location = useRiderLocation(id);
  const [perfPage, setPerfPage] = useState(1);
  const PERF_PAGE_SIZE = 10;
  const performance = useRiderPerformance(id, {
    page: perfPage,
    pageSize: PERF_PAGE_SIZE,
  });
  const summary = useRiderPerformanceSummary(id);
  const performanceForMap = useRiderPerformance(id, {
    page: 1,
    pageSize: 500,
    status: "Accepted",
  });
  const updateRider = useUpdateRider();
  const updateLocation = useUpdateRiderLocation();
  const transition = useTransitionRiderState();
  const override = useOverrideRiderEligibility();
  const deleteRider = useDeleteRider();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [breakdownTarget, setBreakdownTarget] = useState<RiderPerformance | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [tierId, setTierId] = useState("");
  const [acceptanceRate, setAcceptanceRate] = useState(80);
  const [kycStatus, setKycStatus] = useState<KycStatus>("Approved");

  const [latStr, setLatStr] = useState("0");
  const [lngStr, setLngStr] = useState("0");
  const [battery, setBattery] = useState(100);
  const [accuracy, setAccuracy] = useState(10);

  const [pendingState, setPendingState] = useState<RiderState | "">("");
  const [reason, setReason] = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  useEffect(() => {
    if (!rider.data) return;
    /* eslint-disable react-hooks/set-state-in-effect -- mirror server data into editable form fields */
    setName(rider.data.fullName);
    setPhone(rider.data.phone);
    setTierId(rider.data.tierId);
    setAcceptanceRate(rider.data.acceptanceRate);
    setKycStatus(rider.data.kycStatus);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [rider.data]);

  useEffect(() => {
    if (!location.data) return;
    /* eslint-disable react-hooks/set-state-in-effect -- mirror live location into editable form */
    setLatStr(location.data.latitude.toFixed(5));
    setLngStr(location.data.longitude.toFixed(5));
    setBattery(location.data.batteryPercent);
    setAccuracy(location.data.gpsAccuracyMeters);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [location.data]);

  const markers = useMemo<MapMarker[]>(() => {
    if (!rider.data || !location.data) return [];
    return [
      {
        id: rider.data.id,
        latitude: location.data.latitude,
        longitude: location.data.longitude,
        kind: rider.data.isEligible ? "rider-eligible" : "rider-ineligible",
        label: rider.data.fullName,
      },
    ];
  }, [rider.data, location.data]);

  // Density points for the two traffic maps. Both pull from Accepted records
  // — pickup-traffic uses the retailer location captured at accept time so
  // the map shows where the rider actually picked up from, while
  // accept-traffic uses the rider's own location at accept time so the map
  // shows from where they were acting on offers.
  const pickupTraffic = useMemo<TrafficPoint[]>(() => {
    return (performanceForMap.data?.items ?? [])
      .filter((p) => p.retailerLatitude != null && p.retailerLongitude != null)
      .map((p) => ({
        latitude: p.retailerLatitude as number,
        longitude: p.retailerLongitude as number,
      }));
  }, [performanceForMap.data]);

  const acceptTraffic = useMemo<TrafficPoint[]>(() => {
    return (performanceForMap.data?.items ?? [])
      .filter((p) => p.riderLatitude != null && p.riderLongitude != null)
      .map((p) => ({
        latitude: p.riderLatitude as number,
        longitude: p.riderLongitude as number,
      }));
  }, [performanceForMap.data]);

  if (rider.isLoading || !rider.data) {
    return <div className="text-sm text-muted-foreground">Loading rider…</div>;
  }
  const r = rider.data;

  const validTransitions = validRiderTransitions(r.state);

  const saveProfile = async () => {
    await updateRider.mutateAsync({
      id: r.id,
      data: { fullName: name, phone, tierId, acceptanceRate, kycStatus },
    });
    toast.success("Rider profile updated.");
  };

  const saveLocation = async () => {
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      toast.error("Latitude/longitude must be numbers.");
      return;
    }
    await updateLocation.mutateAsync({
      id: r.id,
      data: { latitude: lat, longitude: lng, batteryPercent: battery, gpsAccuracyMeters: accuracy },
    });
    toast.success("Location updated.");
  };

  const doTransition = async () => {
    if (!pendingState) return;
    await transition.mutateAsync({ id: r.id, newState: pendingState, reason });
    toast.success(`State → ${pendingState}`);
    setPendingState("");
    setReason("");
  };

  const doOverride = async (eligible: boolean) => {
    await override.mutateAsync({
      id: r.id,
      isEligible: eligible,
      reason: overrideReason || (eligible ? "manual override" : "manual hold"),
    });
    toast.success(`Eligibility set ${eligible ? "ON" : "OFF"}`);
    setOverrideReason("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold">{r.fullName}</h2>
        <RiderStateBadge state={r.state} />
        <EligibilityPill eligible={r.isEligible} reason={r.ineligibilityReason} />
        <span className="text-xs text-muted-foreground">{r.phone}</span>
        <div className="ml-auto">
          <EntityActionsMenu
            onEdit={() => setEditOpen(true)}
            onDelete={() => setDeleteOpen(true)}
            editLabel="Edit profile"
            deleteLabel="Delete rider"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Profile</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-1.5">
              <Label>Full name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Tier</Label>
                <SelectField
                  value={tierId}
                  onValueChange={(v) => setTierId(v)}
                  options={(tiers.data ?? []).map((t) => ({
                    value: t.id,
                    label: t.name,
                  }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>KYC status</Label>
                <SelectField
                  value={kycStatus}
                  onValueChange={(v) => setKycStatus(v as KycStatus)}
                  options={[
                    { value: "Pending", label: "Pending" },
                    { value: "Approved", label: "Approved" },
                    { value: "Rejected", label: "Rejected" },
                  ]}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Acceptance rate ({acceptanceRate}%)</Label>
              <Slider
                value={[acceptanceRate]}
                onValueChange={(v) => setAcceptanceRate(Array.isArray(v) ? v[0] : v)}
                max={100}
                min={0}
                step={1}
              />
            </div>
            <Button
              variant="accent"
              onClick={saveProfile}
              disabled={updateRider.isPending}
            >
              Save profile
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Location & battery</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <MapView
              markers={markers}
              draggableMarkerId={r.id}
              center={
                location.data
                  ? [location.data.latitude, location.data.longitude]
                  : [5.6037, -0.187]
              }
              zoom={14}
              height="220px"
              onMarkerDragEnd={(_id, lat, lng) => {
                setLatStr(lat.toFixed(5));
                setLngStr(lng.toFixed(5));
                updateLocation.mutate({
                  id: r.id,
                  data: { latitude: lat, longitude: lng, batteryPercent: battery, gpsAccuracyMeters: accuracy },
                });
              }}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Latitude</Label>
                <Input value={latStr} onChange={(e) => setLatStr(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Longitude</Label>
                <Input value={lngStr} onChange={(e) => setLngStr(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Battery ({battery}%)</Label>
              <Slider value={[battery]} onValueChange={(v) => setBattery(Array.isArray(v) ? v[0] : v)} max={100} min={0} step={1} />
            </div>
            <div className="grid gap-1.5">
              <Label>GPS accuracy (m)</Label>
              <Input type="number" value={accuracy} onChange={(e) => setAccuracy(Number(e.target.value))} />
            </div>
            <Button
              variant="accent"
              onClick={saveLocation}
              disabled={updateLocation.isPending}
            >
              Save location
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">State machine</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Current: <span className="font-mono">{r.state}</span>
            </div>
            <div className="grid gap-1.5">
              <Label>Next state</Label>
              <SelectField
                value={pendingState}
                onValueChange={(v) => setPendingState(v as RiderState | "")}
                placeholder={validTransitions.length ? "Choose" : "No transitions"}
                options={validTransitions.map((s) => ({ value: s, label: s }))}
                disabled={validTransitions.length === 0}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Reason (optional)</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. break ended" />
            </div>
            <Button
              variant="accent"
              onClick={doTransition}
              disabled={!pendingState || transition.isPending}
            >
              Transition
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Eligibility override</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm">Currently <strong>{r.isEligible ? "Eligible" : "Ineligible"}</strong></div>
                {r.ineligibilityReason && (
                  <div className="text-xs text-muted-foreground">{r.ineligibilityReason}</div>
                )}
              </div>
              <Switch
                checked={r.isEligible}
                onCheckedChange={(v) => doOverride(v)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Reason</Label>
              <Textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Reason for override…"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Today"
          value={summary.data?.today.accepted ?? 0}
          hint={`${summary.data?.today.delivered ?? 0} delivered · ${summary.data?.today.declined ?? 0} declined · ${summary.data?.today.timedOut ?? 0} timed out`}
        />
        <StatCard
          label="Yesterday"
          value={summary.data?.yesterday.accepted ?? 0}
          hint={`${summary.data?.yesterday.delivered ?? 0} delivered · ${summary.data?.yesterday.cancelled ?? 0} cancelled`}
        />
        <StatCard
          label="Last 30 days"
          value={summary.data?.lastMonth.accepted ?? 0}
          hint={`${summary.data?.lastMonth.delivered ?? 0} delivered · ${summary.data?.lastMonth.cancelled ?? 0} cancelled`}
        />
        <StatCard
          label="All time"
          value={summary.data?.total.accepted ?? 0}
          hint={`${summary.data?.total.delivered ?? 0} delivered · ${summary.data?.total.declined ?? 0} declined · ${summary.data?.total.timedOut ?? 0} timed out`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Pickup traffic
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                {pickupTraffic.length} pickups
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            {pickupTraffic.length === 0 ? (
              <div className="h-[260px] rounded-md border bg-muted/40 flex items-center justify-center text-xs text-muted-foreground">
                No accepted orders yet — pickups will plot here.
              </div>
            ) : (
              <MapView
                markers={[]}
                trafficPoints={pickupTraffic}
                trafficColor="#1a2b4a"
                height="260px"
                zoom={12}
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Acceptance traffic
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                {acceptTraffic.length} accepts
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            {acceptTraffic.length === 0 ? (
              <div className="h-[260px] rounded-md border bg-muted/40 flex items-center justify-center text-xs text-muted-foreground">
                No accepted offers yet — locations will plot here.
              </div>
            ) : (
              <MapView
                markers={[]}
                trafficPoints={acceptTraffic}
                trafficColor="#f39a1f"
                height="260px"
                zoom={12}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Performance log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>When</TableHead>
                <TableHead>Payout</TableHead>
                <TableHead>Picked up</TableHead>
                <TableHead>Delivered</TableHead>
                <TableHead>Cancelled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(performance.data?.items ?? []).length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-6"
                  >
                    No performance records yet.
                  </TableCell>
                </TableRow>
              )}
              {(performance.data?.items ?? []).map((p) => (
                <TableRow
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setBreakdownTarget(p)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setBreakdownTarget(p);
                    }
                  }}
                  className="cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/50 outline-none transition-colors"
                >
                  <TableCell className="font-mono text-xs">
                    {p.orderId.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    <RiderPerformanceStatusBadge status={p.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {(() => {
                      try {
                        return formatDistanceToNow(new Date(p.timestamp), {
                          addSuffix: true,
                        });
                      } catch {
                        return "—";
                      }
                    })()}
                  </TableCell>
                  <TableCell className="text-xs">
                    {p.payoutAmountGhs != null ? (
                      <span className="font-mono tabular-nums text-[var(--color-brand-teal)]">
                        GHS {p.payoutAmountGhs.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.pickedUpAt
                      ? formatDistanceToNow(new Date(p.pickedUpAt), {
                          addSuffix: true,
                        })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.deliveredAt
                      ? formatDistanceToNow(new Date(p.deliveredAt), {
                          addSuffix: true,
                        })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.cancelledAt
                      ? formatDistanceToNow(new Date(p.cancelledAt), {
                          addSuffix: true,
                        })
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {(performance.data?.total ?? 0) > 0 && (
            <Pagination
              page={perfPage}
              pageSize={PERF_PAGE_SIZE}
              total={performance.data?.total ?? 0}
              onPageChange={setPerfPage}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Activity</CardTitle></CardHeader>
        <CardContent className="p-3 max-h-[320px] overflow-y-auto">
          <EventFeed
            events={events.data}
            filter={(e) =>
              ((e.details ?? {}) as { riderId?: string }).riderId === r.id
            }
            emptyText="No activity recorded yet."
          />
        </CardContent>
      </Card>

      <RiderFormDialog
        rider={r}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <PerformanceBreakdownDialog
        performance={breakdownTarget}
        onOpenChange={(v) => !v && setBreakdownTarget(null)}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${r.fullName}?`}
        description="This permanently removes the rider and all their notification history."
        confirmLabel="Delete rider"
        destructive
        onConfirm={async () => {
          await deleteRider.mutateAsync(r.id);
          toast.success(`${r.fullName} deleted`);
          router.push("/riders");
        }}
      />
    </div>
  );
}
