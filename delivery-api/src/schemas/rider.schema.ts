import { Prop, Schema } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { BaseSchema } from '.';
import { KycStatus, RiderState } from 'src/enums/simulator';

@Schema({ collection: 'riders' })
export class Rider extends BaseSchema {
  @Prop({ required: true })
  @ApiProperty()
  fullName: string;

  @Prop({ default: '' })
  @ApiProperty()
  phone: string;

  @Prop({ default: null })
  @ApiProperty()
  photoUrl: string | null;

  @Prop({ required: true })
  @ApiProperty()
  tierId: string;

  @Prop({ default: 'Offline' })
  @ApiProperty()
  state: RiderState;

  @Prop({ default: false })
  @ApiProperty()
  isEligible: boolean;

  @Prop({ default: null })
  @ApiProperty()
  ineligibilityReason: string | null;

  @Prop({ default: 80 })
  @ApiProperty()
  acceptanceRate: number;

  @Prop({ default: 0 })
  @ApiProperty()
  declinesToday: number;

  @Prop({ default: 0 })
  @ApiProperty()
  currentLoad: number;

  @Prop({ default: 'Pending' })
  @ApiProperty()
  kycStatus: KycStatus;
}
