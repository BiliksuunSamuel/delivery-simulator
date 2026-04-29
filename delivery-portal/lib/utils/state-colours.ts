import type {
  DispatchOutcome,
  KycStatus,
  NotificationStatus,
  OrderState,
  RiderState,
} from "@/lib/types";

export type BadgeBucket = "success" | "progress" | "danger" | "neutral" | "info";

const BUCKET_CLASSES: Record<BadgeBucket, string> = {
  success:
    "bg-[var(--color-brand-teal)]/15 text-[var(--color-brand-teal)] border-transparent",
  progress:
    "bg-[var(--color-brand-orange)]/15 text-[var(--color-brand-orange)] border-transparent",
  danger:
    "bg-[var(--color-brand-coral)]/15 text-[var(--color-brand-coral)] border-transparent",
  neutral:
    "bg-[var(--color-brand-muted-bg)] text-[var(--color-brand-muted)] border-transparent",
  // "Info"/Created uses navy at low opacity in light mode; surface-2 in dark.
  info:
    "bg-[var(--color-brand-navy)]/[0.08] text-[var(--color-brand-navy)] dark:bg-[var(--color-brand-surface-2)] dark:text-[var(--color-brand-navy-fg)] border-transparent",
};

export function bucketClasses(bucket: BadgeBucket): string {
  return BUCKET_CLASSES[bucket];
}

export function riderStateBucket(state: RiderState): BadgeBucket {
  switch (state) {
    case "OnlineIdle":
      return "success";
    case "OnlineAssigned":
    case "OnPickup":
    case "OnDelivery":
      return "progress";
    case "Suspended":
      return "danger";
    case "Offline":
    case "OnBreak":
      return "neutral";
  }
}

export function orderStateBucket(state: OrderState): BadgeBucket {
  switch (state) {
    case "Created":
      return "info";
    case "PendingRiderAccept":
    case "ArriveAtPickup":
    case "ArriveAtDelivery":
      return "progress";
    case "RiderAccepted":
    case "Delivered":
      return "success";
    case "FailedToDispatch":
    case "Cancelled":
      return "danger";
  }
}

export function notificationStatusBucket(status: NotificationStatus): BadgeBucket {
  switch (status) {
    case "Pending":
      return "progress";
    case "Accepted":
      return "success";
    case "Declined":
    case "TimedOut":
    case "Revoked":
      return "danger";
  }
}

export function dispatchOutcomeBucket(outcome: DispatchOutcome): BadgeBucket {
  switch (outcome) {
    case "Succeeded":
      return "success";
    case "InProgress":
      return "progress";
    case "Failed":
      return "danger";
  }
}

export function kycBucket(status: KycStatus): BadgeBucket {
  switch (status) {
    case "Approved":
      return "success";
    case "Pending":
      return "neutral";
    case "Rejected":
      return "danger";
  }
}

// Per-event-type left-border accent colour, used by the live event feed.
export const eventBucketBorder: Record<string, string> = {
  RiderEligibilityChanged: "border-l-[var(--color-brand-orange)]",
  RiderStateChanged: "border-l-[var(--color-brand-navy)] dark:border-l-[var(--color-brand-navy-fg)]",
  OrderCreated: "border-l-[var(--color-brand-muted)]",
  OrderStateChanged: "border-l-[var(--color-brand-navy)] dark:border-l-[var(--color-brand-navy-fg)]",
  OfferIssued: "border-l-[var(--color-brand-orange)]",
  OfferAccepted: "border-l-[var(--color-brand-teal)]",
  OfferDeclined: "border-l-[var(--color-brand-coral)]",
  OfferTimedOut: "border-l-[var(--color-brand-muted)]",
  DispatchSucceeded: "border-l-[var(--color-brand-teal)]",
  DispatchFailed: "border-l-[var(--color-brand-coral)]",
  BatteryThresholdCrossed: "border-l-[var(--color-brand-orange)]",
  ConfigUpdated: "border-l-[var(--color-brand-navy)] dark:border-l-[var(--color-brand-navy-fg)]",
};
