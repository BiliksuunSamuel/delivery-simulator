export type Id = string;
export type IsoDate = string;

export interface BaseEntity {
  id: Id;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

export interface Retailer extends BaseEntity {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  zone: string | null;
  station: string | null;
}

export const BONUS_RULE_TRIGGERS = ["on_nth", "every_after_nth"] as const;
export type BonusRuleTrigger = (typeof BONUS_RULE_TRIGGERS)[number];
export const BONUS_RULE_MODES = ["percent", "flat"] as const;
export type BonusRuleMode = (typeof BONUS_RULE_MODES)[number];

export interface BonusRule {
  trigger: BonusRuleTrigger;
  threshold: number;
  mode: BonusRuleMode;
  amount: number;
  description?: string | null;
}

export interface Tier extends BaseEntity {
  name: string;
  description: string;
  colorHex: string;
  basePayoutGhs: number;
  bonusRules: BonusRule[];
}

export const RIDER_STATES = [
  "Offline",
  "OnlineIdle",
  "OnlineAssigned",
  "OnPickup",
  "OnDelivery",
  "OnBreak",
  "Suspended",
] as const;
export type RiderState = (typeof RIDER_STATES)[number];

export const KYC_STATUSES = ["Pending", "Approved", "Rejected"] as const;
export type KycStatus = (typeof KYC_STATUSES)[number];

export interface Rider extends BaseEntity {
  fullName: string;
  phone: string;
  photoUrl: string | null;
  tierId: Id;
  state: RiderState;
  isEligible: boolean;
  ineligibilityReason: string | null;
  acceptanceRate: number;
  declinesToday: number;
  currentLoad: number;
  kycStatus: KycStatus;
}

export const ORDER_STATES = [
  "Created",
  "PendingRiderAccept",
  "RiderAccepted",
  "ArriveAtPickup",
  "ArriveAtDelivery",
  "Delivered",
  "Cancelled",
  "FailedToDispatch",
] as const;
export type OrderState = (typeof ORDER_STATES)[number];

export interface Order extends BaseEntity {
  retailerId: Id;
  pickupLatitude: number;
  pickupLongitude: number;
  dropLatitude: number;
  dropLongitude: number;
  dropAddress: string | null;
  state: OrderState;
  assignedRiderId: Id | null;
  dispatchedAt: IsoDate | null;
  acceptedAt: IsoDate | null;
  arrivedAtPickupAt: IsoDate | null;
  arrivedAtDeliveryAt: IsoDate | null;
  deliveredAt: IsoDate | null;
  cancelledAt: IsoDate | null;
  zone: string | null;
  station: string | null;
}

export interface RiderLocation {
  riderId: Id;
  latitude: number;
  longitude: number;
  batteryPercent: number;
  gpsAccuracyMeters: number;
  lastUpdatedAt: IsoDate;
}

export const RIDER_PERFORMANCE_STATUSES = [
  'Accepted',
  'Declined',
  'TimedOut',
] as const;
export type RiderPerformanceStatus = (typeof RIDER_PERFORMANCE_STATUSES)[number];

export interface RiderPerformance extends BaseEntity {
  riderId: Id;
  orderId: Id;
  status: RiderPerformanceStatus;
  notes: string | null;
  timestamp: IsoDate;
  retailerLatitude: number | null;
  retailerLongitude: number | null;
  riderLatitude: number | null;
  riderLongitude: number | null;
  pickedUpAt: IsoDate | null;
  deliveredAt: IsoDate | null;
  cancelledAt: IsoDate | null;
  payoutAmountGhs: number | null;
  tierIdSnapshot: Id | null;
  tierNameSnapshot: string | null;
  zoneSnapshot: string | null;
  stationSnapshot: string | null;
}

export interface PayoutLineItem {
  description: string;
  amount: number;
}

export interface TierSnapshot {
  id: Id;
  name: string;
  basePayoutGhs: number;
  bonusRules: BonusRule[];
}

export interface RiderPayment extends BaseEntity {
  riderId: Id;
  orderId: Id;
  basePayoutGhs: number;
  totalPayoutGhs: number;
  bonusBreakdown: PayoutLineItem[];
  tierSnapshot: TierSnapshot;
  todayDeliveredCountAtPayment: number;
  paidAt: IsoDate;
}

export interface PagedRiderPayment {
  items: RiderPayment[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PagedRiderPerformance {
  items: RiderPerformance[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RiderPerformanceSummaryBucket {
  accepted: number;
  declined: number;
  timedOut: number;
  delivered: number;
  cancelled: number;
}

export interface RiderPerformanceSummary {
  today: RiderPerformanceSummaryBucket;
  yesterday: RiderPerformanceSummaryBucket;
  lastMonth: RiderPerformanceSummaryBucket;
  total: RiderPerformanceSummaryBucket;
}

export const NOTIFICATION_STATUSES = [
  "Pending",
  "Accepted",
  "Declined",
  "TimedOut",
  "Revoked",
] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export interface Notification extends BaseEntity {
  orderId: Id;
  riderId: Id;
  status: NotificationStatus;
  offerRank: number;
  score: number;
  distanceMeters: number;
  issuedAt: IsoDate;
  timesOutAt: IsoDate;
  respondedAt: IsoDate | null;
  estimatedPayoutGhs: number | null;
}

export interface DispatchCandidate {
  riderId: Id;
  rank: number;
  score: number;
  distanceMeters: number;
  offerStatus: NotificationStatus;
  respondedAt: IsoDate | null;
  scoreBreakdown?: {
    distance: number;
    acceptance: number;
    tier: number;
    load: number;
  };
  familiarityIndex?: number;
  proximityScore?: number;
  familiarityScore?: number;
  combinedScore?: number;
}

export const DISPATCH_OUTCOMES = ["Succeeded", "Failed", "InProgress"] as const;
export type DispatchOutcome = (typeof DISPATCH_OUTCOMES)[number];

export interface DispatchAttempt extends BaseEntity {
  orderId: Id;
  startedAt: IsoDate;
  completedAt: IsoDate | null;
  outcome: DispatchOutcome;
  candidates: DispatchCandidate[];
  winningRiderId: Id | null;
}

export const CAMPAIGN_KINDS = ["Promotion", "Campaign"] as const;
export type CampaignKind = (typeof CAMPAIGN_KINDS)[number];

export const TRIGGER_TYPES = [
  "OrdersCompleted",
  "DistanceTraveled",
  "AcceptanceRate",
] as const;
export type TriggerType = (typeof TRIGGER_TYPES)[number];

export interface Campaign extends BaseEntity {
  name: string;
  kind: CampaignKind;
  description: string;
  triggerType: TriggerType;
  threshold: number;
  rewardAmountGhs: number;
  startDate: IsoDate;
  endDate: IsoDate;
  isActive: boolean;
  targetTierId: Id | null;
}

export const SYSTEM_EVENT_TYPES = [
  "RiderEligibilityChanged",
  "RiderStateChanged",
  "OrderCreated",
  "OrderStateChanged",
  "OfferIssued",
  "OfferAccepted",
  "OfferDeclined",
  "OfferTimedOut",
  "DispatchSucceeded",
  "DispatchFailed",
  "BatteryThresholdCrossed",
  "ConfigUpdated",
  "PaymentRecorded",
] as const;
export type SystemEventType = (typeof SYSTEM_EVENT_TYPES)[number];

export interface SystemEvent extends BaseEntity {
  type: SystemEventType;
  timestamp: IsoDate;
  summary: string;
  details: Record<string, unknown>;
}

export interface Config {
  batteryThresholdPercent: number;
  gpsAccuracyThresholdMeters: number;
  declineCapPerDay: number;
  offerTimeoutSeconds: number;
  maxCandidatesPerDispatch: number;
  proximityRadiusMeters: number;
  arriveAtPickupDelaySeconds: number;
  arriveAtDeliveryDelaySeconds: number;
  confirmDeliveryDelaySeconds: number;
  proximityWeight: number;
  familiarityWeight: number;
}

export type RiderFilters = {
  state?: RiderState | RiderState[];
  tierId?: Id;
  isEligible?: boolean;
};

export type OrderFilters = {
  state?: OrderState | OrderState[];
  retailerId?: Id;
};

export type NotificationFilters = {
  riderId?: Id;
  orderId?: Id;
  status?: NotificationStatus | NotificationStatus[];
};
