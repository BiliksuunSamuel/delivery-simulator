import { Prop, Schema } from '@nestjs/mongoose';
import { BaseSchema } from './base.schema';
import type { NotificationStatus } from 'src/enums';

@Schema({ collection: 'notifications' })
export class Notification extends BaseSchema {
  @Prop({ required: true })
  orderId: string;

  @Prop({ required: true })
  riderId: string;

  @Prop({ type: String, default: 'Pending' })
  status: NotificationStatus;

  @Prop({ required: true })
  offerRank: number;

  @Prop({ required: true })
  score: number;

  @Prop({ required: true })
  distanceMeters: number;

  @Prop({ default: () => new Date() })
  issuedAt: Date;

  @Prop({ required: true })
  timesOutAt: Date;

  @Prop({ type: Date, default: null })
  respondedAt: Date | null;

  @Prop({ type: Number, default: null })
  estimatedPayoutGhs: number | null;
}
