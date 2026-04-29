import { Prop, Schema } from '@nestjs/mongoose';
import { BaseSchema } from './base.schema';

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
  name: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: '#1FA39B' })
  colorHex: string;

  @Prop({ type: Number, default: 0 })
  basePayoutGhs: number;

  @Prop({ type: [BonusRuleSchemaShape], default: [] })
  bonusRules: BonusRule[];
}
