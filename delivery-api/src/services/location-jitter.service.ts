import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { RiderLocationRepository } from 'src/repositories/rider-location.repository';

const TICK_INTERVAL_MS = 30_000;
// Roughly 100 m at Accra latitude — 1 deg ≈ 111 km, so 100 m ≈ 0.0009 deg.
const STEP_DEG = 0.0009;

/**
 * Periodic background process that nudges every rider's location by a small
 * random walk to mimic a real fleet's drift. Pure side-effect — kicked off
 * on application bootstrap, stopped on module destroy.
 *
 * Single-node simple: just setInterval. Don't run a second instance against
 * the same DB or both will be pushing locations around concurrently.
 */
@Injectable()
export class LocationJitterService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(LocationJitterService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly riderLocations: RiderLocationRepository,
  ) {}

  onApplicationBootstrap() {
    this.timer = setInterval(() => {
      this.tick().catch((err) =>
        this.logger.error('Location jitter tick failed', err),
      );
    }, TICK_INTERVAL_MS);
    this.logger.log(
      `Location jitter started — every ${TICK_INTERVAL_MS / 1000}s`,
    );
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    const locations = await this.riderLocations.list();
    if (locations.length === 0) return;

    for (const loc of locations) {
      const dLat = (Math.random() - 0.5) * 2 * STEP_DEG;
      const dLng = (Math.random() - 0.5) * 2 * STEP_DEG;
      // Battery drains slowly; small chance of a small recovery (rider
      // plugged in at home base).
      const dBattery = Math.random() < 0.85 ? -1 : +2;
      const nextBattery = Math.max(
        0,
        Math.min(100, loc.batteryPercent + dBattery),
      );
      await this.riderLocations.upsert({
        riderId: loc.riderId,
        latitude: loc.latitude + dLat,
        longitude: loc.longitude + dLng,
        batteryPercent: nextBattery,
        gpsAccuracyMeters: loc.gpsAccuracyMeters,
      });
    }
  }
}
