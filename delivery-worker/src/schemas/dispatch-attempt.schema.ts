import { Prop, Schema } from '@nestjs/mongoose';
import { BaseSchema } from './base.schema';
import type { DispatchOutcome, NotificationStatus } from 'src/enums';

export interface ScoreBreakdown {
  distance: number;
  acceptance: number;
  tier: number;
  load: number;
}

export interface DispatchCandidate {
  riderId: string;
  rank: number;
  score: number;
  distanceMeters: number;
  offerStatus: NotificationStatus;
  respondedAt: Date | null;
  scoreBreakdown?: ScoreBreakdown;
  /** Raw count of accepted orders this rider has in the order's zone. */
  familiarityIndex?: number;
  /** [0,1] proximity component of the combined score. */
  proximityScore?: number;
  /** [0,1] familiarity component of the combined score. */
  familiarityScore?: number;
  /** Final combined score used to sort the candidate list. */
  combinedScore?: number;
}

@Schema({ collection: 'dispatch_attempts' })
export class DispatchAttempt extends BaseSchema {
  @Prop({ required: true })
  orderId: string;

  @Prop({ default: () => new Date() })
  startedAt: Date;

  @Prop({ type: Date, default: null })
  completedAt: Date | null;

  @Prop({ type: String, default: 'InProgress' })
  outcome: DispatchOutcome;

  @Prop({
    type: [
      {
        riderId: { type: String, required: true },
        rank: { type: Number, required: true },
        score: { type: Number, required: true },
        distanceMeters: { type: Number, required: true },
        offerStatus: { type: String, default: 'Pending' },
        respondedAt: { type: Date, default: null },
        scoreBreakdown: {
          type: {
            distance: { type: Number },
            acceptance: { type: Number },
            tier: { type: Number },
            load: { type: Number },
          },
          _id: false,
          default: undefined,
        },
        familiarityIndex: { type: Number, default: 0 },
        proximityScore: { type: Number, default: null },
        familiarityScore: { type: Number, default: null },
        combinedScore: { type: Number, default: null },
      },
    ],
    _id: false,
    default: [],
  })
  candidates: DispatchCandidate[];

  @Prop({ type: String, default: null })
  winningRiderId: string | null;
}
