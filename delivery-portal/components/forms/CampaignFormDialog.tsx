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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FormError, FormField } from "./FormField";
import { SelectField } from "./SelectField";
import {
  useCreateCampaign,
  useTiers,
  useUpdateCampaign,
} from "@/lib/hooks/useApi";
import {
  CampaignFormSchema,
  type CampaignFormValues,
} from "@/lib/api/schemas/forms";
import {
  type Campaign,
  CAMPAIGN_KINDS,
  type CampaignKind,
  TRIGGER_TYPES,
  type TriggerType,
} from "@/lib/types";
import { toast } from "sonner";

interface Props {
  trigger?: React.ReactElement;
  campaign?: Campaign;
  defaultKind?: CampaignKind;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

const defaults = (
  campaign: Campaign | undefined,
  defaultKind: CampaignKind
): CampaignFormValues => ({
  name: campaign?.name ?? "",
  description: campaign?.description ?? "",
  kind: campaign?.kind ?? defaultKind,
  triggerType: campaign?.triggerType ?? "OrdersCompleted",
  threshold: campaign?.threshold ?? 10,
  rewardAmountGhs: campaign?.rewardAmountGhs ?? 50,
  startDate: campaign?.startDate
    ? campaign.startDate.slice(0, 10)
    : today(),
  endDate: campaign?.endDate ? campaign.endDate.slice(0, 10) : inDays(30),
  isActive: campaign?.isActive ?? true,
  targetTierId: campaign?.targetTierId ?? null,
});

export function CampaignFormDialog({
  trigger,
  campaign,
  defaultKind = "Campaign",
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
  const tiers = useTiers();
  const create = useCreateCampaign();
  const update = useUpdateCampaign();

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(CampaignFormSchema),
    mode: "onBlur",
    defaultValues: defaults(campaign, defaultKind),
  });

  useEffect(() => {
    if (open) {
      form.reset(defaults(campaign, defaultKind));
      setSubmitError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, campaign, defaultKind]);

  const kind = form.watch("kind");
  const triggerType = form.watch("triggerType");
  const isActive = form.watch("isActive");
  const targetTierId = form.watch("targetTierId");

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    const payload = {
      name: values.name,
      description: values.description,
      kind: values.kind,
      triggerType: values.triggerType,
      threshold: values.threshold,
      rewardAmountGhs: values.rewardAmountGhs,
      startDate: new Date(values.startDate).toISOString(),
      endDate: new Date(values.endDate).toISOString(),
      isActive: values.isActive,
      targetTierId: values.targetTierId,
    };
    try {
      if (campaign) {
        await update.mutateAsync({ id: campaign.id, data: payload });
        toast.success(`${values.name} updated`);
      } else {
        await create.mutateAsync(payload);
        toast.success(`${values.name} added`);
      }
      setOpen(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save campaign");
    }
  });

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{campaign ? "Edit campaign" : "New campaign"}</DialogTitle>
          <DialogDescription>
            Campaigns and promotions are stored for completeness; the simulator does not currently apply them to the allocation algorithm.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <FormError message={submitError} />

          <FormField form={form} name="name" label="Name" required>
            {(field) => (
              <Input
                {...field}
                {...form.register("name")}
                placeholder="Eid Bonus"
                autoFocus
              />
            )}
          </FormField>
          <FormField form={form} name="description" label="Description">
            {(field) => (
              <Textarea
                {...field}
                {...form.register("description")}
                rows={2}
                placeholder="Earn a bonus when you complete 20 deliveries this week."
              />
            )}
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField form={form} name="kind" label="Kind" required>
              {(field) => (
                <SelectField
                  id={field.id}
                  aria-invalid={field["aria-invalid"]}
                  value={kind}
                  onValueChange={(v) =>
                    form.setValue("kind", (v || "Campaign") as CampaignKind, {
                      shouldValidate: true,
                    })
                  }
                  options={CAMPAIGN_KINDS.map((k) => ({ value: k, label: k }))}
                />
              )}
            </FormField>
            <FormField form={form} name="triggerType" label="Trigger" required>
              {(field) => (
                <SelectField
                  id={field.id}
                  aria-invalid={field["aria-invalid"]}
                  value={triggerType}
                  onValueChange={(v) =>
                    form.setValue(
                      "triggerType",
                      (v || "OrdersCompleted") as TriggerType,
                      { shouldValidate: true }
                    )
                  }
                  options={TRIGGER_TYPES.map((k) => ({ value: k, label: k }))}
                />
              )}
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField form={form} name="threshold" label="Threshold" required>
              {(field) => (
                <Input
                  {...field}
                  type="number"
                  step="1"
                  {...form.register("threshold", { valueAsNumber: true })}
                />
              )}
            </FormField>
            <FormField form={form} name="rewardAmountGhs" label="Reward (GHS)" required>
              {(field) => (
                <Input
                  {...field}
                  type="number"
                  step="1"
                  {...form.register("rewardAmountGhs", { valueAsNumber: true })}
                />
              )}
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField form={form} name="startDate" label="Start date" required>
              {(field) => (
                <Input
                  {...field}
                  type="date"
                  {...form.register("startDate")}
                />
              )}
            </FormField>
            <FormField form={form} name="endDate" label="End date" required>
              {(field) => (
                <Input
                  {...field}
                  type="date"
                  {...form.register("endDate")}
                />
              )}
            </FormField>
          </div>

          <FormField
            form={form}
            name="targetTierId"
            label="Target tier"
            description="Restrict to a single tier, or leave for all riders."
          >
            {(field) => (
              <SelectField
                id={field.id}
                aria-invalid={field["aria-invalid"]}
                value={targetTierId ?? "none"}
                onValueChange={(v) =>
                  form.setValue("targetTierId", !v || v === "none" ? null : v, {
                    shouldValidate: true,
                  })
                }
                options={[
                  { value: "none", label: "All tiers" },
                  ...(tiers.data ?? []).map((t) => ({
                    value: t.id,
                    label: t.name,
                  })),
                ]}
              />
            )}
          </FormField>

          <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
            <div>
              <div className="text-sm font-medium">Active</div>
              <div className="text-xs text-muted-foreground">
                Inactive campaigns are stored but not surfaced as live.
              </div>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={(v) =>
                form.setValue("isActive", v, { shouldValidate: true })
              }
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" disabled={isPending}>
              {isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {campaign ? "Save changes" : "Add campaign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
