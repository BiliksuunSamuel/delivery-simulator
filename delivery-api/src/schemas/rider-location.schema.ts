import { Prop, Schema } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { BaseSchema } from '.';

/**
 * Rolling location for a single rider — one document per rider, looked up by
 * `riderId`. Kept separate from the Rider profile so a periodic location-update
 * job (mimicking GPS pings) doesn't churn the main rider doc.
 */
@Schema({ collection: 'rider_locations' })
export class RiderLocation extends BaseSchema {
  @Prop({ required: true, unique: true, index: true })
  @ApiProperty()
  riderId: string;

  @Prop({ required: true })
  @ApiProperty()
  latitude: number;

  @Prop({ required: true })
  @ApiProperty()
  longitude: number;

  @Prop({ default: 100 })
  @ApiProperty()
  batteryPercent: number;

  @Prop({ default: 10 })
  @ApiProperty()
  gpsAccuracyMeters: number;

  @Prop({ default: () => new Date() })
  @ApiProperty()
  lastUpdatedAt: Date;
}
