import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DispatchAttempt } from 'src/schemas/dispatch-attempt.schema';
import { generateId } from 'src/utils';
import { HIDE_INTERNALS } from './_projection';

@Injectable()
export class DispatchAttemptRepository {
  constructor(
    @InjectModel(DispatchAttempt.name)
    private readonly model: Model<DispatchAttempt>,
  ) {}

  async getByOrderId(orderId: string): Promise<DispatchAttempt | null> {
    return this.model
      .findOne({ orderId }, HIDE_INTERNALS)
      .sort({ startedAt: -1 })
      .lean();
  }

  async create(data: Partial<DispatchAttempt>): Promise<DispatchAttempt> {
    const id = data.id ?? generateId();
    const now = new Date();
    await this.model.create({
      ...data,
      id,
      createdAt: data.createdAt ?? now,
      updatedAt: data.updatedAt ?? now,
    });
    return this.model.findOne({ id }, HIDE_INTERNALS).lean();
  }

  async update(
    id: string,
    data: Partial<DispatchAttempt>,
  ): Promise<DispatchAttempt | null> {
    return this.model
      .findOneAndUpdate(
        { id },
        { $set: { ...data, updatedAt: new Date() } },
        { new: true, projection: HIDE_INTERNALS },
      )
      .lean();
  }
}
