import { Prop, Schema } from '@nestjs/mongoose';
import { BaseSchema } from './base.schema';
import type { CampaignKind, TriggerType } from 'src/enums';

@Schema({ collection: 'campaigns' })
export class Campaign extends BaseSchema {
  @Prop({ required: true })
  name: string;

  @Prop({ type: String, default: 'Campaign' })
  kind: CampaignKind;

  @Prop({ default: '' })
  description: string;

  @Prop({ type: String, default: 'OrdersCompleted' })
  triggerType: TriggerType;

  @Prop({ default: 0 })
  threshold: number;

  @Prop({ default: 0 })
  rewardAmountGhs: number;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: String, default: null })
  targetTierId: string | null;
}
