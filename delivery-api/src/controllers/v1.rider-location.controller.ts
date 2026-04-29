import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RiderLocationService } from 'src/services/rider-location.service';

/**
 * Top-level GET for the dashboard map — returns the latest known location
 * for every rider in the system. Per-rider location is also available at
 * GET /api/v1/riders/:id/location.
 */
@Controller('api/v1/rider-locations')
@ApiTags('v1 · Rider Locations')
export class V1RiderLocationController {
  constructor(
    private readonly riderLocationService: RiderLocationService,
  ) {}

  @Get()
  list() {
    return this.riderLocationService.list();
  }
}
