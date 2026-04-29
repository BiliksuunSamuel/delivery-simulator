import { Prop, Schema } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { BaseSchema } from '.';
import { CampaignKind, TriggerType } from 'src/enums/simulator';

@Schema({ collection: 'campaigns' })
export class Campaign extends BaseSchema {
  @Prop({ required: true })
  @ApiProperty()
  name: string;

  @Prop({ default: 'Campaign' })
  @ApiProperty()
  kind: CampaignKind;

  @Prop({ default: '' })
  @ApiProperty()
  description: string;

  @Prop({ default: 'OrdersCompleted' })
  @ApiProperty()
  triggerType: TriggerType;

  @Prop({ default: 0 })
  @ApiProperty()
  threshold: number;

  @Prop({ default: 0 })
  @ApiProperty()
  rewardAmountGhs: number;

  @Prop({ required: true })
  @ApiProperty()
  startDate: Date;

  @Prop({ required: true })
  @ApiProperty()
  endDate: Date;

  @Prop({ default: true })
  @ApiProperty()
  isActive: boolean;

  @Prop({ default: null })
  @ApiProperty()
  targetTierId: string | null;
}
