import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Retailer } from 'src/schemas/retailer.schema';
import { generateId } from 'src/utils';
import { HIDE_INTERNALS } from './_projection';

@Injectable()
export class RetailerRepository {
  constructor(
    @InjectModel(Retailer.name) private readonly model: Model<Retailer>,
  ) {}

  async list(): Promise<Retailer[]> {
    return this.model.find({}, HIDE_INTERNALS).sort({ name: 1 }).lean();
  }

  async getById(id: string): Promise<Retailer | null> {
    return this.model.findOne({ id }, HIDE_INTERNALS).lean();
  }

  async create(data: Partial<Retailer>): Promise<Retailer> {
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

  async update(id: string, data: Partial<Retailer>): Promise<Retailer | null> {
    return this.model
      .findOneAndUpdate(
        { id },
        { $set: { ...data, updatedAt: new Date() } },
        { new: true, projection: HIDE_INTERNALS },
      )
      .lean();
  }

  async delete(id: string): Promise<Retailer | null> {
    return this.model
      .findOneAndDelete({ id }, { projection: HIDE_INTERNALS })
      .lean();
  }

  async count(): Promise<number> {
    return this.model.countDocuments();
  }
}
