"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Package, Plus, Zap } from "lucide-react";
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
import { TableSkeleton } from "@/components/domain/Skeletons";
import { OrderStateBadge } from "@/components/domain/StateBadge";
import { OrderFormDialog } from "@/components/forms/OrderFormDialog";
import { SelectField } from "@/components/forms/SelectField";
import {
  useDispatchOrder,
  useOrders,
  useRetailers,
  useRiders,
} from "@/lib/hooks/useApi";
import { ORDER_STATES } from "@/lib/types";
import { toast } from "sonner";

export default function OrdersListPage() {
  const router = useRouter();
  const [stateFilter, setStateFilter] = useState<"all" | (typeof ORDER_STATES)[number]>("all");
  const [retailerFilter, setRetailerFilter] = useState<string>("all");
  const orders = useOrders({
    state: stateFilter === "all" ? undefined : stateFilter,
    retailerId: retailerFilter === "all" ? undefined : retailerFilter,
  });
  const retailers = useRetailers();
  const riders = useRiders();
  const dispatchOrder = useDispatchOrder();

  const triggerDispatch = async (id: string) => {
    await dispatchOrder.mutateAsync(id);
    toast.success(`Dispatch triggered for ${id.slice(0, 8)}`);
  };

  const total = (orders.data ?? []).length;

  const filters = (
    <>
      <div className="w-44">
        <SelectField
          value={stateFilter}
          onValueChange={(v) =>
            setStateFilter((v || "all") as typeof stateFilter)
          }
          options={[
            { value: "all", label: "All states" },
            ...ORDER_STATES.map((s) => ({ value: s, label: s })),
          ]}
        />
      </div>
      <div className="w-56">
        <SelectField
          value={retailerFilter}
          onValueChange={(v) => setRetailerFilter(v || "all")}
          placeholder="Retailer"
          options={[
            { value: "all", label: "All retailers" },
            ...(retailers.data ?? []).map((r) => ({
              value: r.id,
              label: r.name,
            })),
          ]}
        />
      </div>
    </>
  );

  const actions = (
    <OrderFormDialog
      trigger={
        <Button variant="accent" size="lg">
          <Plus className="mr-1.5" /> Create order
        </Button>
      }
    />
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Orders"
        subtitle="Every order with its current state. Click a row to watch it move through the lifecycle."
        actions={actions}
        filters={total > 0 ? filters : undefined}
      />

      {orders.isLoading && (
        <TableSkeleton
          columns={["Order", "Retailer", "State", "Rider", "Age", "Drop", ""]}
        />
      )}

      {!orders.isLoading && total === 0 && (
        <EmptyState
          icon={Package}
          title="No orders yet"
          description="Create an order to put the dispatch workflow to work."
          cta={
            <OrderFormDialog
              trigger={
                <Button variant="accent" size="lg">
                  <Plus className="h-4 w-4 mr-2" /> Create your first order
                </Button>
              }
            />
          }
        />
      )}

      {!orders.isLoading && total > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Retailer</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Rider</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Drop</TableHead>
                  <TableHead className="w-32" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(orders.data ?? []).map((o) => {
                  const retailer = (retailers.data ?? []).find(
                    (r) => r.id === o.retailerId,
                  );
                  const rider = (riders.data ?? []).find(
                    (r) => r.id === o.assignedRiderId,
                  );
                  const canDispatch =
                    o.state === "Created" || o.state === "FailedToDispatch";
                  const open = () => router.push(`/orders/${o.id}`);
                  return (
                    <TableRow
                      key={o.id}
                      role="link"
                      tabIndex={0}
                      onClick={open}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          open();
                        }
                      }}
                      className="cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/50 outline-none transition-colors"
                    >
                      <TableCell className="py-3 font-mono text-xs">
                        {o.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>{retailer?.name ?? "—"}</TableCell>
                      <TableCell>
                        <OrderStateBadge state={o.state} />
                      </TableCell>
                      <TableCell className="text-sm">
                        {rider?.fullName ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {(() => {
                          try {
                            return formatDistanceToNow(new Date(o.createdAt), {
                              addSuffix: true,
                            });
                          } catch {
                            return "—";
                          }
                        })()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                        {o.dropAddress ?? (
                          <span className="font-mono">
                            {o.dropLatitude.toFixed(3)},{" "}
                            {o.dropLongitude.toFixed(3)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {canDispatch && (
                          <Button
                            size="sm"
                            variant="accent"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              triggerDispatch(o.id);
                            }}
                            disabled={dispatchOrder.isPending}
                          >
                            <Zap className="h-3 w-3 mr-1" />
                            {o.state === "FailedToDispatch"
                              ? "Retry"
                              : "Dispatch"}
                          </Button>
                        )}
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
