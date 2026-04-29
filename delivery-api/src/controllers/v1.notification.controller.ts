import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { NotificationStatus } from 'src/enums/simulator';
import { DispatchService } from 'src/services/dispatch.service';
import { NotificationService } from 'src/services/notification.service';

interface RespondBody {
  action: 'accept' | 'decline';
}

@Controller('api/v1/notifications')
@ApiTags('v1 · Notifications')
export class V1NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly dispatchService: DispatchService,
  ) {}

  @Get()
  @ApiQuery({ name: 'riderId', required: false })
  @ApiQuery({ name: 'orderId', required: false })
  @ApiQuery({ name: 'status', required: false })
  list(
    @Query('riderId') riderId?: string,
    @Query('orderId') orderId?: string,
    @Query('status') status?: NotificationStatus,
  ) {
    return this.notificationService.list({ riderId, orderId, status });
  }

  @Post(':id/respond')
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ schema: { properties: { action: { type: 'string' } } } })
  async respond(@Param('id') id: string, @Body() body: RespondBody) {
    if (!body || !body.action) {
      throw new BadRequestException('Body must include an `action` field.');
    }
    await this.dispatchService.respond(id, body.action);
    // The workflow signal triggers an activity that updates the notification
    // shortly after; return the latest snapshot so the frontend mutation
    // settles cleanly.
    return this.notificationService.getById(id);
  }
}
