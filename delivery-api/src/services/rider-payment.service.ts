import { Injectable } from '@nestjs/common';
import {
  PagedRiderPayment,
  RiderPaymentFilters,
  RiderPaymentRepository,
} from 'src/repositories/rider-payment.repository';
import { RiderPayment } from 'src/schemas/rider-payment.schema';

@Injectable()
export class RiderPaymentService {
  constructor(
    private readonly riderPaymentRepository: RiderPaymentRepository,
  ) {}

  list(
    filters?: RiderPaymentFilters,
    page = 1,
    pageSize = 20,
  ): Promise<PagedRiderPayment> {
    return this.riderPaymentRepository.list(filters, page, pageSize);
  }

  findForOrder(
    riderId: string,
    orderId: string,
  ): Promise<RiderPayment | null> {
    return this.riderPaymentRepository.findForOrder(riderId, orderId);
  }
}
