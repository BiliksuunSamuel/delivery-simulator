import { Injectable } from '@nestjs/common';
import { DispatchAttemptRepository } from 'src/repositories/dispatch-attempt.repository';
import { DispatchAttempt } from 'src/schemas/dispatch-attempt.schema';

@Injectable()
export class DispatchAttemptService {
  constructor(
    private readonly dispatchAttemptRepository: DispatchAttemptRepository,
  ) {}

  /** Returns the latest dispatch attempt for an order, or null if none. */
  getByOrderId(orderId: string): Promise<DispatchAttempt | null> {
    return this.dispatchAttemptRepository.getByOrderId(orderId);
  }
}
