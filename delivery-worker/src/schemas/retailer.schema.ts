import { Prop, Schema } from '@nestjs/mongoose';
import { BaseSchema } from './base.schema';

@Schema({ collection: 'retailers' })
export class Retailer extends BaseSchema {
  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  address: string;

  @Prop({ required: true })
  latitude: number;

  @Prop({ required: true })
  longitude: number;

  @Prop({ type: String, default: null })
  zone: string | null;

  @Prop({ type: String, default: null })
  station: string | null;
}
