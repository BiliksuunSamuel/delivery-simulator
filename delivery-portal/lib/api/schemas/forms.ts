import { z } from "zod";
import { CAMPAIGN_KINDS, KYC_STATUSES, RIDER_STATES, TRIGGER_TYPES } from "@/lib/types";

const trimmedString = (min = 1, max = 200) =>
  z
    .string()
    .trim()
    .min(min, "Required")
    .max(max, `Must be ${max} characters or fewer`);

// Ghana phone: international +233 followed by 9 digits (operator + line),
// or local 0 followed by 9 digits.
const ghanaPhone = z
  .string()
  .trim()
  .regex(
    /^(\+233[2-9]\d{8}|0[2-9]\d{8})$/,
    "Use +233XXXXXXXXX or 0XXXXXXXXX (Ghana format)"
  );

const latitude = z
  .number({ message: "Must be a number" })
  .min(-90, "Latitude out of range")
  .max(90, "Latitude out of range");

const longitude = z
  .number({ message: "Must be a number" })
  .min(-180, "Longitude out of range")
  .max(180, "Longitude out of range");

const percent = z
  .number({ message: "Must be a number" })
  .min(0, "0 minimum")
  .max(100, "100 maximum");

const positiveNumber = z
  .number({ message: "Must be a number" })
  .min(0, "Must be ≥ 0");

export const RiderFormSchema = z.object({
  fullName: trimmedString(2, 80),
  phone: ghanaPhone,
  tierId: z.string().min(1, "Pick a tier"),
  state: z.enum(RIDER_STATES),
  isEligible: z.boolean(),
  kycStatus: z.enum(KYC_STATUSES),
  acceptanceRate: percent,
  latitude: latitude,
  longitude: longitude,
  batteryPercent: percent,
  gpsAccuracyMeters: positiveNumber.max(500, "Implausible accuracy"),
});

export type RiderFormValues = z.infer<typeof RiderFormSchema>;

export const RetailerFormSchema = z.object({
  name: trimmedString(2, 80),
  address: trimmedString(2, 200),
  latitude,
  longitude,
  zone: z.string().trim().max(80).optional().or(z.literal("")),
  station: z.string().trim().max(80).optional().or(z.literal("")),
});

export type RetailerFormValues = z.infer<typeof RetailerFormSchema>;

export const OrderFormSchema = z.object({
  retailerId: z.string().min(1, "Pick a retailer"),
  dropLatitude: latitude,
  dropLongitude: longitude,
  dropAddress: z
    .string()
    .trim()
    .max(200, "Must be 200 characters or fewer")
    .optional(),
});

export type OrderFormValues = z.infer<typeof OrderFormSchema>;

export const BonusRuleFormSchema = z.object({
  trigger: z.enum(["on_nth", "every_after_nth"]),
  threshold: z
    .number({ message: "Must be a whole number" })
    .int("Must be a whole number")
    .min(1, "Must be at least 1"),
  mode: z.enum(["percent", "flat"]),
  amount: z
    .number({ message: "Must be a number" })
    .min(0, "Must be 0 or more"),
  description: z.string().trim().max(120).nullable().optional(),
});

export type BonusRuleFormValues = z.infer<typeof BonusRuleFormSchema>;

export const TierFormSchema = z.object({
  name: trimmedString(2, 40),
  description: trimmedString(0, 200).optional().or(z.literal("")),
  colorHex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex like #1FA39B"),
  basePayoutGhs: z
    .number({ message: "Must be a number" })
    .min(0, "Must be 0 or more")
    .max(1000, "That's a very generous tier"),
  bonusRules: z.array(BonusRuleFormSchema),
});

export type TierFormValues = z.infer<typeof TierFormSchema>;

export const CampaignFormSchema = z
  .object({
    name: trimmedString(2, 80),
    description: z
      .string()
      .trim()
      .max(300, "Must be 300 characters or fewer"),
    kind: z.enum(CAMPAIGN_KINDS),
    triggerType: z.enum(TRIGGER_TYPES),
    threshold: positiveNumber,
    rewardAmountGhs: positiveNumber,
    startDate: z.string().min(1, "Pick a start date"),
    endDate: z.string().min(1, "Pick an end date"),
    isActive: z.boolean(),
    targetTierId: z.string().nullable(),
  })
  .refine(
    (v) => new Date(v.endDate).getTime() >= new Date(v.startDate).getTime(),
    { message: "End date must be on or after start date", path: ["endDate"] }
  );

export type CampaignFormValues = z.infer<typeof CampaignFormSchema>;
