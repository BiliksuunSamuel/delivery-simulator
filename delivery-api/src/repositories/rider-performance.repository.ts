import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { RiderPerformance } from 'src/schemas/rider-performance.schema';
import { RiderPerformanceStatus } from 'src/enums/simulator';
import { HIDE_INTERNALS } from './_projection';

export interface RiderPerformanceFilters {
  riderId?: string;
  orderId?: string;
  status?: RiderPerformanceStatus;
}

export interface PagedRiderPerformance {
  items: RiderPerformance[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RiderPerformanceSummaryBucket {
  accepted: number;
  declined: number;
  timedOut: number;
  delivered: number;
  cancelled: number;
}

export interface RiderPerformanceSummary {
  today: RiderPerformanceSummaryBucket;
  yesterday: RiderPerformanceSummaryBucket;
  lastMonth: RiderPerformanceSummaryBucket;
  total: RiderPerformanceSummaryBucket;
}

@Injectable()
export class RiderPerformanceRepository {
  constructor(
    @InjectModel(RiderPerformance.name)
    private readonly model: Model<RiderPerformance>,
  ) {}

  async list(
    filters: RiderPerformanceFilters = {},
    page = 1,
    pageSize = 20,
  ): Promise<PagedRiderPerformance> {
    const q = this.buildQuery(filters);
    const safePage = Math.max(1, Math.floor(page));
    const safeSize = Math.min(100, Math.max(1, Math.floor(pageSize)));
    const [items, total] = await Promise.all([
      this.model
        .find(q, HIDE_INTERNALS)
        .sort({ timestamp: -1 })
        .skip((safePage - 1) * safeSize)
        .limit(safeSize)
        .lean(),
      this.model.countDocuments(q),
    ]);
    return { items, total, page: safePage, pageSize: safeSize };
  }

  /**
   * Patches the most recent open Accepted record for (riderId, orderId) — the
   * one that has no terminal lifecycle timestamp yet. Used by both the worker
   * (auto-progress) and the API (manual cancel) so metrics always reflect the
   * delivered/cancelled moment without a separate timeline collection.
   */
  async patchActiveAccept(
    riderId: string,
    orderId: string,
    patch: { pickedUpAt?: Date; deliveredAt?: Date; cancelledAt?: Date },
  ): Promise<void> {
    if (Object.keys(patch).length === 0) return;
    await this.model.findOneAndUpdate(
      {
        riderId,
        orderId,
        status: 'Accepted',
      },
      { $set: { ...patch, updatedAt: new Date() } },
      { sort: { timestamp: -1 } },
    );
  }

  async summary(riderId: string): Promise<RiderPerformanceSummary> {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);

    const records = await this.model
      .find({ riderId }, '-_id status timestamp deliveredAt cancelledAt')
      .lean();

    const empty = (): RiderPerformanceSummaryBucket => ({
      accepted: 0,
      declined: 0,
      timedOut: 0,
      delivered: 0,
      cancelled: 0,
    });

    const buckets = {
      today: empty(),
      yesterday: empty(),
      lastMonth: empty(),
      total: empty(),
    };

    const tally = (
      bucket: RiderPerformanceSummaryBucket,
      r: { status: RiderPerformanceStatus; deliveredAt?: Date | null; cancelledAt?: Date | null },
    ) => {
      if (r.status === 'Accepted') bucket.accepted += 1;
      else if (r.status === 'Declined') bucket.declined += 1;
      else if (r.status === 'TimedOut') bucket.timedOut += 1;
      if (r.deliveredAt) bucket.delivered += 1;
      if (r.cancelledAt) bucket.cancelled += 1;
    };

    for (const r of records) {
      const t = r.timestamp instanceof Date ? r.timestamp : new Date(r.timestamp);
      tally(buckets.total, r);
      if (t >= startOfToday) tally(buckets.today, r);
      else if (t >= startOfYesterday) tally(buckets.yesterday, r);
      if (t >= monthAgo) tally(buckets.lastMonth, r);
    }
    return buckets;
  }

  private buildQuery(filters: RiderPerformanceFilters): FilterQuery<RiderPerformance> {
    const q: FilterQuery<RiderPerformance> = {};
    if (filters.riderId) q.riderId = filters.riderId;
    if (filters.orderId) q.orderId = filters.orderId;
    if (filters.status) q.status = filters.status;
    return q;
  }
}
