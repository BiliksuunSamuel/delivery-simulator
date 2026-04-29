"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Battery, BatteryLow, Bike, Plus, Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/forms/SelectField";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/domain/EmptyState";
import { ConfirmDialog } from "@/components/domain/ConfirmDialog";
import { EntityActionsMenu } from "@/components/domain/EntityActionsMenu";
import { Pagination } from "@/components/domain/Pagination";
import { TableSkeleton } from "@/components/domain/Skeletons";
import {
  EligibilityPill,
  RiderStateBadge,
} from "@/components/domain/StateBadge";
import { RiderFormDialog } from "@/components/forms/RiderFormDialog";
import {
  useCreateRider,
  useDeleteRider,
  useRiderLocations,
  useRiders,
  useTiers,
  useUpdateRiderLocation,
} from "@/lib/hooks/useApi";
import { RIDER_STATES, type Rider } from "@/lib/types";
import { toast } from "sonner";

const ACCRA = { latitude: 5.6037, longitude: -0.187 };
const PAGE_SIZE = 10;

export default function RidersListPage() {
  const [stateFilter, setStateFilter] = useState<"all" | (typeof RIDER_STATES)[number]>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [eligibilityFilter, setEligibilityFilter] = useState<"all" | "eligible" | "ineligible">("all");
  const [search, setSearch] = useState("");
  const [editTarget, setEditTarget] = useState<Rider | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Rider | null>(null);
  const [page, setPage] = useState(1);

  const tiers = useTiers();
  const riders = useRiders({
    state: stateFilter === "all" ? undefined : stateFilter,
    tierId: tierFilter === "all" ? undefined : tierFilter,
    isEligible:
      eligibilityFilter === "all" ? undefined : eligibilityFilter === "eligible",
  });
  const createRider = useCreateRider();
  const deleteRider = useDeleteRider();
  const updateLocation = useUpdateRiderLocation();
  const riderLocations = useRiderLocations();
  const locByRider = useMemo(
    () => new Map((riderLocations.data ?? []).map((l) => [l.riderId, l])),
    [riderLocations.data],
  );

  const filtered = useMemo(() => {
    const all = riders.data ?? [];
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter(
      (r) => r.fullName.toLowerCase().includes(q) || r.phone.includes(q)
    );
  }, [riders.data, search]);

  useEffect(() => {
    setPage(1);
  }, [search, stateFilter, tierFilter, eligibilityFilter]);

  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  const seedRandom = async () => {
    const tierList = tiers.data ?? [];
    if (!tierList.length) {
      toast.error("Add a tier first");
      return;
    }
    const FIRST = [
      "Yaw", "Akua", "Kojo", "Adwoa", "Kofi", "Ama", "Kwame", "Akosua",
      "Kweku", "Abena", "Yaa", "Nana", "Esi", "Ato", "Efua", "Kwesi",
    ];
    const LAST = [
      "Mensah", "Owusu", "Asante", "Boateng", "Quaye", "Adjei", "Acheampong",
      "Dapaah", "Frimpong", "Nyarko", "Ofori", "Sarpong", "Tetteh", "Nkrumah",
    ];

    // Track names + phones we've already used (existing + generated this run)
    // so we never produce a duplicate. Once the base pool is exhausted, we
    // append a numeric suffix to keep seeding infinite.
    const usedNames = new Set(
      (riders.data ?? []).map((r) => r.fullName.toLowerCase()),
    );
    const usedPhones = new Set((riders.data ?? []).map((r) => r.phone));

    const uniqueName = (): string => {
      const base = `${FIRST[Math.floor(Math.random() * FIRST.length)]} ${LAST[Math.floor(Math.random() * LAST.length)]}`;
      let candidate = base;
      let n = 2;
      while (usedNames.has(candidate.toLowerCase())) {
        candidate = `${base} ${n++}`;
      }
      usedNames.add(candidate.toLowerCase());
      return candidate;
    };

    const uniquePhone = (): string => {
      // 9M-line space per operator means collisions are rare; loop until we
      // find a free one to be defensive.
      while (true) {
        const operator = ["24", "20", "26", "27", "55"][Math.floor(Math.random() * 5)];
        const line = String(1_000_000 + Math.floor(Math.random() * 9_000_000));
        const phone = `+233${operator}${line}`;
        if (!usedPhones.has(phone)) {
          usedPhones.add(phone);
          return phone;
        }
      }
    };

    const TARGET = 5;
    const picks = Array.from({ length: TARGET }, () => ({
      fullName: uniqueName(),
      phone: uniquePhone(),
    }));

    for (let i = 0; i < picks.length; i++) {
      const { fullName, phone } = picks[i];
      const lat = ACCRA.latitude + (Math.random() - 0.5) * 0.1;
      const lng = ACCRA.longitude + (Math.random() - 0.5) * 0.1;
      const rider = await createRider.mutateAsync({
        fullName,
        phone,
        tierId: tierList[i % tierList.length].id,
        state: "OnlineIdle",
        isEligible: true,
        ineligibilityReason: null,
        acceptanceRate: 70 + Math.floor(Math.random() * 30),
        kycStatus: "Approved",
      });
      await updateLocation.mutateAsync({
        id: rider.id,
        data: {
          latitude: lat,
          longitude: lng,
          batteryPercent: 60 + Math.floor(Math.random() * 40),
          gpsAccuracyMeters: 5 + Math.floor(Math.random() * 20),
        },
      });
    }
    toast.success(`${picks.length} sample rider${picks.length === 1 ? "" : "s"} added`);
  };

  const totalRiders = (riders.data ?? []).length;

  const filters = (
    <>
      <div className="flex-1 min-w-[220px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      <div className="w-44">
        <SelectField
          value={stateFilter}
          onValueChange={(v) => setStateFilter((v || "all") as typeof stateFilter)}
          placeholder="State"
          options={[
            { value: "all", label: "All states" },
            ...RIDER_STATES.map((s) => ({ value: s, label: s })),
          ]}
        />
      </div>
      <div className="w-44">
        <SelectField
          value={tierFilter}
          onValueChange={(v) => setTierFilter(v || "all")}
          placeholder="Tier"
          options={[
            { value: "all", label: "All tiers" },
            ...(tiers.data ?? []).map((t) => ({ value: t.id, label: t.name })),
          ]}
        />
      </div>
      <div className="w-44">
        <SelectField
          value={eligibilityFilter}
          onValueChange={(v) =>
            setEligibilityFilter((v || "all") as typeof eligibilityFilter)
          }
          options={[
            { value: "all", label: "All eligibility" },
            { value: "eligible", label: "Eligible" },
            { value: "ineligible", label: "Ineligible" },
          ]}
        />
      </div>
    </>
  );

  const actions = (
    <>
      <Button
        variant="secondary"
        size="lg"
        onClick={seedRandom}
        disabled={createRider.isPending}
      >
        <UserPlus className="mr-1.5" /> Seed sample data
      </Button>
      <RiderFormDialog
        trigger={
          <Button variant="accent" size="lg">
            <Plus className="mr-1.5" /> Add rider
          </Button>
        }
      />
    </>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Riders"
        subtitle="Manage rider profiles, eligibility, and operational state."
        actions={actions}
        filters={totalRiders > 0 ? filters : undefined}
      />

      {riders.isLoading && (
        <TableSkeleton
          columns={["Rider", "State", "Eligibility", "Tier", "Battery", "Acceptance", "Load", "Last update", ""]}
        />
      )}

      {!riders.isLoading && totalRiders === 0 && (
        <EmptyState
          icon={Bike}
          title="No riders yet"
          description="Add your first rider — or seed five sample riders to get going."
          cta={
            <RiderFormDialog
              trigger={
                <Button variant="accent" size="lg">
                  <Plus className="h-4 w-4 mr-2" /> Add your first rider
                </Button>
              }
            />
          }
        />
      )}

      {!riders.isLoading && totalRiders > 0 && filtered.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No riders match these filters.
          </CardContent>
        </Card>
      )}

      {!riders.isLoading && filtered.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rider</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Eligibility</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Battery</TableHead>
                  <TableHead>Acceptance</TableHead>
                  <TableHead>Load</TableHead>
                  <TableHead>Last update</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((r) => {
                  const tier = (tiers.data ?? []).find((t) => t.id === r.tierId);
                  const loc = locByRider.get(r.id);
                  const battery = loc?.batteryPercent ?? null;
                  const lowBattery = battery !== null && battery < 20;
                  return (
                    <TableRow
                      key={r.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="py-3">
                        <Link
                          href={`/riders/${r.id}`}
                          className="block hover:underline underline-offset-2"
                        >
                          <div className="font-medium">{r.fullName}</div>
                          <div className="text-xs text-muted-foreground font-mono">{r.phone}</div>
                        </Link>
                      </TableCell>
                      <TableCell><RiderStateBadge state={r.state} /></TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <span>
                                <EligibilityPill
                                  eligible={r.isEligible}
                                  reason={r.ineligibilityReason}
                                />
                              </span>
                            }
                          />
                          {!r.isEligible && r.ineligibilityReason && (
                            <TooltipContent>{r.ineligibilityReason}</TooltipContent>
                          )}
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        {tier && (
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
                            style={{
                              background: `${tier.colorHex}33`,
                              color: tier.colorHex,
                            }}
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ background: tier.colorHex }}
                            />
                            {tier.name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {battery === null ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <div className="flex items-center gap-1 font-mono tabular-nums text-sm">
                            {lowBattery ? (
                              <BatteryLow className="h-3.5 w-3.5 text-[var(--color-brand-orange)]" />
                            ) : (
                              <Battery className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            {battery}%
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono tabular-nums">{r.acceptanceRate}%</TableCell>
                      <TableCell className="font-mono tabular-nums">{r.currentLoad}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {(() => {
                          if (!loc) return "—";
                          try {
                            return formatDistanceToNow(
                              new Date(loc.lastUpdatedAt),
                              { addSuffix: true }
                            );
                          } catch {
                            return "—";
                          }
                        })()}
                      </TableCell>
                      <TableCell className="w-12">
                        <EntityActionsMenu
                          size="sm"
                          onEdit={() => setEditTarget(r)}
                          onDelete={() => setDeleteTarget(r)}
                          editLabel="Edit rider"
                          deleteLabel="Delete rider"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              onPageChange={setPage}
            />
          </CardContent>
        </Card>
      )}

      <RiderFormDialog
        rider={editTarget ?? undefined}
        open={!!editTarget}
        onOpenChange={(v) => !v && setEditTarget(null)}
        onSaved={() => setEditTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={deleteTarget ? `Delete ${deleteTarget.fullName}?` : ""}
        description="This permanently removes the rider and all their notification history."
        confirmLabel="Delete rider"
        destructive
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteRider.mutateAsync(deleteTarget.id);
          toast.success(`${deleteTarget.fullName} deleted`);
        }}
      />
    </div>
  );
}
