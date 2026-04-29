import { Prop, Schema } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { BaseSchema } from '.';

export interface PayoutLineItem {
  description: string;
  amount: number;
}

export interface TierSnapshot {
  id: string;
  name: string;
  basePayoutGhs: number;
  // Stored as a generic shape — the rule structure mirrors Tier.bonusRules
  // but we denormalise here so future tier edits don't rewrite history.
  bonusRules: Array<{
    trigger: string;
    threshold: number;
    mode: string;
    amount: number;
    description?: string | null;
  }>;
}

const PayoutLineItemSchemaShape = {
  description: { type: String, required: true },
  amount: { type: Number, required: true },
};

const TierSnapshotSchemaShape = {
  id: { type: String, required: true },
  name: { type: String, required: true },
  basePayoutGhs: { type: Number, required: true },
  bonusRules: { type: [Object], default: [] },
};

/**
 * One row per delivered order — the simulated payment transaction. Carries a
 * full denormalised tier snapshot + line-item breakdown so the rider page
 * can show the payment audit trail without joins or risk of tier edits
 * rewriting history.
 */
@Schema({ collection: 'rider_payments' })
export class RiderPayment extends BaseSchema {
  @Prop({ required: true, index: true })
  @ApiProperty()
  riderId: string;

  @Prop({ required: true, index: true })
  @ApiProperty()
  orderId: string;

  @Prop({ type: Number, required: true })
  @ApiProperty()
  basePayoutGhs: number;

  @Prop({ type: Number, required: true })
  @ApiProperty()
  totalPayoutGhs: number;

  @Prop({ type: [PayoutLineItemSchemaShape], default: [] })
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  bonusBreakdown: PayoutLineItem[];

  @Prop({ type: TierSnapshotSchemaShape, required: true })
  @ApiProperty({ type: 'object', additionalProperties: true })
  tierSnapshot: TierSnapshot;

  @Prop({ type: Number, default: 0 })
  @ApiProperty()
  todayDeliveredCountAtPayment: number;

  @Prop({ default: () => new Date() })
  @ApiProperty()
  paidAt: Date;
}
