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
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { SelectField } from "./SelectField";
import { FormError, FormField } from "./FormField";
import {
  useCreateRider,
  useTiers,
  useUpdateRider,
  useUpdateRiderLocation,
} from "@/lib/hooks/useApi";
import { RiderFormSchema, type RiderFormValues } from "@/lib/api/schemas/forms";
import { KYC_STATUSES, RIDER_STATES } from "@/lib/types";
import type { Rider } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  trigger?: React.ReactElement;
  rider?: Rider;
  onSaved?: (rider: Rider) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const ACCRA = { latitude: 5.6037, longitude: -0.187 };

const defaults = (rider: Rider | undefined, fallbackTierId: string): RiderFormValues => ({
  fullName: rider?.fullName ?? "",
  phone: rider?.phone ?? "",
  tierId: rider?.tierId ?? fallbackTierId,
  state: rider?.state ?? "OnlineIdle",
  isEligible: rider?.isEligible ?? true,
  kycStatus: rider?.kycStatus ?? "Approved",
  acceptanceRate: rider?.acceptanceRate ?? 85,
  // Location lives in a separate collection now (rider_locations); when
  // creating a rider through this dialog we still capture an initial
  // position to immediately seed their location ping.
  latitude: ACCRA.latitude,
  longitude: ACCRA.longitude,
  batteryPercent: 100,
  gpsAccuracyMeters: 10,
});

