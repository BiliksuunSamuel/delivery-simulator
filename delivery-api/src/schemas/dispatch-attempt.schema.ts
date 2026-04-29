import { Prop, Schema } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { BaseSchema } from '.';
import {
  DispatchOutcome,
  NotificationStatus,
} from 'src/enums/simulator';

export interface DispatchCandidate {
  riderId: string;
  rank: number;
  score: number;
  distanceMeters: number;
  offerStatus: NotificationStatus;
  respondedAt: Date | null;
  scoreBreakdown?: {
    distance: number;
    acceptance: number;
    tier: number;
    load: number;
  };
}

@Schema({ collection: 'dispatch_attempts' })
export class DispatchAttempt extends BaseSchema {
  @Prop({ required: true })
  @ApiProperty()
  orderId: string;

  @Prop({ default: () => new Date() })
  @ApiProperty()
  startedAt: Date;

  @Prop({ default: null })
  @ApiProperty()
  completedAt: Date | null;

  @Prop({ default: 'InProgress' })
  @ApiProperty()
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
      },
    ],
    _id: false,
    default: [],
  })
  @ApiProperty()
  candidates: DispatchCandidate[];

  @Prop({ default: null })
  @ApiProperty()
  winningRiderId: string | null;
}
