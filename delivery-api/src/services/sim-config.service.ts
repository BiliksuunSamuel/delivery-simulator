import { Injectable } from '@nestjs/common';
import { SimConfigRepository } from 'src/repositories/sim-config.repository';
import { SimConfig } from 'src/schemas/sim-config.schema';

@Injectable()
export class SimConfigService {
  constructor(private readonly simConfigRepository: SimConfigRepository) {}

  get(): Promise<SimConfig> {
    return this.simConfigRepository.getOrInit();
  }

  update(data: Partial<SimConfig>): Promise<SimConfig> {
    return this.simConfigRepository.update(data);
  }
}
