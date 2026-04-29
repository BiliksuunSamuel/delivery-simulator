import { Prop, Schema } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { BaseSchema } from '.';
import { RiderPerformanceStatus } from 'src/enums/simulator';

/**
 * Append-only audit log of every rider response to an offer — one document
 * per (rider, order, response). Powers leaderboards, on-time metrics, and
 * "why was this rider skipped" debugging.
 */
@Schema({ collection: 'rider_performances' })
export class RiderPerformance extends BaseSchema {
  @Prop({ required: true, index: true })
  @ApiProperty()
  riderId: string;

  @Prop({ required: true, index: true })
  @ApiProperty()
  orderId: string;

  @Prop({ type: String, required: true })
  @ApiProperty()
  status: RiderPerformanceStatus;

  @Prop({ type: String, default: null })
  @ApiProperty()
  notes: string | null;

  @Prop({ default: () => new Date() })
  @ApiProperty()
  timestamp: Date;

  @Prop({ type: Number, default: null })
  @ApiProperty()
  retailerLatitude: number | null;

  @Prop({ type: Number, default: null })
  @ApiProperty()
  retailerLongitude: number | null;

  @Prop({ type: Number, default: null })
  @ApiProperty()
  riderLatitude: number | null;

  @Prop({ type: Number, default: null })
  @ApiProperty()
  riderLongitude: number | null;

  @Prop({ type: Date, default: null })
  @ApiProperty()
  pickedUpAt: Date | null;

  @Prop({ type: Date, default: null })
  @ApiProperty()
  deliveredAt: Date | null;

  @Prop({ type: Date, default: null })
  @ApiProperty()
  cancelledAt: Date | null;

  // Payout snapshot — total the rider would earn (or earned, on Delivered)
  // for this order. Captured at offer time from the rider's tier so future
  // tier edits don't rewrite history. Detailed breakdown lives on the
  // RiderPayment document looked up by (riderId, orderId).
  @Prop({ type: Number, default: null })
  @ApiProperty()
  payoutAmountGhs: number | null;

  @Prop({ type: String, default: null })
  @ApiProperty()
  tierIdSnapshot: string | null;

  @Prop({ type: String, default: null })
  @ApiProperty()
  tierNameSnapshot: string | null;

  // Operational geography of the order at decision time. Stamped on accept,
  // decline, and timeout so we can later filter performance records by
  // station / zone for routing analytics.
  @Prop({ type: String, default: null })
  @ApiProperty()
  zoneSnapshot: string | null;

  @Prop({ type: String, default: null })
  @ApiProperty()
  stationSnapshot: string | null;
}
