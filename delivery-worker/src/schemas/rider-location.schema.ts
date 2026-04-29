import { Prop, Schema } from '@nestjs/mongoose';
import { BaseSchema } from './base.schema';

/**
 * Rolling location for a single rider — one document per rider, looked up by
 * `riderId`. Kept separate from the Rider profile so a periodic location-update
 * job (mimicking GPS pings) doesn't churn the main rider doc.
 */
@Schema({ collection: 'rider_locations' })
export class RiderLocation extends BaseSchema {
  @Prop({ required: true, unique: true, index: true })
  riderId: string;

  @Prop({ required: true })
  latitude: number;

  @Prop({ required: true })
  longitude: number;

  @Prop({ default: 100 })
  batteryPercent: number;

  @Prop({ default: 10 })
  gpsAccuracyMeters: number;

  @Prop({ default: () => new Date() })
  lastUpdatedAt: Date;
}
