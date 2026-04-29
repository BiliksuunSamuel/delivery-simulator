import { z } from "zod";
import {
  RIDER_STATES,
  ORDER_STATES,
  NOTIFICATION_STATUSES,
  DISPATCH_OUTCOMES,
  CAMPAIGN_KINDS,
  TRIGGER_TYPES,
  SYSTEM_EVENT_TYPES,
  KYC_STATUSES,
} from "@/lib/types";

const baseEntity = {
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
};

export const RetailerSchema = z.object({
  ...baseEntity,
  name: z.string().min(1),
  address: z.string(),
  latitude: z.number(),
  longitude: z.number(),
});

export const BonusRuleSchema = z.object({
  trigger: z.enum(["on_nth", "every_after_nth"]),
  threshold: z.number().int().min(1),
  mode: z.enum(["percent", "flat"]),
  amount: z.number().min(0),
  description: z.string().nullable().optional(),
});

export const TierSchema = z.object({
  ...baseEntity,
  name: z.string().min(1),
  description: z.string(),
  colorHex: z.string(),
  basePayoutGhs: z.number().min(0),
  bonusRules: z.array(BonusRuleSchema),
});

export const RiderLocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  batteryPercent: z.number().min(0).max(100),
  gpsAccuracyMeters: z.number().min(0),
  lastUpdatedAt: z.string(),
});

export const RiderSchema = z.object({
  ...baseEntity,
  fullName: z.string().min(1),
  phone: z.string(),
  photoUrl: z.string().nullable(),
  tierId: z.string(),
  state: z.enum(RIDER_STATES),
  isEligible: z.boolean(),
  ineligibilityReason: z.string().nullable(),
  acceptanceRate: z.number().min(0).max(100),
  declinesToday: z.number().min(0),
  currentLoad: z.number().min(0),
  kycStatus: z.enum(KYC_STATUSES),
  location: RiderLocationSchema,
});

export const OrderSchema = z.object({
  ...baseEntity,
  retailerId: z.string(),
  dropLatitude: z.number(),
  dropLongitude: z.number(),
  dropAddress: z.string().nullable(),
  state: z.enum(ORDER_STATES),
  assignedRiderId: z.string().nullable(),
  dispatchedAt: z.string().nullable(),
  assignedAt: z.string().nullable(),
  pickedUpAt: z.string().nullable(),
  deliveredAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
});

export const NotificationSchema = z.object({
  ...baseEntity,
  orderId: z.string(),
  riderId: z.string(),
  status: z.enum(NOTIFICATION_STATUSES),
  offerRank: z.number().int().min(1),
  score: z.number(),
  distanceMeters: z.number().min(0),
  issuedAt: z.string(),
  timesOutAt: z.string(),
  respondedAt: z.string().nullable(),
});

export const DispatchCandidateSchema = z.object({
  riderId: z.string(),
  rank: z.number().int().min(1),
  score: z.number(),
  distanceMeters: z.number().min(0),
  offerStatus: z.enum(NOTIFICATION_STATUSES),
  respondedAt: z.string().nullable(),
  scoreBreakdown: z
    .object({
      distance: z.number(),
      acceptance: z.number(),
      tier: z.number(),
      load: z.number(),
    })
    .optional(),
});

export const DispatchAttemptSchema = z.object({
  ...baseEntity,
  orderId: z.string(),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  outcome: z.enum(DISPATCH_OUTCOMES),
  candidates: z.array(DispatchCandidateSchema),
  winningRiderId: z.string().nullable(),
});

export const CampaignSchema = z.object({
  ...baseEntity,
  name: z.string().min(1),
  kind: z.enum(CAMPAIGN_KINDS),
  description: z.string(),
  triggerType: z.enum(TRIGGER_TYPES),
  threshold: z.number().min(0),
  rewardAmountGhs: z.number().min(0),
  startDate: z.string(),
  endDate: z.string(),
  isActive: z.boolean(),
  targetTierId: z.string().nullable(),
});

export const SystemEventSchema = z.object({
  ...baseEntity,
  type: z.enum(SYSTEM_EVENT_TYPES),
  timestamp: z.string(),
  summary: z.string(),
  details: z.record(z.string(), z.unknown()),
});

export const ScoringWeightsSchema = z
  .object({
    distance: z.number().min(0).max(1),
    acceptance: z.number().min(0).max(1),
    tier: z.number().min(0).max(1),
    load: z.number().min(0).max(1),
  })
  .refine(
    (w) => Math.abs(w.distance + w.acceptance + w.tier + w.load - 1) < 0.001,
    { message: "Scoring weights must sum to 1.0" }
  );

export const ConfigSchema = z.object({
  batteryThresholdPercent: z.number().min(0).max(100),
  gpsAccuracyThresholdMeters: z.number().min(0),
  declineCapPerDay: z.number().int().min(0),
  offerTimeoutSeconds: z.number().int().min(1),
  maxCandidatesPerDispatch: z.number().int().min(1),
  proximityRadiusMeters: z.number().min(0),
  scoringWeights: ScoringWeightsSchema,
});

export const CreateRetailerSchema = RetailerSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const UpdateRetailerSchema = CreateRetailerSchema.partial();

export const CreateRiderSchema = RiderSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial({
  declinesToday: true,
  currentLoad: true,
  ineligibilityReason: true,
  photoUrl: true,
});
export const UpdateRiderSchema = RiderSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export const UpdateRiderLocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  batteryPercent: z.number().min(0).max(100),
  gpsAccuracyMeters: z.number().min(0),
});

export const RiderStateTransitionSchema = z.object({
  newState: z.enum(RIDER_STATES),
  reason: z.string().optional(),
});

export const RiderEligibilityOverrideSchema = z.object({
  isEligible: z.boolean(),
  reason: z.string(),
});

export const CreateOrderSchema = z.object({
  retailerId: z.string(),
  dropLatitude: z.number(),
  dropLongitude: z.number(),
  dropAddress: z.string().nullable().optional(),
});

export const OrderStateTransitionSchema = z.object({
  newState: z.enum(ORDER_STATES),
});

export const NotificationRespondSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

export const CreateTierSchema = TierSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const UpdateTierSchema = CreateTierSchema.partial();

export const CreateCampaignSchema = CampaignSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const UpdateCampaignSchema = CreateCampaignSchema.partial();
