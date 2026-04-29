import { Injectable } from '@nestjs/common';
import { SystemEventRepository } from 'src/repositories/system-event.repository';
import { SystemEvent } from 'src/schemas/system-event.schema';
import { SystemEventType } from 'src/enums/simulator';

@Injectable()
export class SystemEventService {
  constructor(
    private readonly systemEventRepository: SystemEventRepository,
  ) {}

  list(since?: string): Promise<SystemEvent[]> {
    const sinceDate = since ? new Date(since) : undefined;
    return this.systemEventRepository.list(sinceDate);
  }

  emit(
    type: SystemEventType,
    summary: string,
    details: Record<string, unknown> = {},
  ): Promise<SystemEvent> {
    return this.systemEventRepository.emit(type, summary, details);
  }
}
