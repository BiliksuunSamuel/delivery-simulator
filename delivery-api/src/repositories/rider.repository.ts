import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Rider } from 'src/schemas/rider.schema';
import { RiderState } from 'src/enums/simulator';
import { generateId } from 'src/utils';
import { HIDE_INTERNALS } from './_projection';

export interface RiderListFilters {
  state?: RiderState | RiderState[];
  tierId?: string;
  isEligible?: boolean;
}

@Injectable()
export class RiderRepository {
  constructor(
    @InjectModel(Rider.name) private readonly model: Model<Rider>,
  ) {}

  async list(filters: RiderListFilters = {}): Promise<Rider[]> {
    const q: FilterQuery<Rider> = {};
    if (filters.state) {
      q.state = Array.isArray(filters.state) ? { $in: filters.state } : filters.state;
    }
    if (filters.tierId) q.tierId = filters.tierId;
    if (typeof filters.isEligible === 'boolean') q.isEligible = filters.isEligible;
    return this.model.find(q, HIDE_INTERNALS).sort({ fullName: 1 }).lean();
  }

  async getById(id: string): Promise<Rider | null> {
    return this.model.findOne({ id }, HIDE_INTERNALS).lean();
  }

  async create(data: Partial<Rider>): Promise<Rider> {
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

  async update(id: string, data: Partial<Rider>): Promise<Rider | null> {
    return this.model
      .findOneAndUpdate(
        { id },
        { $set: { ...data, updatedAt: new Date() } },
        { new: true, projection: HIDE_INTERNALS },
      )
      .lean();
  }

  async delete(id: string): Promise<Rider | null> {
    return this.model
      .findOneAndDelete({ id }, { projection: HIDE_INTERNALS })
      .lean();
  }

  async count(): Promise<number> {
    return this.model.countDocuments();
  }
}
