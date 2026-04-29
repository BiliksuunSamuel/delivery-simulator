import { Injectable } from '@nestjs/common';
import {
  PagedRiderPerformance,
  RiderPerformanceFilters,
  RiderPerformanceRepository,
  RiderPerformanceSummary,
} from 'src/repositories/rider-performance.repository';

@Injectable()
export class RiderPerformanceService {
  constructor(
    private readonly riderPerformanceRepository: RiderPerformanceRepository,
  ) {}

  list(
    filters?: RiderPerformanceFilters,
    page = 1,
    pageSize = 20,
  ): Promise<PagedRiderPerformance> {
    return this.riderPerformanceRepository.list(filters, page, pageSize);
  }

  summary(riderId: string): Promise<RiderPerformanceSummary> {
    return this.riderPerformanceRepository.summary(riderId);
  }
}
