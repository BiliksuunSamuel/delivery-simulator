import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RiderPerformanceStatus, RiderState } from 'src/enums/simulator';
import { RiderService } from 'src/services/rider.service';
import { RiderLocationService } from 'src/services/rider-location.service';
import { RiderPaymentService } from 'src/services/rider-payment.service';
import { RiderPerformanceService } from 'src/services/rider-performance.service';
import type { Rider } from 'src/schemas/rider.schema';

interface UpdateLocationBody {
  latitude: number;
  longitude: number;
  batteryPercent: number;
  gpsAccuracyMeters: number;
}

interface TransitionStateBody {
  newState: RiderState;
  reason?: string;
}

interface OverrideEligibilityBody {
  isEligible: boolean;
  reason: string;
}

@Controller('api/v1/riders')
@ApiTags('v1 · Riders')
export class V1RiderController {
  constructor(
    private readonly riderService: RiderService,
    private readonly riderLocationService: RiderLocationService,
    private readonly riderPerformanceService: RiderPerformanceService,
    private readonly riderPaymentService: RiderPaymentService,
  ) {}

  @Get()
  @ApiQuery({ name: 'state', required: false })
  @ApiQuery({ name: 'tierId', required: false })
  @ApiQuery({ name: 'isEligible', required: false, type: Boolean })
  list(
    @Query('state') state?: RiderState,
    @Query('tierId') tierId?: string,
    @Query('isEligible') isEligible?: string,
  ) {
    return this.riderService.list({
      state,
      tierId,
      isEligible:
        isEligible === undefined
          ? undefined
          : isEligible === 'true' || isEligible === '1',
    });
  }

  @Get(':id')
  @ApiParam({ name: 'id', type: String })
  getById(@Param('id') id: string) {
    return this.riderService.getById(id);
  }

  @Post()
  create(@Body() body: Partial<Rider>) {
    return this.riderService.create(body);
  }

  @Patch(':id')
  @ApiParam({ name: 'id', type: String })
  update(@Param('id') id: string, @Body() body: Partial<Rider>) {
    return this.riderService.update(id, body);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', type: String })
  delete(@Param('id') id: string) {
    return this.riderService.delete(id);
  }

  @Get(':id/location')
  @ApiParam({ name: 'id', type: String })
  getLocation(@Param('id') id: string) {
    return this.riderLocationService.getByRiderId(id);
  }

  @Patch(':id/location')
  @ApiParam({ name: 'id', type: String })
  updateLocation(@Param('id') id: string, @Body() body: UpdateLocationBody) {
    return this.riderService.updateLocation(id, body);
  }

  @Get(':id/performance')
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  getPerformance(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: RiderPerformanceStatus,
  ) {
    return this.riderPerformanceService.list(
      { riderId: id, status },
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 20,
    );
  }

  @Get(':id/performance/summary')
  @ApiParam({ name: 'id', type: String })
  getPerformanceSummary(@Param('id') id: string) {
    return this.riderPerformanceService.summary(id);
  }

  @Get(':id/payments')
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  getPayments(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.riderPaymentService.list(
      { riderId: id },
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 20,
    );
  }

  @Get(':id/payments/:orderId')
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'orderId', type: String })
  getPaymentForOrder(
    @Param('id') id: string,
    @Param('orderId') orderId: string,
  ) {
    return this.riderPaymentService.findForOrder(id, orderId);
  }

  @Post(':id/state')
  @ApiParam({ name: 'id', type: String })
  transitionState(
    @Param('id') id: string,
    @Body() body: TransitionStateBody,
  ) {
    return this.riderService.transitionState(id, body);
  }

  @Post(':id/eligibility')
  @ApiParam({ name: 'id', type: String })
  overrideEligibility(
    @Param('id') id: string,
    @Body() body: OverrideEligibilityBody,
  ) {
    return this.riderService.overrideEligibility(id, body);
  }
}
