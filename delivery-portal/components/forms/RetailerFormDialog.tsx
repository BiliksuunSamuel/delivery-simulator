"use client";

import { useEffect, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { MapView, type MapMarker } from "@/components/domain/MapView";
import { FormError, FormField } from "./FormField";
import { useCreateRetailer, useUpdateRetailer } from "@/lib/hooks/useApi";
import {
  RetailerFormSchema,
  type RetailerFormValues,
} from "@/lib/api/schemas/forms";
import { toast } from "sonner";
import type { Retailer } from "@/lib/types";

interface Props {
  trigger?: React.ReactElement;
  retailer?: Retailer;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const ACCRA: [number, number] = [5.6037, -0.187];

const defaults = (retailer?: Retailer): RetailerFormValues => ({
  name: retailer?.name ?? "",
  address: retailer?.address ?? "",
  latitude: retailer?.latitude ?? ACCRA[0],
  longitude: retailer?.longitude ?? ACCRA[1],
  zone: retailer?.zone ?? "",
  station: retailer?.station ?? "",
});

export function RetailerFormDialog({
  trigger,
  retailer,
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
  const [createAnother, setCreateAnother] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const create = useCreateRetailer();
  const update = useUpdateRetailer();

  const form = useForm<RetailerFormValues>({
    resolver: zodResolver(RetailerFormSchema),
    mode: "onBlur",
    defaultValues: defaults(retailer),
  });

  useEffect(() => {
    if (open) {
      form.reset(defaults(retailer));
      setSubmitError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, retailer]);

  const lat = form.watch("latitude");
  const lng = form.watch("longitude");
  const name = form.watch("name");

  const markers: MapMarker[] = [
    {
      id: "pin",
      latitude: lat || ACCRA[0],
      longitude: lng || ACCRA[1],
      kind: "retailer",
      label: name || "New retailer",
    },
  ];

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    const payload = {
      name: values.name,
      address: values.address,
      latitude: values.latitude,
      longitude: values.longitude,
      zone: values.zone?.trim() ? values.zone.trim() : null,
      station: values.station?.trim() ? values.station.trim() : null,
    };
    try {
      if (retailer) {
        await update.mutateAsync({ id: retailer.id, data: payload });
        toast.success(`${values.name} updated`);
        setOpen(false);
        return;
      }
      await create.mutateAsync(payload);
      toast.success(`${values.name} added`);
      if (createAnother) {
        form.reset(defaults());
        window.setTimeout(() => form.setFocus("name"), 0);
      } else {
        setOpen(false);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save retailer");
    }
  });

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{retailer ? "Edit retailer" : "Add retailer"}</DialogTitle>
          <DialogDescription>
            {retailer
              ? "Update the retailer's details and pickup location."
              : "Adds a pickup location available to new orders."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <FormError message={submitError} />

          <FormField form={form} name="name" label="Name" required>
            {(field) => (
              <Input
                {...field}
                {...form.register("name")}
                placeholder="FreshMart East Legon"
                autoFocus
              />
            )}
          </FormField>
          <FormField form={form} name="address" label="Address" required>
            {(field) => (
              <Input
                {...field}
                {...form.register("address")}
                placeholder="Lagos Avenue, East Legon"
              />
            )}
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField form={form} name="latitude" label="Latitude" required>
              {(field) => (
                <Input
                  {...field}
                  type="number"
                  step="any"
                  {...form.register("latitude", { valueAsNumber: true })}
                />
              )}
            </FormField>
            <FormField form={form} name="longitude" label="Longitude" required>
              {(field) => (
                <Input
                  {...field}
                  type="number"
                  step="any"
                  {...form.register("longitude", { valueAsNumber: true })}
                />
              )}
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField
              form={form}
              name="zone"
              label="Zone"
              description="Operational catchment (e.g., Accra Central)."
            >
              {(field) => (
                <Input
                  {...field}
                  {...form.register("zone")}
                  placeholder="Accra Central"
                />
              )}
            </FormField>
            <FormField
              form={form}
              name="station"
              label="Station"
              description="Rider hub serving this retailer."
            >
              {(field) => (
                <Input
                  {...field}
                  {...form.register("station")}
                  placeholder="Madina Station"
                />
              )}
            </FormField>
          </div>
          <p className="text-xs text-muted-foreground">
            Click anywhere on the map to set the pickup location.
          </p>
          <MapView
            markers={markers}
            center={[lat || ACCRA[0], lng || ACCRA[1]]}
            zoom={13}
            height="240px"
            onMapClick={(la, ln) => {
              form.setValue("latitude", la, { shouldValidate: true });
              form.setValue("longitude", ln, { shouldValidate: true });
            }}
          />

          <DialogFooter className="!flex-row !items-center !justify-between gap-3 pt-2">
            {!retailer ? (
              <label className="flex items-center gap-2 text-xs text-muted-foreground select-none">
                <Checkbox
                  checked={createAnother}
                  onCheckedChange={(v) => setCreateAnother(Boolean(v))}
                />
                Create another after saving
              </label>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="accent" disabled={isPending}>
                {isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                {retailer ? "Save changes" : "Add retailer"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
