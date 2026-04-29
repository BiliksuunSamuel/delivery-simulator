"use client";

import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RiderPerformanceStatusBadge } from "@/components/domain/StateBadge";
import { useRiderPaymentForOrder } from "@/lib/hooks/useApi";
import type { RiderPerformance } from "@/lib/types";

interface Props {
  performance: RiderPerformance | null;
  onOpenChange: (open: boolean) => void;
}

function safeRel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return null;
  }
}

export function PerformanceBreakdownDialog({ performance, onOpenChange }: Props) {
  const open = !!performance;
  const payment = useRiderPaymentForOrder(
    performance?.riderId,
    performance?.orderId,
  );
  const p = performance;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Order {p?.orderId.slice(0, 8) ?? "—"}
          </DialogTitle>
          <DialogDescription>
            Rider performance + payment breakdown.
          </DialogDescription>
        </DialogHeader>

        {p && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Status">
                <RiderPerformanceStatusBadge status={p.status} />
              </Field>
              <Field label="When">
                <span className="text-xs text-muted-foreground">
                  {safeRel(p.timestamp) ?? "—"}
                </span>
              </Field>
              <Field label="Tier at time">
                <span>{p.tierNameSnapshot ?? "—"}</span>
              </Field>
              <Field label="Locked payout">
                <span className="font-mono tabular-nums font-medium text-[var(--color-brand-teal)]">
                  {p.payoutAmountGhs != null
                    ? `GHS ${p.payoutAmountGhs.toFixed(2)}`
                    : "—"}
                </span>
              </Field>
            </div>

            {(p.pickedUpAt || p.deliveredAt || p.cancelledAt) && (
              <div className="rounded-md border p-3 space-y-1">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Lifecycle
                </div>
                {p.pickedUpAt && (
                  <Row label="Picked up">{safeRel(p.pickedUpAt)}</Row>
                )}
                {p.deliveredAt && (
                  <Row label="Delivered">{safeRel(p.deliveredAt)}</Row>
                )}
                {p.cancelledAt && (
                  <Row label="Cancelled">{safeRel(p.cancelledAt)}</Row>
                )}
              </div>
            )}

            <div className="rounded-md border p-3 space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center justify-between">
                Payment breakdown
                {payment.isLoading && (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                )}
              </div>
              {!payment.isLoading && !payment.data && (
                <div className="text-xs text-muted-foreground italic">
                  {p.status === "Accepted" && !p.deliveredAt
                    ? "Not yet paid — payment is recorded on delivery."
                    : p.status === "Accepted"
                      ? "No payment record found."
                      : `Rider ${p.status === "Declined" ? "declined" : "timed out on"} this offer — no payment recorded.`}
                </div>
              )}
              {payment.data && (
                <div className="space-y-1.5">
                  <Row label="Base">
                    GHS {payment.data.basePayoutGhs.toFixed(2)}
                  </Row>
                  {payment.data.bonusBreakdown.map((b, i) => (
                    <Row
                      key={i}
                      label={b.description}
                      className="text-[var(--color-brand-orange)]"
                    >
                      +GHS {b.amount.toFixed(2)}
                    </Row>
                  ))}
                  <div className="border-t pt-1.5 flex items-center justify-between text-sm font-medium">
                    <span>Total paid</span>
                    <span className="font-mono tabular-nums text-[var(--color-brand-teal)]">
                      GHS {payment.data.totalPayoutGhs.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Order #{payment.data.todayDeliveredCountAtPayment} of the
                    rider&apos;s day · paid{" "}
                    {safeRel(payment.data.paidAt) ?? "just now"}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Row({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono tabular-nums ${className ?? ""}`}>
        {children}
      </span>
    </div>
  );
}
