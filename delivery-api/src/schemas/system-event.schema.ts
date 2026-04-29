import { Prop, Schema } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import * as mongoose from 'mongoose';
import { BaseSchema } from '.';
import { SystemEventType } from 'src/enums/simulator';

@Schema({ collection: 'system_events' })
export class SystemEvent extends BaseSchema {
  @Prop({ required: true })
  @ApiProperty()
  type: SystemEventType;

  @Prop({ default: () => new Date() })
  @ApiProperty()
  timestamp: Date;

  @Prop({ required: true })
  @ApiProperty()
  summary: string;

  @Prop({ type: mongoose.Schema.Types.Mixed, default: {} })
  @ApiProperty()
  details: Record<string, unknown>;
}
