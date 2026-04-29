"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapView, type MapMarker } from "@/components/domain/MapView";
import { FormError, FormField } from "./FormField";
import { SelectField } from "./SelectField";
import {
  useCreateOrder,
  useRetailers,
  useRiderLocations,
  useRiders,
} from "@/lib/hooks/useApi";
import {
  OrderFormSchema,
  type OrderFormValues,
} from "@/lib/api/schemas/forms";
import { toast } from "sonner";

interface Props {
  trigger?: React.ReactElement;
  defaultRetailerId?: string;
  onCreated?: (orderId: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const ACCRA: [number, number] = [5.6037, -0.187];

const defaults = (defaultRetailerId?: string): OrderFormValues => ({
  retailerId: defaultRetailerId ?? "",
  dropLatitude: ACCRA[0],
  dropLongitude: ACCRA[1],
  dropAddress: "",
});

export function OrderFormDialog({
  trigger,
  defaultRetailerId,
  onCreated,
  open: controlledOpen,
  onOpenChange,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (!isControlled) setInternalOpen(v);
    onOpenChange?.(v);
  };
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [dropPlaced, setDropPlaced] = useState(false);
  const [reverseLoading, setReverseLoading] = useState(false);
  const reverseAbort = useRef<AbortController | null>(null);
  const retailers = useRetailers();
  const riders = useRiders();
  const riderLocations = useRiderLocations();
  const create = useCreateOrder();

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(OrderFormSchema),
    mode: "onBlur",
    defaultValues: defaults(defaultRetailerId),
  });

  useEffect(() => {
    if (open) {
      form.reset(defaults(defaultRetailerId));
      setSubmitError(null);
      setDropPlaced(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultRetailerId]);

  const reverseGeocode = async (lat: number, lng: number) => {
    reverseAbort.current?.abort();
    const ctrl = new AbortController();
    reverseAbort.current = ctrl;
    setReverseLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { signal: ctrl.signal, headers: { Accept: "application/json" } },
      );
      if (!res.ok) return;
      const data: { display_name?: string } = await res.json();
      if (ctrl.signal.aborted) return;
      if (data.display_name) {
        form.setValue("dropAddress", data.display_name, {
          shouldValidate: false,
          shouldDirty: true,
        });
      }
    } catch {
      // ignore — leave the field blank for the user to fill manually
    } finally {
      if (reverseAbort.current === ctrl) {
        reverseAbort.current = null;
        setReverseLoading(false);
      }
    }
  };

  const retailerId = form.watch("retailerId");
  const dropLat = form.watch("dropLatitude");
  const dropLng = form.watch("dropLongitude");
  const retailer = (retailers.data ?? []).find((r) => r.id === retailerId);

  // Snapshot rider availability the moment the dialog opens. Keeping it
  // static prevents map markers from shimmying while the user is picking
  // the drop pin (riders move every 30s via the location-jitter cron).
  const riderMarkers = useMemo<MapMarker[]>(() => {
    if (!open) return [];
    const locByRider = new Map(
      (riderLocations.data ?? []).map((l) => [l.riderId, l]),
    );
    const result: MapMarker[] = [];
    for (const r of riders.data ?? []) {
      if (r.state !== "OnlineIdle" || !r.isEligible) continue;
      const loc = locByRider.get(r.id);
      if (!loc) continue;
      result.push({
        id: `rider-${r.id}`,
        latitude: loc.latitude,
        longitude: loc.longitude,
        kind: "rider-eligible",
        label: r.fullName,
      });
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const markers: MapMarker[] = [...riderMarkers];
  if (retailer) {
    markers.push({
      id: "pickup",
      latitude: retailer.latitude,
      longitude: retailer.longitude,
      kind: "retailer",
      label: `Pickup: ${retailer.name}`,
    });
  }
  if (dropPlaced) {
    markers.push({
      id: "drop",
      latitude: dropLat,
      longitude: dropLng,
      kind: "drop",
      label: "Drop location",
    });
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    if (!dropPlaced) {
      setSubmitError("Click the map to place the drop pin.");
      return;
    }
    try {
      const order = await create.mutateAsync({
        retailerId: values.retailerId,
        dropLatitude: values.dropLatitude,
        dropLongitude: values.dropLongitude,
        dropAddress: values.dropAddress?.trim() || null,
      });
      toast.success(`Order ${order.id.slice(0, 8)} created`);
      onCreated?.(order.id);
      setOpen(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create order");
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create order</DialogTitle>
          <DialogDescription>
            Pick a retailer for pickup and place the drop pin. The order starts in <em>Created</em>; trigger dispatch from the order or dispatch page.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <FormError message={submitError} />

          <FormField form={form} name="retailerId" label="Retailer (pickup)" required>
            {(field) => (
              <SelectField
                id={field.id}
                aria-invalid={field["aria-invalid"]}
                value={retailerId}
                onValueChange={(v) =>
                  form.setValue("retailerId", v, { shouldValidate: true })
                }
                options={(retailers.data ?? []).map((r) => ({
                  value: r.id,
                  label: r.name,
                }))}
                placeholder="Choose retailer"
              />
            )}
          </FormField>

          <FormField
            form={form}
            name="dropAddress"
            label="Drop address"
            description={
              reverseLoading
                ? "Looking up address from map pin…"
                : "Optional — auto-fills when you click the map."
            }
          >
            {(field) => (
              <div className="relative">
                <Input
                  {...field}
                  {...form.register("dropAddress")}
                  placeholder="Block 4, Apt 2"
                />
                {reverseLoading && (
                  <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
              </div>
            )}
          </FormField>

          <p className="text-xs text-muted-foreground">
            Click anywhere on the map to place the drop pin.{" "}
            {retailer && (
              <span>
                {riderMarkers.length === 0 ? (
                  <span className="text-[var(--color-brand-coral)]">
                    No on-duty riders available right now — dispatch may fail.
                  </span>
                ) : (
                  <span>
                    {riderMarkers.length} on-duty rider
                    {riderMarkers.length === 1 ? "" : "s"} nearby.
                  </span>
                )}
              </span>
            )}
            {dropPlaced && (
              <>
                {" "}
                <span className="font-mono tabular-nums">
                  Drop at {dropLat.toFixed(5)}, {dropLng.toFixed(5)}.
                </span>
              </>
            )}
          </p>
          <MapView
            markers={markers}
            center={
              retailer
                ? [retailer.latitude, retailer.longitude]
                : ACCRA
            }
            zoom={13}
            height="280px"
            onMapClick={(la, ln) => {
              form.setValue("dropLatitude", la, { shouldValidate: true });
              form.setValue("dropLongitude", ln, { shouldValidate: true });
              setDropPlaced(true);
              void reverseGeocode(la, ln);
            }}
          />

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" disabled={create.isPending}>
              {create.isPending && (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              )}
              Create order
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
