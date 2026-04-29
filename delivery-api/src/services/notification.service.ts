import { Injectable, NotFoundException } from '@nestjs/common';
import {
  NotificationListFilters,
  NotificationRepository,
} from 'src/repositories/notification.repository';
import { Notification } from 'src/schemas/notification.schema';

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  list(filters?: NotificationListFilters): Promise<Notification[]> {
    return this.notificationRepository.list(filters);
  }

  async getById(id: string): Promise<Notification> {
    const n = await this.notificationRepository.getById(id);
    if (!n) throw new NotFoundException(`Notification ${id} not found`);
    return n;
  }
}
