import { Prop, Schema } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { BaseSchema } from '.';

/**
 * Singleton-style document holding the simulator's tunable parameters.
 * The repository ensures exactly one row exists at any time.
 */
@Schema({ collection: 'sim_config' })
export class SimConfig extends BaseSchema {
  @Prop({ default: 15 })
  @ApiProperty()
  batteryThresholdPercent: number;

  @Prop({ default: 50 })
  @ApiProperty()
  gpsAccuracyThresholdMeters: number;

  @Prop({ default: 3 })
  @ApiProperty()
  declineCapPerDay: number;

  /** How long a single offer stays open before auto-declining and moving on. */
  @Prop({ default: 15 })
  @ApiProperty()
  offerTimeoutSeconds: number;

  /** Top-N closest on-duty riders the workflow notifies sequentially. */
  @Prop({ default: 5 })
  @ApiProperty()
  maxCandidatesPerDispatch: number;

  @Prop({ default: 5000 })
  @ApiProperty()
  proximityRadiusMeters: number;

  // Auto-progress timings after the rider accepts. These let the workflow
  // simulate the delivery lifecycle without real GPS / pickup confirmations.

  @Prop({ default: 8 })
  @ApiProperty()
  arriveAtPickupDelaySeconds: number;

  @Prop({ default: 10 })
  @ApiProperty()
  arriveAtDeliveryDelaySeconds: number;

  @Prop({ default: 5 })
  @ApiProperty()
  confirmDeliveryDelaySeconds: number;

  // Combined-score weights used by `prepareDispatch` to re-rank candidates
  // after the proximity short-list. Final score per rider is
  //   proximityWeight * proximityScore + familiarityWeight * familiarityScore
  // where each component is normalised to [0, 1].
  @Prop({ default: 0.7 })
  @ApiProperty()
  proximityWeight: number;

  @Prop({ default: 0.3 })
  @ApiProperty()
  familiarityWeight: number;
}
