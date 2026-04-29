import { Prop, Schema } from '@nestjs/mongoose';
import { BaseSchema } from './base.schema';
import type { OrderState } from 'src/enums';

@Schema({ collection: 'orders' })
export class Order extends BaseSchema {
  @Prop({ required: true })
  retailerId: string;

  // Pickup is the seller's location, denormalized at order creation so the
  // dispatch workflow doesn't have to re-resolve the retailer doc.
  @Prop({ required: true })
  pickupLatitude: number;

  @Prop({ required: true })
  pickupLongitude: number;

  @Prop({ required: true })
  dropLatitude: number;

  @Prop({ required: true })
  dropLongitude: number;

  @Prop({ type: String, default: null })
  dropAddress: string | null;

  @Prop({ type: String, default: 'Created' })
  state: OrderState;

  @Prop({ type: String, default: null })
  assignedRiderId: string | null;

  @Prop({ type: Date, default: null })
  dispatchedAt: Date | null;

  @Prop({ type: Date, default: null })
  acceptedAt: Date | null;

  @Prop({ type: Date, default: null })
  arrivedAtPickupAt: Date | null;

  @Prop({ type: Date, default: null })
  arrivedAtDeliveryAt: Date | null;

  @Prop({ type: Date, default: null })
  deliveredAt: Date | null;

  @Prop({ type: Date, default: null })
  cancelledAt: Date | null;

  @Prop({ type: String, default: null })
  zone: string | null;

  @Prop({ type: String, default: null })
  station: string | null;
}
