import { Injectable, NotFoundException } from '@nestjs/common';
import { CampaignRepository } from 'src/repositories/campaign.repository';
import { Campaign } from 'src/schemas/campaign.schema';

@Injectable()
export class CampaignService {
  constructor(private readonly campaignRepository: CampaignRepository) {}

  list(): Promise<Campaign[]> {
    return this.campaignRepository.list();
  }

  async getById(id: string): Promise<Campaign> {
    const c = await this.campaignRepository.getById(id);
    if (!c) throw new NotFoundException(`Campaign ${id} not found`);
    return c;
  }

  create(data: Partial<Campaign>): Promise<Campaign> {
    return this.campaignRepository.create(data);
  }

  async update(id: string, data: Partial<Campaign>): Promise<Campaign> {
    const updated = await this.campaignRepository.update(id, data);
    if (!updated) throw new NotFoundException(`Campaign ${id} not found`);
    return updated;
  }

  async delete(id: string): Promise<{ id: string }> {
    const deleted = await this.campaignRepository.delete(id);
    if (!deleted) throw new NotFoundException(`Campaign ${id} not found`);
    return { id };
  }
}
