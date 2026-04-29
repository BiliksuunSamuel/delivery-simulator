import type { OrderState, RiderState } from "@/lib/types";

const RIDER_TRANSITIONS: Record<RiderState, RiderState[]> = {
  Offline: ["OnlineIdle", "Suspended"],
  OnlineIdle: ["Offline", "OnBreak", "OnlineAssigned", "Suspended"],
  OnlineAssigned: ["OnPickup", "OnlineIdle", "Suspended"],
  OnPickup: ["OnDelivery", "OnlineIdle", "Suspended"],
  OnDelivery: ["OnlineIdle", "Suspended"],
  OnBreak: ["OnlineIdle", "Offline"],
  Suspended: ["Offline", "OnlineIdle"],
};

const ORDER_TRANSITIONS: Record<OrderState, OrderState[]> = {
  Created: ["PendingRiderAccept", "Cancelled"],
  PendingRiderAccept: ["RiderAccepted", "FailedToDispatch", "Cancelled"],
  RiderAccepted: ["ArriveAtPickup", "Cancelled"],
  ArriveAtPickup: ["ArriveAtDelivery", "Cancelled"],
  ArriveAtDelivery: ["Delivered", "Cancelled"],
  Delivered: [],
  Cancelled: [],
  FailedToDispatch: ["PendingRiderAccept", "Cancelled"],
};

export const validRiderTransitions = (state: RiderState): RiderState[] =>
  RIDER_TRANSITIONS[state] ?? [];
export const validOrderTransitions = (state: OrderState): OrderState[] =>
  ORDER_TRANSITIONS[state] ?? [];

export const canTransitionRider = (
  from: RiderState,
  to: RiderState
): boolean => validRiderTransitions(from).includes(to);

export const canTransitionOrder = (
  from: OrderState,
  to: OrderState
): boolean => validOrderTransitions(from).includes(to);
