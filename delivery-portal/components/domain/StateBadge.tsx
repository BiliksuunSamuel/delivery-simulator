import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  bucketClasses,
  dispatchOutcomeBucket,
  eventBucketBorder,
  notificationStatusBucket,
  orderStateBucket,
  riderStateBucket,
} from "@/lib/utils/state-colours";
import type {
  DispatchOutcome,
  NotificationStatus,
  OrderState,
  RiderPerformanceStatus,
  RiderState,
} from "@/lib/types";

export const EVENT_COLORS = eventBucketBorder;

export function RiderStateBadge({ state, className }: { state: RiderState; className?: string }) {
  return (
    <Badge variant="secondary" className={cn(bucketClasses(riderStateBucket(state)), className)}>
      {state}
    </Badge>
  );
}

export function OrderStateBadge({ state, className }: { state: OrderState; className?: string }) {
  return (
    <Badge variant="secondary" className={cn(bucketClasses(orderStateBucket(state)), className)}>
      {state}
    </Badge>
  );
}

export function NotificationStatusBadge({ status, className }: { status: NotificationStatus; className?: string }) {
  return (
    <Badge variant="secondary" className={cn(bucketClasses(notificationStatusBucket(status)), className)}>
      {status}
    </Badge>
  );
}

export function RiderPerformanceStatusBadge({
  status,
  className,
}: {
  status: RiderPerformanceStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="secondary"
      className={cn(bucketClasses(notificationStatusBucket(status)), className)}
    >
      {status}
    </Badge>
  );
}

export function DispatchOutcomeBadge({ outcome, className }: { outcome: DispatchOutcome; className?: string }) {
  return (
    <Badge variant="secondary" className={cn(bucketClasses(dispatchOutcomeBucket(outcome)), className)}>
      {outcome}
    </Badge>
  );
}

export function EligibilityPill({ eligible, reason }: { eligible: boolean; reason?: string | null }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border-transparent",
        eligible
          ? "bg-[var(--color-brand-teal)]/15 text-[var(--color-brand-teal)]"
          : "bg-[var(--color-brand-coral)]/15 text-[var(--color-brand-coral)]"
      )}
      title={!eligible && reason ? reason : undefined}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          eligible ? "bg-[var(--color-brand-teal)]" : "bg-[var(--color-brand-coral)]"
        )}
      />
      {eligible ? "Eligible" : "Ineligible"}
    </span>
  );
}
