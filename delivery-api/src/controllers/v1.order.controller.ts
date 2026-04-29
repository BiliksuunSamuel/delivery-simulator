import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { OrderState } from 'src/enums/simulator';
import { DispatchAttemptService } from 'src/services/dispatch-attempt.service';
import { DispatchService } from 'src/services/dispatch.service';
import { OrderService } from 'src/services/order.service';
import { RiderPerformanceService } from 'src/services/rider-performance.service';

interface CreateOrderBody {
  retailerId: string;
  dropLatitude: number;
  dropLongitude: number;
  dropAddress?: string | null;
}

interface TransitionOrderStateBody {
  newState: OrderState;
}

@Controller('api/v1/orders')
@ApiTags('v1 · Orders')
export class V1OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly dispatchAttemptService: DispatchAttemptService,
    private readonly dispatchService: DispatchService,
    private readonly riderPerformanceService: RiderPerformanceService,
  ) {}

  @Get()
  @ApiQuery({ name: 'state', required: false })
  @ApiQuery({ name: 'retailerId', required: false })
  list(
    @Query('state') state?: OrderState,
    @Query('retailerId') retailerId?: string,
  ) {
    return this.orderService.list({ state, retailerId });
  }

  @Get(':id')
  @ApiParam({ name: 'id', type: String })
  getById(@Param('id') id: string) {
    return this.orderService.getById(id);
  }

  @Get(':id/dispatch-attempt')
  @ApiParam({ name: 'id', type: String })
  getDispatchAttempt(@Param('id') id: string) {
    return this.dispatchAttemptService.getByOrderId(id);
  }

  @Get(':id/performance')
  @ApiParam({ name: 'id', type: String })
  getPerformance(@Param('id') id: string) {
    return this.riderPerformanceService.list({ orderId: id });
  }

  @Post()
  create(@Body() body: CreateOrderBody) {
    return this.orderService.create({
      retailerId: body.retailerId,
      dropLatitude: body.dropLatitude,
      dropLongitude: body.dropLongitude,
      dropAddress: body.dropAddress ?? null,
    });
  }

  @Post(':id/state')
  @ApiParam({ name: 'id', type: String })
  transitionState(
    @Param('id') id: string,
    @Body() body: TransitionOrderStateBody,
  ) {
    return this.orderService.transitionState(id, body.newState);
  }

  @Post(':id/dispatch')
  @ApiParam({ name: 'id', type: String })
  async dispatch(@Param('id') id: string) {
    await this.dispatchService.dispatch(id);
    // Workflow runs async; the first activity flips the order to
    // Dispatching but isn't guaranteed to have run yet. Return the latest
    // snapshot so the frontend's mutation settles its query cache.
    return this.orderService.getById(id);
  }
}