export function RiderFormDialog({
  trigger,
  rider,
  onSaved,
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
  const tiers = useTiers();
  const create = useCreateRider();
  const update = useUpdateRider();
  const updateLocation = useUpdateRiderLocation();

  const fallbackTier = tiers.data?.[0]?.id ?? "";
  const form = useForm<RiderFormValues>({
    resolver: zodResolver(RiderFormSchema),
    mode: "onBlur",
    defaultValues: defaults(rider, fallbackTier),
  });

  useEffect(() => {
    if (open) {
      form.reset(defaults(rider, fallbackTier));
      setSubmitError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rider, fallbackTier]);

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      if (rider) {
        const saved = await update.mutateAsync({
          id: rider.id,
          data: {
            fullName: values.fullName,
            phone: values.phone,
            tierId: values.tierId,
            state: values.state,
            isEligible: values.isEligible,
            kycStatus: values.kycStatus,
            acceptanceRate: values.acceptanceRate,
          },
        });
        await updateLocation.mutateAsync({
          id: rider.id,
          data: {
            latitude: values.latitude,
            longitude: values.longitude,
            batteryPercent: values.batteryPercent,
            gpsAccuracyMeters: values.gpsAccuracyMeters,
          },
        });
        toast.success(`${saved.fullName} updated`);
        onSaved?.(saved);
        setOpen(false);
        return;
      }

      const saved = await create.mutateAsync({
        fullName: values.fullName,
        phone: values.phone,
        tierId: values.tierId,
        state: values.state,
        isEligible: values.isEligible,
        ineligibilityReason: values.isEligible ? null : "manual hold",
        kycStatus: values.kycStatus,
        acceptanceRate: values.acceptanceRate,
        currentLoad: 0,
        declinesToday: 0,
      });
      // Seed initial location alongside the new rider so they're
      // immediately discoverable by the dispatch workflow.
      await updateLocation.mutateAsync({
        id: saved.id,
        data: {
          latitude: values.latitude,
          longitude: values.longitude,
          batteryPercent: values.batteryPercent,
          gpsAccuracyMeters: values.gpsAccuracyMeters,
        },
      });
      toast.success(`${saved.fullName} added`);
      onSaved?.(saved);
      if (createAnother) {
        form.reset(defaults(undefined, fallbackTier));
        // re-focus first field
        window.setTimeout(() => form.setFocus("fullName"), 0);
      } else {
        setOpen(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save rider";
      setSubmitError(message);
    }
  });

  const isPending = create.isPending || update.isPending;

  const battery = form.watch("batteryPercent");
  const acceptance = form.watch("acceptanceRate");
  const isEligible = form.watch("isEligible");
  const tierId = form.watch("tierId");
  const state = form.watch("state");
  const kycStatus = form.watch("kycStatus");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{rider ? "Edit rider" : "Add rider"}</DialogTitle>
          <DialogDescription>
            {rider
              ? "Update profile, eligibility, and current location."
              : "Saves to the simulator and the rider becomes immediately dispatchable."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <FormError message={submitError} />

          <div className="grid grid-cols-2 gap-3">
            <FormField form={form} name="fullName" label="Full name" required>
              {(field) => (
                <Input
                  {...field}
                  {...form.register("fullName")}
                  placeholder="Kwame Mensah"
                  autoFocus
                />
              )}
            </FormField>
            <FormField form={form} name="phone" label="Phone" required>
              {(field) => (
                <Input
                  {...field}
                  {...form.register("phone")}
                  placeholder="+233 24 123 4567"
                  inputMode="tel"
                />
              )}
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField form={form} name="tierId" label="Tier" required>
              {(field) => (
                <SelectField
                  id={field.id}
                  aria-invalid={field["aria-invalid"]}
                  value={tierId}
                  onValueChange={(v) =>
                    form.setValue("tierId", v, { shouldValidate: true })
                  }
                  options={(tiers.data ?? []).map((t) => ({
                    value: t.id,
                    label: t.name,
                  }))}
                  placeholder="Pick tier"
                />
              )}
            </FormField>
            <FormField form={form} name="kycStatus" label="KYC status" required>
              {(field) => (
                <SelectField
                  id={field.id}
                  aria-invalid={field["aria-invalid"]}
                  value={kycStatus}
                  onValueChange={(v) =>
                    form.setValue(
                      "kycStatus",
                      (v || "Approved") as RiderFormValues["kycStatus"],
                      { shouldValidate: true }
                    )
                  }
                  options={KYC_STATUSES.map((k) => ({ value: k, label: k }))}
                />
              )}
            </FormField>
          </div>

          <FormField form={form} name="state" label="Operational state" required>
            {(field) => (
              <SelectField
                id={field.id}
                aria-invalid={field["aria-invalid"]}
                value={state}
                onValueChange={(v) =>
                  form.setValue(
                    "state",
                    (v || "OnlineIdle") as RiderFormValues["state"],
                    { shouldValidate: true }
                  )
                }
                options={RIDER_STATES.map((s) => ({ value: s, label: s }))}
              />
            )}
          </FormField>

          <FormField
            form={form}
            name="acceptanceRate"
            label={`Acceptance rate (${Math.round(acceptance ?? 0)}%)`}
          >
            {() => (
              <Slider
                value={[acceptance ?? 85]}
                onValueChange={(v) =>
                  form.setValue("acceptanceRate", Array.isArray(v) ? v[0] : v, {
                    shouldValidate: true,
                  })
                }
                min={0}
                max={100}
                step={1}
              />
            )}
          </FormField>

          <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Eligible to receive offers</div>
              <div className="text-xs text-muted-foreground">
                Toggle off to block offers without changing state.
              </div>
            </div>
            <Switch
              checked={isEligible}
              onCheckedChange={(v) =>
                form.setValue("isEligible", v, { shouldValidate: true })
              }
            />
          </div>

          <div className="space-y-3 rounded-md border p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Location & battery
            </div>
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
            <FormField
              form={form}
              name="batteryPercent"
              label={`Battery (${Math.round(battery ?? 0)}%)`}
            >
              {() => (
                <Slider
                  value={[battery ?? 100]}
                  onValueChange={(v) =>
                    form.setValue("batteryPercent", Array.isArray(v) ? v[0] : v, {
                      shouldValidate: true,
                    })
                  }
                  min={0}
                  max={100}
                  step={1}
                />
              )}
            </FormField>
            <FormField form={form} name="gpsAccuracyMeters" label="GPS accuracy (m)" required>
              {(field) => (
                <Input
                  {...field}
                  type="number"
                  step="1"
                  {...form.register("gpsAccuracyMeters", { valueAsNumber: true })}
                />
              )}
            </FormField>
          </div>

          <DialogFooter className="!flex-row !items-center !justify-between gap-3 pt-2">
            {!rider ? (
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
              <Button type="submit" disabled={isPending} variant="accent">
                {isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                {rider ? "Save changes" : "Add rider"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
