import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { SystemEventService } from 'src/services/system-event.service';

@Controller('api/v1/events')
@ApiTags('v1 · Events')
export class V1EventController {
  constructor(private readonly systemEventService: SystemEventService) {}

  @Get()
  @ApiQuery({ name: 'since', required: false, description: 'ISO timestamp' })
  list(@Query('since') since?: string) {
    return this.systemEventService.list(since);
  }
}
