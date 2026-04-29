import { Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SeedService } from 'src/services/seed.service';

@Controller('api/v1/system')
@ApiTags('v1 · System')
export class V1SystemController {
  constructor(private readonly seedService: SeedService) {}

  /**
   * Wipes every simulator collection and re-applies the bootstrap seed.
   * Wired to the topbar "Reset state" button on the frontend.
   */
  @Post('reset')
  async reset() {
    await this.seedService.reset();
    return { ok: true };
  }
}
