import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Notification } from 'src/schemas/notification.schema';
import { NotificationStatus } from 'src/enums/simulator';
import { generateId } from 'src/utils';
import { HIDE_INTERNALS } from './_projection';

export interface NotificationListFilters {
  riderId?: string;
  orderId?: string;
  status?: NotificationStatus | NotificationStatus[];
}

@Injectable()
export class NotificationRepository {
  constructor(
    @InjectModel(Notification.name)
    private readonly model: Model<Notification>,
  ) {}

  async list(filters: NotificationListFilters = {}): Promise<Notification[]> {
    const q: FilterQuery<Notification> = {};
    if (filters.riderId) q.riderId = filters.riderId;
    if (filters.orderId) q.orderId = filters.orderId;
    if (filters.status) {
      q.status = Array.isArray(filters.status)
        ? { $in: filters.status }
        : filters.status;
    }
    return this.model.find(q, HIDE_INTERNALS).sort({ issuedAt: -1 }).lean();
  }

  async getById(id: string): Promise<Notification | null> {
    return this.model.findOne({ id }, HIDE_INTERNALS).lean();
  }

  async create(data: Partial<Notification>): Promise<Notification> {
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

  async update(
    id: string,
    data: Partial<Notification>,
  ): Promise<Notification | null> {
    return this.model
      .findOneAndUpdate(
        { id },
        { $set: { ...data, updatedAt: new Date() } },
        { new: true, projection: HIDE_INTERNALS },
      )
      .lean();
  }
}
