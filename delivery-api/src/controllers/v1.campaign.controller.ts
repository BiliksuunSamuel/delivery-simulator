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
import { CampaignService } from 'src/services/campaign.service';
import type { Campaign } from 'src/schemas/campaign.schema';

type CreateCampaignBody = Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>;

@Controller('api/v1/campaigns')
@ApiTags('v1 · Campaigns')
export class V1CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Get()
  list() {
    return this.campaignService.list();
  }

  @Get(':id')
  @ApiParam({ name: 'id', type: String })
  getById(@Param('id') id: string) {
    return this.campaignService.getById(id);
  }

  @Post()
  create(@Body() body: CreateCampaignBody) {
    return this.campaignService.create(body);
  }

  @Patch(':id')
  @ApiParam({ name: 'id', type: String })
  update(@Param('id') id: string, @Body() body: Partial<Campaign>) {
    return this.campaignService.update(id, body);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', type: String })
  delete(@Param('id') id: string) {
    return this.campaignService.delete(id);
  }
}
