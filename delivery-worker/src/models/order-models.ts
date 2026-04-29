import type { OrderState } from 'src/enums';
import type { DispatchCandidate } from 'src/schemas/dispatch-attempt.schema';

/**
 * Per-candidate payout snapshot the workflow forwards from prepareDispatch
 * into issueOffer. Locked at attempt-prep time so the rider sees a stable
 * "earn GHS X" figure on the offer.
 */
export interface PreparedCandidatePayout {
  riderId: string;
  estimatedPayoutGhs: number;
  todayDeliveredCount: number;
}

/** Argument passed to the workflow's @Execute method. */
export interface DispatchWorkflowInput {
  orderId: string;
}

/** Payload of the respondToOffer signal. */
export interface OfferResponseSignal {
  notificationId: string;
  action: 'accept' | 'decline';
}

export interface PreparedDispatch {
  orderId: string;
  attemptId: string;
  offerTimeoutSeconds: number;
  arriveAtPickupDelaySeconds: number;
  arriveAtDeliveryDelaySeconds: number;
  confirmDeliveryDelaySeconds: number;
  candidates: DispatchCandidate[];
  /** Aligned 1:1 with `candidates`. Keyed lookup avoids re-querying. */
  payouts: PreparedCandidatePayout[];
}

export interface IssueOfferInput {
  orderId: string;
  attemptId: string;
  riderId: string;
  rank: number;
  score: number;
  distanceMeters: number;
  timeoutSeconds: number;
  isFirstOffer: boolean;
  estimatedPayoutGhs: number | null;
}

export interface IssuedOffer {
  notificationId: string;
  timesOutAt: string;
}

export interface AcceptOfferInput {
  orderId: string;
  attemptId: string;
  notificationId: string;
  riderId: string;
  rank: number;
}

export interface DeclineOfferInput {
  orderId: string;
  attemptId: string;
  notificationId: string;
  riderId: string;
  rank: number;
  declineCapPerDay: number;
}

export interface TimeoutOfferInput {
  orderId: string;
  attemptId: string;
  notificationId: string;
  riderId: string;
  rank: number;
}

export interface FailDispatchInput {
  orderId: string;
  attemptId: string | null;
  reason: string;
}

export interface TransitionOrderStateInput {
  orderId: string;
  newState: OrderState;
}

export interface DispatchWorkflowStatus {
  orderId: string;
  attemptId: string | null;
  outcome: 'InProgress' | 'Succeeded' | 'Failed';
  totalCandidates: number;
  currentRank: number;
  activeNotificationId: string | null;
  startedAt: string;
  completedAt: string | null;
}
