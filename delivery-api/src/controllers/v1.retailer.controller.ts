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
import { RetailerService } from 'src/services/retailer.service';
import type { Retailer } from 'src/schemas/retailer.schema';

type CreateRetailerBody = Omit<Retailer, 'id' | 'createdAt' | 'updatedAt'>;

@Controller('api/v1/retailers')
@ApiTags('v1 · Retailers')
export class V1RetailerController {
  constructor(private readonly retailerService: RetailerService) {}

  @Get()
  list() {
    return this.retailerService.list();
  }

  @Get(':id')
  @ApiParam({ name: 'id', type: String })
  getById(@Param('id') id: string) {
    return this.retailerService.getById(id);
  }

  @Post()
  create(@Body() body: CreateRetailerBody) {
    return this.retailerService.create(body);
  }

  @Patch(':id')
  @ApiParam({ name: 'id', type: String })
  update(@Param('id') id: string, @Body() body: Partial<Retailer>) {
    return this.retailerService.update(id, body);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', type: String })
  delete(@Param('id') id: string) {
    return this.retailerService.delete(id);
  }
}
