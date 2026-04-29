import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { SystemEvent } from 'src/schemas/system-event.schema';
import { SystemEventType } from 'src/enums/simulator';
import { generateId } from 'src/utils';
import { HIDE_INTERNALS } from './_projection';

@Injectable()
export class SystemEventRepository {
  constructor(
    @InjectModel(SystemEvent.name)
    private readonly model: Model<SystemEvent>,
  ) {}

  async list(since?: Date, limit = 50): Promise<SystemEvent[]> {
    const q: FilterQuery<SystemEvent> = {};
    if (since) q.timestamp = { $gt: since };
    return this.model
      .find(q, HIDE_INTERNALS)
      .sort({ timestamp: -1 })
      .limit(since ? 500 : limit)
      .lean();
  }

  async emit(
    type: SystemEventType,
    summary: string,
    details: Record<string, unknown> = {},
  ): Promise<SystemEvent> {
    const id = generateId();
    const now = new Date();
    await this.model.create({
      id,
      type,
      timestamp: now,
      summary,
      details,
      createdAt: now,
      updatedAt: now,
    });
    return this.model.findOne({ id }, HIDE_INTERNALS).lean();
  }
}
