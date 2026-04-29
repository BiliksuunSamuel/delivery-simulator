"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { PageHeader } from "@/components/layout/PageHeader";
import { useConfig, useUpdateConfig } from "@/lib/hooks/useApi";
import { toast } from "sonner";
import type { Config } from "@/lib/types";

export default function ConfigPage() {
  const config = useConfig();
  const update = useUpdateConfig();

  const [draft, setDraft] = useState<Config | null>(null);

  useEffect(() => {
    if (config.data && !draft) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initialize editable draft once from server data
      setDraft(config.data);
    }
  }, [config.data, draft]);

  if (!draft) {
    return <div className="text-sm text-muted-foreground">Loading config…</div>;
  }

  const setNum = (k: keyof Config, v: number) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  const save = async () => {
    await update.mutateAsync(draft);
    toast.success("Config saved.");
  };

  const reset = () => {
    if (config.data) setDraft(config.data);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Configuration"
        subtitle="Live tuning for eligibility thresholds, dispatch windows, and lifecycle delays."
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={reset}>
              Reset to saved
            </Button>
            <Button
              variant="accent"
              onClick={save}
              disabled={update.isPending}
            >
              {update.isPending && (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              )}
              Save config
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">
              Eligibility &amp; dispatch limits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-1.5">
              <Label>Battery threshold ({draft.batteryThresholdPercent}%)</Label>
              <Slider
                value={[draft.batteryThresholdPercent]}
                onValueChange={(v) =>
                  setNum("batteryThresholdPercent", Array.isArray(v) ? v[0] : v)
                }
                min={0}
                max={100}
                step={1}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>GPS accuracy threshold (m)</Label>
              <Input
                type="number"
                value={draft.gpsAccuracyThresholdMeters}
                onChange={(e) =>
                  setNum("gpsAccuracyThresholdMeters", Number(e.target.value))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Decline cap per day</Label>
              <Input
                type="number"
                value={draft.declineCapPerDay}
                onChange={(e) =>
                  setNum("declineCapPerDay", Number(e.target.value))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Offer timeout (seconds)</Label>
              <Input
                type="number"
                value={draft.offerTimeoutSeconds}
                onChange={(e) =>
                  setNum("offerTimeoutSeconds", Number(e.target.value))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Max candidates per dispatch</Label>
              <Input
                type="number"
                value={draft.maxCandidatesPerDispatch}
                onChange={(e) =>
                  setNum("maxCandidatesPerDispatch", Number(e.target.value))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Proximity radius (m)</Label>
              <Input
                type="number"
                value={draft.proximityRadiusMeters}
                onChange={(e) =>
                  setNum("proximityRadiusMeters", Number(e.target.value))
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">
              Combined score weights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              After the proximity short-list, candidates are re-ranked by{" "}
              <span className="font-mono">
                proximityWeight × proximityScore + familiarityWeight ×
                familiarityScore
              </span>
              . Each component is normalised to [0, 1]. Weights typically sum
              to 1.0 but anything works — relative magnitudes are what matter.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Proximity weight</Label>
                <Input
                  type="number"
                  step="0.05"
                  value={draft.proximityWeight}
                  onChange={(e) =>
                    setNum("proximityWeight", Number(e.target.value))
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Familiarity weight</Label>
                <Input
                  type="number"
                  step="0.05"
                  value={draft.familiarityWeight}
                  onChange={(e) =>
                    setNum("familiarityWeight", Number(e.target.value))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">
              Lifecycle auto-progress delays
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              After a rider accepts, the workflow waits these intervals before
              advancing the order through pickup → drop → delivered.
            </p>
            <div className="grid gap-1.5">
              <Label>Arrive at pickup delay (seconds)</Label>
              <Input
                type="number"
                value={draft.arriveAtPickupDelaySeconds}
                onChange={(e) =>
                  setNum(
                    "arriveAtPickupDelaySeconds",
                    Number(e.target.value),
                  )
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Arrive at delivery delay (seconds)</Label>
              <Input
                type="number"
                value={draft.arriveAtDeliveryDelaySeconds}
                onChange={(e) =>
                  setNum(
                    "arriveAtDeliveryDelaySeconds",
                    Number(e.target.value),
                  )
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Confirm delivery delay (seconds)</Label>
              <Input
                type="number"
                value={draft.confirmDeliveryDelaySeconds}
                onChange={(e) =>
                  setNum(
                    "confirmDeliveryDelaySeconds",
                    Number(e.target.value),
                  )
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
