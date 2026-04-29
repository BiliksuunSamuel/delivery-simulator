"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { SelectField } from "@/components/forms/SelectField";
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
import { TableSkeleton } from "@/components/domain/Skeletons";
import { NotificationStatusBadge } from "@/components/domain/StateBadge";
import { useNotifications, useRiders } from "@/lib/hooks/useApi";
import { NOTIFICATION_STATUSES } from "@/lib/types";

export default function NotificationsPage() {
  const [riderFilter, setRiderFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | (typeof NOTIFICATION_STATUSES)[number]>("all");
  const riders = useRiders();
  const notifications = useNotifications({
    riderId: riderFilter === "all" ? undefined : riderFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const riderById = new Map((riders.data ?? []).map((r) => [r.id, r]));

  const filters = (
    <>
      <div className="w-56">
        <SelectField
          value={riderFilter}
          onValueChange={(v) => setRiderFilter(v || "all")}
          placeholder="Rider"
          options={[
            { value: "all", label: "All riders" },
            ...(riders.data ?? []).map((r) => ({
              value: r.id,
              label: r.fullName,
            })),
          ]}
        />
      </div>
      <div className="w-44">
        <SelectField
          value={statusFilter}
          onValueChange={(v) =>
            setStatusFilter((v || "all") as typeof statusFilter)
          }
          options={[
            { value: "all", label: "All statuses" },
            ...NOTIFICATION_STATUSES.map((s) => ({ value: s, label: s })),
          ]}
        />
      </div>
    </>
  );

  const list = notifications.data ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Notifications"
        subtitle="Cross-rider feed of every offer the simulator has issued."
        filters={filters}
      />

      {notifications.isLoading && (
        <TableSkeleton
          columns={["Rider", "Order", "Status", "Rank", "Score", "Distance", "Issued", "Responded"]}
        />
      )}

      {!notifications.isLoading && list.length === 0 && (
        <EmptyState
          icon={Bell}
          title="No offers issued yet"
          description="Trigger dispatch on a Created order to start producing offers."
        />
      )}

      {!notifications.isLoading && list.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rider</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rank</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Responded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((n) => {
                  const rider = riderById.get(n.riderId);
                  return (
                    <TableRow key={n.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="py-3">
                        <Link
                          href={`/notifications/${n.riderId}/inbox`}
                          className="font-medium underline-offset-2 hover:underline"
                        >
                          {rider?.fullName ?? n.riderId.slice(0, 8)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/orders/${n.orderId}`}
                          className="font-mono text-xs underline-offset-2 hover:underline"
                        >
                          {n.orderId.slice(0, 8)}
                        </Link>
                      </TableCell>
                      <TableCell><NotificationStatusBadge status={n.status} /></TableCell>
                      <TableCell className="font-mono tabular-nums">#{n.offerRank}</TableCell>
                      <TableCell className="font-mono tabular-nums">{n.score.toFixed(3)}</TableCell>
                      <TableCell className="font-mono tabular-nums">{Math.round(n.distanceMeters)}m</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {(() => {
                          try {
                            return formatDistanceToNow(new Date(n.issuedAt), { addSuffix: true });
                          } catch {
                            return "—";
                          }
                        })()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {n.respondedAt
                          ? formatDistanceToNow(new Date(n.respondedAt), { addSuffix: true })
                          : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
