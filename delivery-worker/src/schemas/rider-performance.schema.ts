import { Prop, Schema } from '@nestjs/mongoose';
import { BaseSchema } from './base.schema';
import type { RiderPerformanceStatus } from 'src/enums';

/**
 * Append-only audit log of every rider response to an offer — one document
 * per (rider, order, response). Powers leaderboards, on-time metrics, and
 * "why was this rider skipped" debugging.
 */
@Schema({ collection: 'rider_performances' })
export class RiderPerformance extends BaseSchema {
  @Prop({ required: true, index: true })
  riderId: string;

  @Prop({ required: true, index: true })
  orderId: string;

  @Prop({ type: String, required: true })
  status: RiderPerformanceStatus;

  @Prop({ type: String, default: null })
  notes: string | null;

  @Prop({ default: () => new Date() })
  timestamp: Date;

  @Prop({ type: Number, default: null })
  retailerLatitude: number | null;

  @Prop({ type: Number, default: null })
  retailerLongitude: number | null;

  @Prop({ type: Number, default: null })
  riderLatitude: number | null;

  @Prop({ type: Number, default: null })
  riderLongitude: number | null;

  @Prop({ type: Date, default: null })
  pickedUpAt: Date | null;

  @Prop({ type: Date, default: null })
  deliveredAt: Date | null;

  @Prop({ type: Date, default: null })
  cancelledAt: Date | null;

  @Prop({ type: Number, default: null })
  payoutAmountGhs: number | null;

  @Prop({ type: String, default: null })
  tierIdSnapshot: string | null;

  @Prop({ type: String, default: null })
  tierNameSnapshot: string | null;

  @Prop({ type: String, default: null })
  zoneSnapshot: string | null;

  @Prop({ type: String, default: null })
  stationSnapshot: string | null;
}
