import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tier } from 'src/schemas/tier.schema';
import { generateId } from 'src/utils';
import { HIDE_INTERNALS } from './_projection';

@Injectable()
export class TierRepository {
  constructor(
    @InjectModel(Tier.name) private readonly model: Model<Tier>,
  ) {}

  async list(): Promise<Tier[]> {
    return this.model
      .find({}, HIDE_INTERNALS)
      .sort({ basePayoutGhs: -1, name: 1 })
      .lean();
  }

  async getById(id: string): Promise<Tier | null> {
    return this.model.findOne({ id }, HIDE_INTERNALS).lean();
  }

  async create(data: Partial<Tier>): Promise<Tier> {
    const id = data.id ?? generateId();
    const now = new Date();
    await this.model.create({
      ...data,
      id,
      createdAt: data.createdAt ?? now,
      updatedAt: data.updatedAt ?? now,
    });
    return this.getById(id);
  }

  async update(id: string, data: Partial<Tier>): Promise<Tier | null> {
    return this.model
      .findOneAndUpdate(
        { id },
        { $set: { ...data, updatedAt: new Date() } },
        { new: true, projection: HIDE_INTERNALS },
      )
      .lean();
  }

  async delete(id: string): Promise<Tier | null> {
    return this.model
      .findOneAndDelete({ id }, { projection: HIDE_INTERNALS })
      .lean();
  }

  async count(): Promise<number> {
    return this.model.countDocuments();
  }
}
