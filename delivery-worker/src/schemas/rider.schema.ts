import { Prop, Schema } from '@nestjs/mongoose';
import { BaseSchema } from './base.schema';
import type { KycStatus, RiderState } from 'src/enums';

@Schema({ collection: 'riders' })
export class Rider extends BaseSchema {
  @Prop({ required: true })
  fullName: string;

  @Prop({ default: '' })
  phone: string;

  @Prop({ type: String, default: null })
  photoUrl: string | null;

  @Prop({ required: true })
  tierId: string;

  @Prop({ type: String, default: 'Offline' })
  state: RiderState;

  @Prop({ default: false })
  isEligible: boolean;

  @Prop({ type: String, default: null })
  ineligibilityReason: string | null;

  @Prop({ default: 80 })
  acceptanceRate: number;

  @Prop({ default: 0 })
  declinesToday: number;

  @Prop({ default: 0 })
  currentLoad: number;

  @Prop({ type: String, default: 'Pending' })
  kycStatus: KycStatus;
}
