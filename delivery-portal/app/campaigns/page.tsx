"use client";

import { useState } from "react";
import { Megaphone, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { CampaignFormDialog } from "@/components/forms/CampaignFormDialog";
import {
  useCampaigns,
  useDeleteCampaign,
  useUpdateCampaign,
} from "@/lib/hooks/useApi";
import type { Campaign, CampaignKind } from "@/lib/types";
import { toast } from "sonner";

export default function CampaignsPage() {
  const [tab, setTab] = useState<CampaignKind>("Campaign");
  const campaigns = useCampaigns();
  const update = useUpdateCampaign();
  const del = useDeleteCampaign();
  const [editTarget, setEditTarget] = useState<Campaign | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);

  const list = (campaigns.data ?? []).filter((c) => c.kind === tab);

  const toggleActive = async (id: string, isActive: boolean) => {
    await update.mutateAsync({ id, data: { isActive } });
  };

  const actions = (
    <CampaignFormDialog
      trigger={
        <Button variant="accent" size="lg">
          <Plus className="mr-1.5" /> New {tab.toLowerCase()}
        </Button>
      }
      defaultKind={tab}
    />
  );

  const filters = (
    <Tabs value={tab} onValueChange={(v) => setTab(v as CampaignKind)}>
      <TabsList>
        <TabsTrigger value="Campaign">Campaigns</TabsTrigger>
        <TabsTrigger value="Promotion">Promotions</TabsTrigger>
      </TabsList>
    </Tabs>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Campaigns"
        subtitle="Stored for completeness — the simulator does not currently apply them to allocation."
        actions={actions}
        filters={filters}
      />

      {campaigns.isLoading && (
        <TableSkeleton
          columns={["Name", "Trigger", "Threshold", "Reward", "Window", "Active", ""]}
          rows={4}
        />
      )}

      {!campaigns.isLoading && list.length === 0 && (
        <EmptyState
          icon={Megaphone}
          title={`No ${tab.toLowerCase()}s yet`}
          description={`Create a ${tab.toLowerCase()} to keep stakeholders aligned during the demo.`}
          cta={
            <CampaignFormDialog
              trigger={
                <Button variant="accent" size="lg">
                  <Plus className="h-4 w-4 mr-2" /> New {tab.toLowerCase()}
                </Button>
              }
              defaultKind={tab}
            />
          }
        />
      )}

      {!campaigns.isLoading && list.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Reward</TableHead>
                  <TableHead>Window</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="py-3">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground max-w-md truncate">{c.description}</div>
                    </TableCell>
                    <TableCell className="text-xs">{c.triggerType}</TableCell>
                    <TableCell className="font-mono tabular-nums">{c.threshold}</TableCell>
                    <TableCell className="font-mono tabular-nums">GHS {c.rewardAmountGhs}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(c.startDate).toLocaleDateString()} → {new Date(c.endDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={c.isActive}
                        onCheckedChange={(v) => toggleActive(c.id, v)}
                      />
                    </TableCell>
                    <TableCell>
                      <EntityActionsMenu
                        size="sm"
                        onEdit={() => setEditTarget(c)}
                        onDelete={() => setDeleteTarget(c)}
                        editLabel={`Edit ${tab.toLowerCase()}`}
                        deleteLabel={`Delete ${tab.toLowerCase()}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <CampaignFormDialog
        campaign={editTarget ?? undefined}
        open={!!editTarget}
        onOpenChange={(v) => !v && setEditTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={deleteTarget ? `Delete ${deleteTarget.name}?` : ""}
        description={`This permanently removes the ${tab.toLowerCase()}.`}
        confirmLabel={`Delete ${tab.toLowerCase()}`}
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
