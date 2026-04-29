import { Prop, Schema } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { BaseSchema } from '.';
import { OrderState } from 'src/enums/simulator';

@Schema({ collection: 'orders' })
export class Order extends BaseSchema {
  @Prop({ required: true })
  @ApiProperty()
  retailerId: string;

  @Prop({ required: true })
  @ApiProperty()
  pickupLatitude: number;

  @Prop({ required: true })
  @ApiProperty()
  pickupLongitude: number;

  @Prop({ required: true })
  @ApiProperty()
  dropLatitude: number;

  @Prop({ required: true })
  @ApiProperty()
  dropLongitude: number;

  @Prop({ default: null })
  @ApiProperty()
  dropAddress: string | null;

  @Prop({ default: 'Created' })
  @ApiProperty()
  state: OrderState;

  @Prop({ default: null })
  @ApiProperty()
  assignedRiderId: string | null;

  @Prop({ default: null })
  @ApiProperty()
  dispatchedAt: Date | null;

  @Prop({ default: null })
  @ApiProperty()
  acceptedAt: Date | null;

  @Prop({ default: null })
  @ApiProperty()
  arrivedAtPickupAt: Date | null;

  @Prop({ default: null })
  @ApiProperty()
  arrivedAtDeliveryAt: Date | null;

  @Prop({ default: null })
  @ApiProperty()
  deliveredAt: Date | null;

  @Prop({ default: null })
  @ApiProperty()
  cancelledAt: Date | null;

  // Copied from the originating retailer at order-creation time. Frozen so
  // the order's operational geography doesn't shift if the retailer is
  // later moved between zones/stations.
  @Prop({ type: String, default: null })
  @ApiProperty()
  zone: string | null;

  @Prop({ type: String, default: null })
  @ApiProperty()
  station: string | null;
}
