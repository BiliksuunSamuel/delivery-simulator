"use client";

import { useMemo, useState } from "react";
import { Plus, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/domain/EmptyState";
import { ConfirmDialog } from "@/components/domain/ConfirmDialog";
import { EntityActionsMenu } from "@/components/domain/EntityActionsMenu";
import { TableSkeleton } from "@/components/domain/Skeletons";
import { MapView, type MapMarker } from "@/components/domain/MapView";
import { RetailerFormDialog } from "@/components/forms/RetailerFormDialog";
import {
  useCreateRetailer,
  useDeleteRetailer,
  useOrders,
  useRetailers,
} from "@/lib/hooks/useApi";
import type { Retailer } from "@/lib/types";
import { toast } from "sonner";

// Accra-area neighbourhoods × store-type suffixes give ~140 base names.
// When that base pool is exhausted we append " 2", " 3"… so the seeder is
// effectively infinite.
const NEIGHBOURHOODS = [
  { area: "Madina", address: "Madina Market", latitude: 5.6837, longitude: -0.1668, zone: "Accra North", station: "Madina Station" },
  { area: "Achimota", address: "Achimota Mall area", latitude: 5.6184, longitude: -0.2289, zone: "Accra North", station: "Achimota Station" },
  { area: "Spintex", address: "Spintex Road", latitude: 5.6213, longitude: -0.0875, zone: "Accra East", station: "Spintex Station" },
  { area: "Osu", address: "Oxford Street, Osu", latitude: 5.5572, longitude: -0.1812, zone: "Accra Central", station: "Osu Station" },
  { area: "East Legon", address: "Lagos Avenue, East Legon", latitude: 5.6390, longitude: -0.1538, zone: "Accra East", station: "East Legon Station" },
  { area: "Tema", address: "Community 1, Tema", latitude: 5.6695, longitude: -0.0166, zone: "Tema", station: "Tema Community Station" },
  { area: "Kasoa", address: "Kasoa Junction", latitude: 5.5320, longitude: -0.4146, zone: "Greater Accra West", station: "Kasoa Station" },
  { area: "Dansoman", address: "Dansoman Estate", latitude: 5.5398, longitude: -0.2546, zone: "Accra West", station: "Dansoman Station" },
  { area: "Lapaz", address: "Nii Boi Town, Lapaz", latitude: 5.6087, longitude: -0.2384, zone: "Accra West", station: "Lapaz Station" },
  { area: "Adenta", address: "Adenta SSNIT Flats", latitude: 5.7081, longitude: -0.1697, zone: "Accra North", station: "Adenta Station" },
  { area: "Tesano", address: "Tesano High Street", latitude: 5.6076, longitude: -0.2237, zone: "Accra North", station: "Tesano Station" },
  { area: "Labadi", address: "La Labadi Beach Road", latitude: 5.5621, longitude: -0.1584, zone: "Accra Central", station: "Labadi Station" },
  { area: "Airport", address: "Airport Residential", latitude: 5.6056, longitude: -0.1719, zone: "Accra Central", station: "Airport Station" },
  { area: "Cantonments", address: "Cantonments High Street", latitude: 5.5797, longitude: -0.1734, zone: "Accra Central", station: "Cantonments Station" },
];
const STORE_TYPES = [
  "Daily", "FoodHub", "QuickStop", "Pantry", "Provisions",
  "Mart", "Market", "Hub", "SuperMart", "Corner Store",
];

export default function RetailersPage() {
  const retailers = useRetailers();
  const orders = useOrders();
  const create = useCreateRetailer();
  const del = useDeleteRetailer();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<Retailer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Retailer | null>(null);

  const markers = useMemo<MapMarker[]>(() => {
    return (retailers.data ?? []).map((r) => ({
      id: r.id,
      latitude: r.latitude,
      longitude: r.longitude,
      kind: "retailer",
      label: r.name,
    }));
  }, [retailers.data]);

  const selected = (retailers.data ?? []).find((r) => r.id === selectedId);
  const selectedOrders = (orders.data ?? []).filter((o) => o.retailerId === selectedId);

  const seedRandom = async () => {
    const used = new Set(
      (retailers.data ?? []).map((r) => r.name.toLowerCase()),
    );
    const TARGET = 3;
    const fresh: {
      name: string;
      address: string;
      latitude: number;
      longitude: number;
      zone: string;
      station: string;
    }[] = [];
    for (let i = 0; i < TARGET; i++) {
      const n = NEIGHBOURHOODS[Math.floor(Math.random() * NEIGHBOURHOODS.length)];
      const t = STORE_TYPES[Math.floor(Math.random() * STORE_TYPES.length)];
      const base = `${n.area} ${t}`;
      let name = base;
      let suffix = 2;
      while (used.has(name.toLowerCase())) {
        name = `${base} ${suffix++}`;
      }
      used.add(name.toLowerCase());
      fresh.push({
        name,
        address: n.address,
        zone: n.zone,
        station: n.station,
        // Slight jitter so repeat seeds at the same neighbourhood don't
        // stack the markers identically on the map.
        latitude: n.latitude + (Math.random() - 0.5) * 0.005,
        longitude: n.longitude + (Math.random() - 0.5) * 0.005,
      });
    }
    await Promise.all(fresh.map((r) => create.mutateAsync(r)));
    toast.success(
      `${fresh.length} sample retailer${fresh.length === 1 ? "" : "s"} added`,
    );
  };

  const total = (retailers.data ?? []).length;

  const actions = (
    <>
      <Button
        variant="secondary"
        size="lg"
        onClick={seedRandom}
        disabled={create.isPending}
      >
        <Store className="mr-1.5" /> Seed sample data
      </Button>
      <RetailerFormDialog
        trigger={
          <Button variant="accent" size="lg">
            <Plus className="mr-1.5" /> Add retailer
          </Button>
        }
      />
    </>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Retailers"
        subtitle="Pickup locations available to new orders. Click a row or pin to focus."
        actions={actions}
      />

      {retailers.isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TableSkeleton columns={["Name", "Address", ""]} rows={3} />
          <Card>
            <CardContent className="p-3">
              <div className="h-[380px] rounded-md bg-muted/40 animate-pulse" />
            </CardContent>
          </Card>
        </div>
      )}

      {!retailers.isLoading && total === 0 && (
        <EmptyState
          icon={Store}
          title="No retailers yet"
          description="Add a pickup location, then create an order from it."
          cta={
            <RetailerFormDialog
              trigger={
                <Button variant="accent" size="lg">
                  <Plus className="h-4 w-4 mr-2" /> Add your first retailer
                </Button>
              }
            />
          }
        />
      )}

      {!retailers.isLoading && total > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(retailers.data ?? []).map((r) => (
                    <TableRow
                      key={r.id}
                      className={
                        selectedId === r.id
                          ? "bg-[var(--color-brand-orange)]/10"
                          : "hover:bg-muted/50 transition-colors cursor-pointer"
                      }
                      onClick={() => setSelectedId(r.id)}
                    >
                      <TableCell className="font-medium py-3">{r.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.address}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <EntityActionsMenu
                          size="sm"
                          onEdit={() => setEditTarget(r)}
                          onDelete={() => setDeleteTarget(r)}
                          editLabel="Edit retailer"
                          deleteLabel="Delete retailer"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base font-medium">Map</CardTitle></CardHeader>
              <CardContent className="p-3">
                <MapView
                  markers={markers}
                  height="380px"
                  onMarkerClick={(m) => setSelectedId(m.id)}
                />
              </CardContent>
            </Card>
            {selected && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium">{selected.name} — recent orders</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Drop</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrders.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                            No orders for this retailer yet.
                          </TableCell>
                        </TableRow>
                      )}
                      {selectedOrders.slice(0, 6).map((o) => (
                        <TableRow key={o.id}>
                          <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}</TableCell>
                          <TableCell>{o.state}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {o.dropAddress ?? (
                              <span className="font-mono">
                                {o.dropLatitude.toFixed(3)}, {o.dropLongitude.toFixed(3)}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      <RetailerFormDialog
        retailer={editTarget ?? undefined}
        open={!!editTarget}
        onOpenChange={(v) => !v && setEditTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={deleteTarget ? `Delete ${deleteTarget.name}?` : ""}
        description="The retailer is removed from the simulator. Existing orders that referenced it will keep their reference but lose the lookup."
        confirmLabel="Delete retailer"
        destructive
        onConfirm={async () => {
          if (!deleteTarget) return;
          await del.mutateAsync(deleteTarget.id);
          toast.success(`${deleteTarget.name} deleted`);
        }}
      />
    </div>
  );
}
