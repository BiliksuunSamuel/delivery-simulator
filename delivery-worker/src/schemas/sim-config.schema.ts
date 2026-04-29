import { Prop, Schema } from '@nestjs/mongoose';
import { BaseSchema } from './base.schema';

@Schema({ collection: 'sim_config' })
export class SimConfig extends BaseSchema {
  @Prop({ default: 15 })
  batteryThresholdPercent: number;

  @Prop({ default: 50 })
  gpsAccuracyThresholdMeters: number;

  @Prop({ default: 3 })
  declineCapPerDay: number;

  /** How long a single offer stays open before auto-declining and moving on. */
  @Prop({ default: 15 })
  offerTimeoutSeconds: number;

  /** Top-N closest on-duty riders the workflow notifies sequentially. */
  @Prop({ default: 5 })
  maxCandidatesPerDispatch: number;

  @Prop({ default: 5000 })
  proximityRadiusMeters: number;

  // Auto-progress timings after the rider accepts. These let the workflow
  // simulate the delivery lifecycle without real GPS / pickup confirmations.

  /** Delay between RiderAccepted and ArriveAtPickup. */
  @Prop({ default: 8 })
  arriveAtPickupDelaySeconds: number;

  /** Delay between ArriveAtPickup and ArriveAtDelivery. */
  @Prop({ default: 10 })
  arriveAtDeliveryDelaySeconds: number;

  /** Delay between ArriveAtDelivery and Delivered. */
  @Prop({ default: 5 })
  confirmDeliveryDelaySeconds: number;

  // Combined-score weights — see API SimConfig schema for full notes.
  @Prop({ default: 0.7 })
  proximityWeight: number;

  @Prop({ default: 0.3 })
  familiarityWeight: number;
}
