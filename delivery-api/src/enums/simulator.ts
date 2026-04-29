export const RIDER_STATES = [
  'Offline',
  'OnlineIdle',
  'OnlineAssigned',
  'OnPickup',
  'OnDelivery',
  'OnBreak',
  'Suspended',
] as const;
export type RiderState = (typeof RIDER_STATES)[number];

export const KYC_STATUSES = ['Pending', 'Approved', 'Rejected'] as const;
export type KycStatus = (typeof KYC_STATUSES)[number];

export const ORDER_STATES = [
  'Created',
  'PendingRiderAccept',
  'RiderAccepted',
  'ArriveAtPickup',
  'ArriveAtDelivery',
  'Delivered',
  'Cancelled',
  'FailedToDispatch',
] as const;
export type OrderState = (typeof ORDER_STATES)[number];

export const NOTIFICATION_STATUSES = [
  'Pending',
  'Accepted',
  'Declined',
  'TimedOut',
  'Revoked',
] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export const RIDER_PERFORMANCE_STATUSES = [
  'Accepted',
  'Declined',
  'TimedOut',
] as const;
export type RiderPerformanceStatus = (typeof RIDER_PERFORMANCE_STATUSES)[number];

export const DISPATCH_OUTCOMES = ['Succeeded', 'Failed', 'InProgress'] as const;
export type DispatchOutcome = (typeof DISPATCH_OUTCOMES)[number];

export const CAMPAIGN_KINDS = ['Promotion', 'Campaign'] as const;
export type CampaignKind = (typeof CAMPAIGN_KINDS)[number];

export const TRIGGER_TYPES = [
  'OrdersCompleted',
  'DistanceTraveled',
  'AcceptanceRate',
] as const;
export type TriggerType = (typeof TRIGGER_TYPES)[number];

// ----- Temporal workflow plumbing (must match delivery-worker) -----

export const DISPATCH_TASK_QUEUE = 'DISPATCH_TASK_QUEUE';
export const DISPATCH_ORDER_WORKFLOW_NAME = 'DispatchOrderWorkflow';

export enum DispatchWorkflowSignals {
  RESPOND_TO_OFFER = 'respondToOffer',
}

export enum DispatchWorkflowQueries {
  STATUS = 'status',
}

export const SYSTEM_EVENT_TYPES = [
  'RiderEligibilityChanged',
  'RiderStateChanged',
  'OrderCreated',
  'OrderStateChanged',
  'OfferIssued',
  'OfferAccepted',
  'OfferDeclined',
  'OfferTimedOut',
  'DispatchSucceeded',
  'DispatchFailed',
  'BatteryThresholdCrossed',
  'ConfigUpdated',
  'PaymentRecorded',
] as const;
export type SystemEventType = (typeof SYSTEM_EVENT_TYPES)[number];
