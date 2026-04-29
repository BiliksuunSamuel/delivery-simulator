import { Prop, Schema } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { BaseSchema } from '.';
import { NotificationStatus } from 'src/enums/simulator';

@Schema({ collection: 'notifications' })
export class Notification extends BaseSchema {
  @Prop({ required: true })
  @ApiProperty()
  orderId: string;

  @Prop({ required: true })
  @ApiProperty()
  riderId: string;

  @Prop({ default: 'Pending' })
  @ApiProperty()
  status: NotificationStatus;

  @Prop({ required: true })
  @ApiProperty()
  offerRank: number;

  @Prop({ required: true })
  @ApiProperty()
  score: number;

  @Prop({ required: true })
  @ApiProperty()
  distanceMeters: number;

  @Prop({ default: () => new Date() })
  @ApiProperty()
  issuedAt: Date;

  @Prop({ required: true })
  @ApiProperty()
  timesOutAt: Date;

  @Prop({ default: null })
  @ApiProperty()
  respondedAt: Date | null;

  // Locked-at-issue payout estimate the rider would earn for accepting this
  // offer right now. Helps the rider decide; doesn't update if they sit on
  // the offer.
  @Prop({ type: Number, default: null })
  @ApiProperty()
  estimatedPayoutGhs: number | null;
}
