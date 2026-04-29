import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { TierService } from 'src/services/tier.service';
import type { Tier } from 'src/schemas/tier.schema';

type CreateTierBody = Omit<Tier, 'id' | 'createdAt' | 'updatedAt'>;

@Controller('api/v1/tiers')
@ApiTags('v1 · Tiers')
export class V1TierController {
  constructor(private readonly tierService: TierService) {}

  @Get()
  list() {
    return this.tierService.list();
  }

  @Get(':id')
  @ApiParam({ name: 'id', type: String })
  getById(@Param('id') id: string) {
    return this.tierService.getById(id);
  }

  @Post()
  create(@Body() body: CreateTierBody) {
    return this.tierService.create(body);
  }

  @Patch(':id')
  @ApiParam({ name: 'id', type: String })
  update(@Param('id') id: string, @Body() body: Partial<Tier>) {
    return this.tierService.update(id, body);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', type: String })
  delete(@Param('id') id: string) {
    return this.tierService.delete(id);
  }
}
