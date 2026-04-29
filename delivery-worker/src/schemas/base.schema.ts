import { Prop } from '@nestjs/mongoose';

/**
 * Mirrors the BaseSchema in delivery-api so documents written by either
 * service are interchangeable. createdBy / updatedBy stay nullable since the
 * simulator has no auth.
 */
export class BaseSchema {
  @Prop({ required: true })
  id: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: null })
  updatedAt: Date | null;

  @Prop({ type: String, default: null })
  createdBy: string | null;

  @Prop({ type: String, default: null })
  updatedBy: string | null;
}
