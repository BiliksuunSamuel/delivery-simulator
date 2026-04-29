import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RiderLocation } from 'src/schemas/rider-location.schema';
import { generateId } from 'src/utils';
import { HIDE_INTERNALS } from './_projection';

interface UpsertInput {
  riderId: string;
  latitude: number;
  longitude: number;
  batteryPercent?: number;
  gpsAccuracyMeters?: number;
}

@Injectable()
export class RiderLocationRepository {
  constructor(
    @InjectModel(RiderLocation.name)
    private readonly model: Model<RiderLocation>,
  ) {}

  async list(): Promise<RiderLocation[]> {
    return this.model.find({}, HIDE_INTERNALS).lean();
  }

  async getByRiderId(riderId: string): Promise<RiderLocation | null> {
    return this.model.findOne({ riderId }, HIDE_INTERNALS).lean();
  }

  /**
   * Upsert: create if missing, otherwise patch in place. The rider_locations
   * collection is keyed by `riderId`, not `id`, since there's exactly one row
   * per rider.
   */
  async upsert(input: UpsertInput): Promise<RiderLocation> {
    const now = new Date();
    await this.model.findOneAndUpdate(
      { riderId: input.riderId },
      {
        $set: {
          latitude: input.latitude,
          longitude: input.longitude,
          ...(input.batteryPercent !== undefined && {
            batteryPercent: input.batteryPercent,
          }),
          ...(input.gpsAccuracyMeters !== undefined && {
            gpsAccuracyMeters: input.gpsAccuracyMeters,
          }),
          lastUpdatedAt: now,
          updatedAt: now,
        },
        $setOnInsert: {
          id: generateId(),
          riderId: input.riderId,
          createdAt: now,
        },
      },
      { upsert: true, new: true },
    );
    return this.getByRiderId(input.riderId) as Promise<RiderLocation>;
  }

  async deleteByRiderId(riderId: string): Promise<void> {
    await this.model.deleteOne({ riderId });
  }
}
