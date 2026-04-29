import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderListFilters,
  OrderRepository,
} from 'src/repositories/order.repository';
import { Order } from 'src/schemas/order.schema';
import { OrderState } from 'src/enums/simulator';
import { RetailerRepository } from 'src/repositories/retailer.repository';
import { RiderRepository } from 'src/repositories/rider.repository';
import { RiderPerformanceRepository } from 'src/repositories/rider-performance.repository';
import { SystemEventService } from './system-event.service';

const ORDER_TRANSITIONS: Record<OrderState, OrderState[]> = {
  Created: ['PendingRiderAccept', 'Cancelled'],
  PendingRiderAccept: ['RiderAccepted', 'FailedToDispatch', 'Cancelled'],
  RiderAccepted: ['ArriveAtPickup', 'Cancelled'],
  ArriveAtPickup: ['ArriveAtDelivery', 'Cancelled'],
  ArriveAtDelivery: ['Delivered', 'Cancelled'],
  Delivered: [],
  Cancelled: [],
  FailedToDispatch: ['PendingRiderAccept', 'Cancelled'],
};

interface CreateOrderInput {
  retailerId: string;
  dropLatitude: number;
  dropLongitude: number;
  dropAddress?: string | null;
}

@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly retailerRepository: RetailerRepository,
    private readonly riderRepository: RiderRepository,
    private readonly riderPerformanceRepository: RiderPerformanceRepository,
    private readonly systemEventService: SystemEventService,
  ) {}

  list(filters?: OrderListFilters): Promise<Order[]> {
    return this.orderRepository.list(filters);
  }

  async getById(id: string): Promise<Order> {
    const order = await this.orderRepository.getById(id);
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  /**
   * Resolve the retailer to denormalize its lat/lng onto the order as the
   * pickup point — workflow scoring then doesn't need a join. Throws if the
   * retailer doesn't exist.
   */
  async create(input: CreateOrderInput): Promise<Order> {
    const retailer = await this.retailerRepository.getById(input.retailerId);
    if (!retailer) {
      throw new NotFoundException(
        `Retailer ${input.retailerId} not found; cannot create order.`,
      );
    }

    const order = await this.orderRepository.create({
      retailerId: input.retailerId,
      pickupLatitude: retailer.latitude,
      pickupLongitude: retailer.longitude,
      dropLatitude: input.dropLatitude,
      dropLongitude: input.dropLongitude,
      dropAddress: input.dropAddress ?? null,
      state: 'Created',
      zone: retailer.zone ?? null,
      station: retailer.station ?? null,
    });

    await this.systemEventService.emit(
      'OrderCreated',
      `Order ${order.id.slice(0, 8)} created`,
      { orderId: order.id, retailerId: order.retailerId },
    );
    return order;
  }

  async update(id: string, data: Partial<Order>): Promise<Order> {
    const updated = await this.orderRepository.update(id, data);
    if (!updated) throw new NotFoundException(`Order ${id} not found`);
    return updated;
  }

  /**
   * Manual order state transition with validation. Mostly used for Cancel,
   * since the workflow drives the happy-path transitions. On Cancelled (and
   * defensively on Delivered) we release the assigned rider.
   */
  async transitionState(id: string, newState: OrderState): Promise<Order> {
    const order = await this.orderRepository.getById(id);
    if (!order) throw new NotFoundException(`Order ${id} not found`);

    const allowed = ORDER_TRANSITIONS[order.state] ?? [];
    if (!allowed.includes(newState)) {
      throw new BadRequestException(
        `Invalid transition: ${order.state} → ${newState}`,
      );
    }

    const now = new Date();
    const patch: Partial<Order> = { state: newState };
    if (newState === 'ArriveAtPickup') patch.arrivedAtPickupAt = now;
    if (newState === 'ArriveAtDelivery') patch.arrivedAtDeliveryAt = now;
    if (newState === 'Delivered') patch.deliveredAt = now;
    if (newState === 'Cancelled') patch.cancelledAt = now;

    const updated = await this.orderRepository.update(id, patch);
    if (!updated) throw new NotFoundException(`Order ${id} not found`);

    // Mirror lifecycle timestamps onto the open Accepted performance row so
    // metrics + maps reflect the manual transition path too.
    if (order.assignedRiderId) {
      const lifecycle: { pickedUpAt?: Date; deliveredAt?: Date; cancelledAt?: Date } = {};
      if (newState === 'ArriveAtPickup') lifecycle.pickedUpAt = now;
      if (newState === 'Delivered') lifecycle.deliveredAt = now;
      if (newState === 'Cancelled') lifecycle.cancelledAt = now;
      if (Object.keys(lifecycle).length > 0) {
        await this.riderPerformanceRepository.patchActiveAccept(
          order.assignedRiderId,
          id,
          lifecycle,
        );
      }
    }

    if (
      (newState === 'Delivered' || newState === 'Cancelled') &&
      order.assignedRiderId
    ) {
      const rider = await this.riderRepository.getById(order.assignedRiderId);
      if (rider) {
        await this.riderRepository.update(rider.id, {
          state: 'OnlineIdle',
          currentLoad: Math.max(0, (rider.currentLoad ?? 1) - 1),
        });
        await this.systemEventService.emit(
          'RiderStateChanged',
          `Rider ${rider.id.slice(0, 8)} → OnlineIdle`,
          { riderId: rider.id, newState: 'OnlineIdle' },
        );
      }
    }

    await this.systemEventService.emit(
      'OrderStateChanged',
      `Order ${id.slice(0, 8)} → ${newState}`,
      { orderId: id, newState },
    );
    return updated;
  }
}
