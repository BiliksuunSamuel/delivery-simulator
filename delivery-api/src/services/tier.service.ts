import { Injectable, NotFoundException } from '@nestjs/common';
import { TierRepository } from 'src/repositories/tier.repository';
import { Tier } from 'src/schemas/tier.schema';

@Injectable()
export class TierService {
  constructor(private readonly tierRepository: TierRepository) {}

  list(): Promise<Tier[]> {
    return this.tierRepository.list();
  }

  async getById(id: string): Promise<Tier> {
    const tier = await this.tierRepository.getById(id);
    if (!tier) throw new NotFoundException(`Tier ${id} not found`);
    return tier;
  }

  create(data: Partial<Tier>): Promise<Tier> {
    return this.tierRepository.create(data);
  }

  async update(id: string, data: Partial<Tier>): Promise<Tier> {
    const updated = await this.tierRepository.update(id, data);
    if (!updated) throw new NotFoundException(`Tier ${id} not found`);
    return updated;
  }

  async delete(id: string): Promise<{ id: string }> {
    const deleted = await this.tierRepository.delete(id);
    if (!deleted) throw new NotFoundException(`Tier ${id} not found`);
    return { id };
  }
}
