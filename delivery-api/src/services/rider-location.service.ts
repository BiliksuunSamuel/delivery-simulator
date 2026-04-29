import { Injectable, NotFoundException } from '@nestjs/common';
import { RiderLocationRepository } from 'src/repositories/rider-location.repository';
import { RiderLocation } from 'src/schemas/rider-location.schema';

@Injectable()
export class RiderLocationService {
  constructor(
    private readonly riderLocationRepository: RiderLocationRepository,
  ) {}

  list(): Promise<RiderLocation[]> {
    return this.riderLocationRepository.list();
  }

  async getByRiderId(riderId: string): Promise<RiderLocation> {
    const location = await this.riderLocationRepository.getByRiderId(riderId);
    if (!location) {
      throw new NotFoundException(`No location for rider ${riderId}`);
    }
    return location;
  }

  upsert(input: {
    riderId: string;
    latitude: number;
    longitude: number;
    batteryPercent?: number;
    gpsAccuracyMeters?: number;
  }): Promise<RiderLocation> {
    return this.riderLocationRepository.upsert(input);
  }
}
