import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SimConfig } from 'src/schemas/sim-config.schema';
import { generateId } from 'src/utils';
import { HIDE_INTERNALS } from './_projection';

@Injectable()
export class SimConfigRepository {
  constructor(
    @InjectModel(SimConfig.name) private readonly model: Model<SimConfig>,
  ) {}

  /** Lazily create the singleton if missing, then return it. */
  async getOrInit(): Promise<SimConfig> {
    const existing = await this.model.findOne({}, HIDE_INTERNALS).lean();
    if (existing) return existing;
    const now = new Date();
    await this.model.create({
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    });
    return this.model.findOne({}, HIDE_INTERNALS).lean();
  }

  async update(data: Partial<SimConfig>): Promise<SimConfig> {
    const existing = await this.model.findOne();
    if (!existing) {
      return this.create(data);
    }
    return this.model
      .findOneAndUpdate(
        { id: existing.id },
        { $set: { ...data, updatedAt: new Date() } },
        { new: true, projection: HIDE_INTERNALS },
      )
      .lean();
  }

  async create(data: Partial<SimConfig>): Promise<SimConfig> {
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

  async count(): Promise<number> {
    return this.model.countDocuments();
  }
}
