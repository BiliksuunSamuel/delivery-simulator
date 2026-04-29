import { Prop, Schema } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { BaseSchema } from './base.schema';
import type { SystemEventType } from 'src/enums';

@Schema({ collection: 'system_events' })
export class SystemEvent extends BaseSchema {
  @Prop({ type: String, required: true })
  type: SystemEventType;

  @Prop({ default: () => new Date() })
  timestamp: Date;

  @Prop({ required: true })
  summary: string;

  @Prop({ type: mongoose.Schema.Types.Mixed, default: {} })
  details: Record<string, unknown>;
}
