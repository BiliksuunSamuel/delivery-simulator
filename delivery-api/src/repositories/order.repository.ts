import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Order } from 'src/schemas/order.schema';
import { OrderState } from 'src/enums/simulator';
import { generateId } from 'src/utils';
import { HIDE_INTERNALS } from './_projection';

export interface OrderListFilters {
  state?: OrderState | OrderState[];
  retailerId?: string;
}

@Injectable()
export class OrderRepository {
  constructor(
    @InjectModel(Order.name) private readonly model: Model<Order>,
  ) {}

  async list(filters: OrderListFilters = {}): Promise<Order[]> {
    const q: FilterQuery<Order> = {};
    if (filters.state) {
      q.state = Array.isArray(filters.state) ? { $in: filters.state } : filters.state;
    }
    if (filters.retailerId) q.retailerId = filters.retailerId;
    return this.model.find(q, HIDE_INTERNALS).sort({ createdAt: -1 }).lean();
  }

  async getById(id: string): Promise<Order | null> {
    return this.model.findOne({ id }, HIDE_INTERNALS).lean();
  }

  async create(data: Partial<Order>): Promise<Order> {
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

  async update(id: string, data: Partial<Order>): Promise<Order | null> {
    return this.model
      .findOneAndUpdate(
        { id },
        { $set: { ...data, updatedAt: new Date() } },
        { new: true, projection: HIDE_INTERNALS },
      )
      .lean();
  }

  async delete(id: string): Promise<Order | null> {
    return this.model
      .findOneAndDelete({ id }, { projection: HIDE_INTERNALS })
      .lean();
  }

  async count(): Promise<number> {
    return this.model.countDocuments();
  }
}
