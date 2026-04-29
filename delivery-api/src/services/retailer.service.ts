import { Injectable, NotFoundException } from '@nestjs/common';
import { RetailerRepository } from 'src/repositories/retailer.repository';
import { Retailer } from 'src/schemas/retailer.schema';

@Injectable()
export class RetailerService {
  constructor(private readonly retailerRepository: RetailerRepository) {}

  list(): Promise<Retailer[]> {
    return this.retailerRepository.list();
  }

  async getById(id: string): Promise<Retailer> {
    const retailer = await this.retailerRepository.getById(id);
    if (!retailer) throw new NotFoundException(`Retailer ${id} not found`);
    return retailer;
  }

  create(data: Partial<Retailer>): Promise<Retailer> {
    return this.retailerRepository.create(data);
  }

  async update(id: string, data: Partial<Retailer>): Promise<Retailer> {
    const updated = await this.retailerRepository.update(id, data);
    if (!updated) throw new NotFoundException(`Retailer ${id} not found`);
    return updated;
  }

  async delete(id: string): Promise<{ id: string }> {
    const deleted = await this.retailerRepository.delete(id);
    if (!deleted) throw new NotFoundException(`Retailer ${id} not found`);
    return { id };
  }
}
