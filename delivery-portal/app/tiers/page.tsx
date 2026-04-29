"use client";

import { useMemo, useState } from "react";
import { Award, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { TierFormDialog } from "@/components/forms/TierFormDialog";
import { useDeleteTier, useRiders, useTiers } from "@/lib/hooks/useApi";
import type { Tier } from "@/lib/types";
import { toast } from "sonner";

export default function TiersPage() {
  const tiers = useTiers();
  const riders = useRiders();
  const del = useDeleteTier();
  const [editTarget, setEditTarget] = useState<Tier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tier | null>(null);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    (riders.data ?? []).forEach((r) => {
      m.set(r.tierId, (m.get(r.tierId) ?? 0) + 1);
    });
    return m;
  }, [riders.data]);

  const total = (tiers.data ?? []).length;

  const actions = (
    <TierFormDialog
      trigger={
        <Button variant="accent" size="lg">
          <Plus className="mr-1.5" /> New tier
        </Button>
      }
    />
  );

  const selectedCount = deleteTarget ? counts.get(deleteTarget.id) ?? 0 : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tiers"
        subtitle="Tiers are the rider payout policy: every delivery earns the base, plus any bonus rule whose trigger matches the rider's today-delivered count."
        actions={actions}
      />

      {tiers.isLoading && (
        <TableSkeleton
          columns={["Name", "Description", "Base payout", "Bonus rules", "Riders", ""]}
          rows={3}
        />
      )}

      {!tiers.isLoading && total === 0 && (
        <EmptyState
          icon={Award}
          title="No tiers yet"
          description="Create at least one tier before adding riders."
          cta={
            <TierFormDialog
              trigger={
                <Button variant="accent" size="lg">
                  <Plus className="h-4 w-4 mr-2" /> Add your first tier
                </Button>
              }
            />
          }
        />
      )}

      {!tiers.isLoading && total > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Base payout</TableHead>
                  <TableHead>Bonus rules</TableHead>
                  <TableHead>Riders</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(tiers.data ?? []).map((t) => (
                  <TableRow key={t.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="py-3">
                      <span
                        className="inline-flex items-center gap-2 font-medium"
                        style={{ color: t.colorHex }}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: t.colorHex }}
                        />
                        {t.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-md">
                      {t.description}
                    </TableCell>
                    <TableCell className="font-mono tabular-nums">
                      GHS {t.basePayoutGhs?.toFixed(2) ?? "0.00"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {t.bonusRules?.length
                        ? `${t.bonusRules.length} rule${t.bonusRules.length === 1 ? "" : "s"}`
                        : <span className="italic">none</span>}
                    </TableCell>
                    <TableCell className="font-mono tabular-nums">{counts.get(t.id) ?? 0}</TableCell>
                    <TableCell>
                      <EntityActionsMenu
                        size="sm"
                        onEdit={() => setEditTarget(t)}
                        onDelete={() => setDeleteTarget(t)}
                        editLabel="Edit tier"
                        deleteLabel="Delete tier"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <TierFormDialog
        tier={editTarget ?? undefined}
        open={!!editTarget}
        onOpenChange={(v) => !v && setEditTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={deleteTarget ? `Delete ${deleteTarget.name}?` : ""}
        description={
          selectedCount > 0
            ? `${selectedCount} rider${selectedCount === 1 ? "" : "s"} currently use this tier. They'll keep the reference but lose the lookup until reassigned.`
            : "This permanently removes the tier."
        }
        confirmLabel="Delete tier"
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
