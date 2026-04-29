import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SimConfigService } from 'src/services/sim-config.service';
import type { SimConfig } from 'src/schemas/sim-config.schema';

@Controller('api/v1/config')
@ApiTags('v1 · Config')
export class V1ConfigController {
  constructor(private readonly simConfigService: SimConfigService) {}

  @Get()
  get() {
    return this.simConfigService.get();
  }

  @Patch()
  update(@Body() body: Partial<SimConfig>) {
    return this.simConfigService.update(body);
  }
}
