import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { RiderPayment } from 'src/schemas/rider-payment.schema';
import { HIDE_INTERNALS } from './_projection';

export interface RiderPaymentFilters {
  riderId?: string;
  orderId?: string;
}

export interface PagedRiderPayment {
  items: RiderPayment[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class RiderPaymentRepository {
  constructor(
    @InjectModel(RiderPayment.name)
    private readonly model: Model<RiderPayment>,
  ) {}

  async list(
    filters: RiderPaymentFilters = {},
    page = 1,
    pageSize = 20,
  ): Promise<PagedRiderPayment> {
    const q = this.buildQuery(filters);
    const safePage = Math.max(1, Math.floor(page));
    const safeSize = Math.min(100, Math.max(1, Math.floor(pageSize)));
    const [items, total] = await Promise.all([
      this.model
        .find(q, HIDE_INTERNALS)
        .sort({ paidAt: -1 })
        .skip((safePage - 1) * safeSize)
        .limit(safeSize)
        .lean(),
      this.model.countDocuments(q),
    ]);
    return { items, total, page: safePage, pageSize: safeSize };
  }

  /** Used by the rider performance modal to show the breakdown for a row. */
  async findForOrder(
    riderId: string,
    orderId: string,
  ): Promise<RiderPayment | null> {
    return this.model
      .findOne({ riderId, orderId }, HIDE_INTERNALS)
      .sort({ paidAt: -1 })
      .lean();
  }

  private buildQuery(filters: RiderPaymentFilters): FilterQuery<RiderPayment> {
    const q: FilterQuery<RiderPayment> = {};
    if (filters.riderId) q.riderId = filters.riderId;
    if (filters.orderId) q.orderId = filters.orderId;
    return q;
  }
}
