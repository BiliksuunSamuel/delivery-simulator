import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  RiderListFilters,
  RiderRepository,
} from 'src/repositories/rider.repository';
import { Rider } from 'src/schemas/rider.schema';
import { RiderState } from 'src/enums/simulator';
import { RiderLocationRepository } from 'src/repositories/rider-location.repository';
import { SimConfigService } from './sim-config.service';
import { SystemEventService } from './system-event.service';

interface UpdateLocationInput {
  latitude: number;
  longitude: number;
  batteryPercent: number;
  gpsAccuracyMeters: number;
}

interface TransitionStateInput {
  newState: RiderState;
  reason?: string;
}

interface OverrideEligibilityInput {
  isEligible: boolean;
  reason: string;
}

const RIDER_TRANSITIONS: Record<RiderState, RiderState[]> = {
  Offline: ['OnlineIdle', 'Suspended'],
  OnlineIdle: ['Offline', 'OnBreak', 'OnlineAssigned', 'Suspended'],
  OnlineAssigned: ['OnPickup', 'OnlineIdle', 'Suspended'],
  OnPickup: ['OnDelivery', 'OnlineIdle', 'Suspended'],
  OnDelivery: ['OnlineIdle', 'Suspended'],
  OnBreak: ['OnlineIdle', 'Offline'],
  Suspended: ['Offline', 'OnlineIdle'],
};

@Injectable()
export class RiderService {
  private readonly logger = new Logger(RiderService.name);

  constructor(
    private readonly riderRepository: RiderRepository,
    private readonly riderLocationRepository: RiderLocationRepository,
    private readonly simConfigService: SimConfigService,
    private readonly systemEventService: SystemEventService,
  ) {}

  list(filters?: RiderListFilters): Promise<Rider[]> {
    return this.riderRepository.list(filters);
  }

  async getById(id: string): Promise<Rider> {
    const rider = await this.riderRepository.getById(id);
    if (!rider) throw new NotFoundException(`Rider ${id} not found`);
    return rider;
  }

  create(data: Partial<Rider>): Promise<Rider> {
    return this.riderRepository.create(data);
  }

  async update(id: string, data: Partial<Rider>): Promise<Rider> {
    const updated = await this.riderRepository.update(id, data);
    if (!updated) throw new NotFoundException(`Rider ${id} not found`);
    return updated;
  }

  async delete(id: string): Promise<{ id: string }> {
    const deleted = await this.riderRepository.delete(id);
    if (!deleted) throw new NotFoundException(`Rider ${id} not found`);
    await this.riderLocationRepository.deleteByRiderId(id);
    return { id };
  }

  /**
   * Upserts the rider's location into the rider_locations collection and
   * re-evaluates battery-driven eligibility on the rider profile:
   *  - battery < threshold and was eligible → flip off, BatteryThresholdCrossed
   *  - battery ≥ threshold and was blocked by battery → flip back on
   * Emits a RiderEligibilityChanged event when the flag actually changes.
   */
  async updateLocation(id: string, input: UpdateLocationInput): Promise<Rider> {
    const rider = await this.riderRepository.getById(id);
    if (!rider) throw new NotFoundException(`Rider ${id} not found`);
    const config = await this.simConfigService.get();

    const wasEligible = rider.isEligible;
    const wasBatteryBlocked =
      rider.ineligibilityReason === 'battery below threshold';

    let isEligible = rider.isEligible;
    let ineligibilityReason: string | null = rider.ineligibilityReason;

    if (input.batteryPercent < config.batteryThresholdPercent) {
      isEligible = false;
      ineligibilityReason = 'battery below threshold';
    } else if (wasBatteryBlocked) {
      isEligible = true;
      ineligibilityReason = null;
    }

    await this.riderLocationRepository.upsert({
      riderId: id,
      latitude: input.latitude,
      longitude: input.longitude,
      batteryPercent: input.batteryPercent,
      gpsAccuracyMeters: input.gpsAccuracyMeters,
    });

    let updated = rider;
    if (isEligible !== wasEligible || ineligibilityReason !== rider.ineligibilityReason) {
      const next = await this.riderRepository.update(id, {
        isEligible,
        ineligibilityReason,
      });
      if (!next) throw new NotFoundException(`Rider ${id} not found`);
      updated = next;
    }

    if (
      input.batteryPercent < config.batteryThresholdPercent &&
      wasEligible
    ) {
      await this.systemEventService.emit(
        'BatteryThresholdCrossed',
        `Rider ${id.slice(0, 8)} battery dropped to ${input.batteryPercent}%`,
        { riderId: id, batteryPercent: input.batteryPercent },
      );
    }
    if (isEligible !== wasEligible) {
      await this.systemEventService.emit(
        'RiderEligibilityChanged',
        `Rider ${id.slice(0, 8)} eligibility → ${isEligible ? 'ON' : 'OFF'}`,
        { riderId: id, isEligible, reason: ineligibilityReason },
      );
    }
    return updated;
  }

  async transitionState(
    id: string,
    input: TransitionStateInput,
  ): Promise<Rider> {
    const rider = await this.riderRepository.getById(id);
    if (!rider) throw new NotFoundException(`Rider ${id} not found`);

    const allowed = RIDER_TRANSITIONS[rider.state] ?? [];
    if (!allowed.includes(input.newState)) {
      throw new BadRequestException(
        `Invalid transition: ${rider.state} → ${input.newState}`,
      );
    }

    const updated = await this.riderRepository.update(id, {
      state: input.newState,
    });
    if (!updated) throw new NotFoundException(`Rider ${id} not found`);

    await this.systemEventService.emit(
      'RiderStateChanged',
      `Rider ${id.slice(0, 8)} → ${input.newState}${
        input.reason ? ` (${input.reason})` : ''
      }`,
      { riderId: id, newState: input.newState, reason: input.reason ?? null },
    );
    return updated;
  }

  async overrideEligibility(
    id: string,
    input: OverrideEligibilityInput,
  ): Promise<Rider> {
    const updated = await this.riderRepository.update(id, {
      isEligible: input.isEligible,
      ineligibilityReason: input.isEligible ? null : input.reason,
    });
    if (!updated) throw new NotFoundException(`Rider ${id} not found`);

    await this.systemEventService.emit(
      'RiderEligibilityChanged',
      `Rider ${id.slice(0, 8)} eligibility → ${
        input.isEligible ? 'ON' : 'OFF'
      } (override)`,
      { riderId: id, isEligible: input.isEligible, reason: input.reason },
    );
    return updated;
  }
}
