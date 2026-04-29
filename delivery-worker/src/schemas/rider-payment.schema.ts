import { Prop, Schema } from '@nestjs/mongoose';
import { BaseSchema } from './base.schema';

export interface PayoutLineItem {
  description: string;
  amount: number;
}

export interface TierSnapshot {
  id: string;
  name: string;
  basePayoutGhs: number;
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

@Schema({ collection: 'rider_payments' })
export class RiderPayment extends BaseSchema {
  @Prop({ required: true, index: true })
  riderId: string;

  @Prop({ required: true, index: true })
  orderId: string;

  @Prop({ type: Number, required: true })
  basePayoutGhs: number;

  @Prop({ type: Number, required: true })
  totalPayoutGhs: number;

  @Prop({ type: [PayoutLineItemSchemaShape], default: [] })
  bonusBreakdown: PayoutLineItem[];

  @Prop({ type: TierSnapshotSchemaShape, required: true })
  tierSnapshot: TierSnapshot;

  @Prop({ type: Number, default: 0 })
  todayDeliveredCountAtPayment: number;

  @Prop({ default: () => new Date() })
  paidAt: Date;
}
