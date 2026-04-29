"use client";

import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { FormError, FormField } from "./FormField";
import { SelectField } from "./SelectField";
import { useCreateTier, useUpdateTier } from "@/lib/hooks/useApi";
import { TierFormSchema, type TierFormValues } from "@/lib/api/schemas/forms";
import { toast } from "sonner";
import type { Tier } from "@/lib/types";

interface Props {
  trigger?: React.ReactElement;
  tier?: Tier;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const defaults = (tier?: Tier): TierFormValues => ({
  name: tier?.name ?? "",
  description: tier?.description ?? "",
  colorHex: tier?.colorHex ?? "#1FA39B",
  basePayoutGhs: tier?.basePayoutGhs ?? 5,
  bonusRules: tier?.bonusRules ?? [],
});

export function TierFormDialog({
  trigger,
  tier,
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
  const create = useCreateTier();
  const update = useUpdateTier();

  const form = useForm<TierFormValues>({
    resolver: zodResolver(TierFormSchema),
    mode: "onBlur",
    defaultValues: defaults(tier),
  });

  const rules = useFieldArray({
    control: form.control,
    name: "bonusRules",
  });

  useEffect(() => {
    if (open) {
      form.reset(defaults(tier));
      setSubmitError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tier]);

  const colorHex = form.watch("colorHex");

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    const payload = {
      name: values.name,
      description: values.description ?? "",
      colorHex: values.colorHex,
      basePayoutGhs: values.basePayoutGhs,
      bonusRules: values.bonusRules.map((r) => ({
        trigger: r.trigger,
        threshold: r.threshold,
        mode: r.mode,
        amount: r.amount,
        description: r.description ?? null,
      })),
    };
    try {
      if (tier) {
        await update.mutateAsync({ id: tier.id, data: payload });
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
      setSubmitError(err instanceof Error ? err.message : "Failed to save tier");
    }
  });

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{tier ? "Edit tier" : "New tier"}</DialogTitle>
          <DialogDescription>
            Tiers are the rider payout policy. Every delivery earns the base, plus any bonus rule whose trigger matches the rider&apos;s today-delivered count.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <FormError message={submitError} />

          <FormField form={form} name="name" label="Name" required>
            {(field) => (
              <Input
                {...field}
                {...form.register("name")}
                placeholder="Gold"
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
                placeholder="Top performers — highest priority on offers."
              />
            )}
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField
              form={form}
              name="basePayoutGhs"
              label="Base payout (GHS)"
              required
              description="Earned on every completed delivery."
            >
              {(field) => (
                <Input
                  {...field}
                  type="number"
                  step="any"
                  {...form.register("basePayoutGhs", { valueAsNumber: true })}
                />
              )}
            </FormField>
            <FormField form={form} name="colorHex" label="Colour" required>
              {() => (
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={colorHex}
                    onChange={(e) =>
                      form.setValue("colorHex", e.target.value, {
                        shouldValidate: true,
                      })
                    }
                    className="w-12 h-8 p-1"
                  />
                  <Input
                    {...form.register("colorHex")}
                    placeholder="#1FA39B"
                  />
                </div>
              )}
            </FormField>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Bonus rules</div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  rules.append({
                    trigger: "on_nth",
                    threshold: 1,
                    mode: "flat",
                    amount: 0,
                    description: null,
                  })
                }
              >
                <Plus className="h-3 w-3 mr-1" /> Add rule
              </Button>
            </div>
            {rules.fields.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-xs text-muted-foreground text-center">
                No bonus rules — riders earn the base on every delivery.
              </div>
            ) : (
              <div className="space-y-2">
                {rules.fields.map((field, idx) => (
                  <div
                    key={field.id}
                    className="rounded-md border p-3 space-y-2 bg-muted/30"
                  >
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                      <SelectField
                        value={form.watch(`bonusRules.${idx}.trigger`)}
                        onValueChange={(v) =>
                          form.setValue(
                            `bonusRules.${idx}.trigger`,
                            v as "on_nth" | "every_after_nth",
                            { shouldValidate: true },
                          )
                        }
                        options={[
                          { value: "on_nth", label: "On the Nth order" },
                          {
                            value: "every_after_nth",
                            label: "Every order after the Nth",
                          },
                        ]}
                      />
                      <Input
                        type="number"
                        step="1"
                        placeholder="N"
                        {...form.register(`bonusRules.${idx}.threshold`, {
                          valueAsNumber: true,
                        })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remove rule"
                        onClick={() => rules.remove(idx)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    <div className="grid grid-cols-[1fr_1fr] gap-2">
                      <SelectField
                        value={form.watch(`bonusRules.${idx}.mode`)}
                        onValueChange={(v) =>
                          form.setValue(
                            `bonusRules.${idx}.mode`,
                            v as "percent" | "flat",
                            { shouldValidate: true },
                          )
                        }
                        options={[
                          { value: "flat", label: "Flat GHS bonus" },
                          { value: "percent", label: "Percent of base" },
                        ]}
                      />
                      <Input
                        type="number"
                        step="any"
                        placeholder={
                          form.watch(`bonusRules.${idx}.mode`) === "percent"
                            ? "Amount %"
                            : "Amount GHS"
                        }
                        {...form.register(`bonusRules.${idx}.amount`, {
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                    <Input
                      placeholder="Optional description shown on the offer"
                      {...form.register(`bonusRules.${idx}.description`)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="!flex-row !items-center !justify-between gap-3 pt-2">
            {!tier ? (
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
                {tier ? "Save changes" : "Add tier"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
