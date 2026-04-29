import { Prop, Schema } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { BaseSchema } from '.';

export type BonusRuleTrigger = 'on_nth' | 'every_after_nth';
export type BonusRuleMode = 'percent' | 'flat';

export interface BonusRule {
  trigger: BonusRuleTrigger;
  threshold: number;
  mode: BonusRuleMode;
  amount: number;
  description?: string | null;
}

const BonusRuleSchemaShape = {
  trigger: {
    type: String,
    enum: ['on_nth', 'every_after_nth'],
    required: true,
  },
  threshold: { type: Number, required: true },
  mode: { type: String, enum: ['percent', 'flat'], required: true },
  amount: { type: Number, required: true },
  description: { type: String, default: null },
};

@Schema({ collection: 'tiers' })
export class Tier extends BaseSchema {
  @Prop({ required: true })
  @ApiProperty()
  name: string;

  @Prop({ default: '' })
  @ApiProperty()
  description: string;

  @Prop({ default: '#1FA39B' })
  @ApiProperty()
  colorHex: string;

  // Tiers double as the rider payout policy: every delivery earns the base,
  // and each bonusRule the rider's todays-delivered count satisfies adds on
  // top. Computed at offer time and stamped onto the notification +
  // performance record so the rider can be enticed to accept.
  @Prop({ type: Number, default: 0 })
  @ApiProperty()
  basePayoutGhs: number;

  @Prop({ type: [BonusRuleSchemaShape], default: [] })
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  bonusRules: BonusRule[];
}
