import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { TemporalClientService } from 'nest-temporal-client';
import {
  DISPATCH_ORDER_WORKFLOW_NAME,
  DISPATCH_TASK_QUEUE,
  DispatchWorkflowSignals,
} from 'src/enums/simulator';
import { OrderRepository } from 'src/repositories/order.repository';
import { NotificationRepository } from 'src/repositories/notification.repository';

interface DispatchResult {
  workflowId: string;
  orderId: string;
}

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    private readonly temporalClient: TemporalClientService,
    private readonly orderRepository: OrderRepository,
    private readonly notificationRepository: NotificationRepository,
  ) {}

  /**
   * Starts (or re-starts) the dispatch workflow for an order. We use a
   * deterministic workflow id `simulator-order-<orderId>` so a follow-up
   * dispatch for the same order replaces any prior workflow on the cluster.
   */
  async dispatch(orderId: string): Promise<DispatchResult> {
    const order = await this.orderRepository.getById(orderId);
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.state !== 'Created' && order.state !== 'FailedToDispatch') {
      throw new ConflictException(
        `Order is in state ${order.state}; only Created or FailedToDispatch can be dispatched.`,
      );
    }

    const workflowId = workflowIdForOrder(orderId);
    try {
      await this.temporalClient.startWorkflow({
        workflowId,
        workflowName: DISPATCH_ORDER_WORKFLOW_NAME,
        taskQueue: DISPATCH_TASK_QUEUE,
        args: [orderId],
      });
    } catch (err) {
      this.logger.error('Failed to start dispatch workflow', err);
      throw err;
    }

    return { workflowId, orderId };
  }

  /**
   * Forwards a rider's accept/decline to the running dispatch workflow as a
   * `respondToOffer` signal. Validates the notification exists and is still
   * Pending before signalling so we don't fan stale clicks into the workflow.
   */
  async respond(
    notificationId: string,
    action: 'accept' | 'decline',
  ): Promise<{ workflowId: string; orderId: string }> {
    const notification =
      await this.notificationRepository.getById(notificationId);
    if (!notification) {
      throw new NotFoundException(`Notification ${notificationId} not found`);
    }
    if (notification.status !== 'Pending') {
      throw new ConflictException(
        `Notification already ${notification.status}; cannot respond.`,
      );
    }
    if (action !== 'accept' && action !== 'decline') {
      throw new BadRequestException(
        `Unknown action "${action}"; expected "accept" or "decline".`,
      );
    }

    const workflowId = workflowIdForOrder(notification.orderId);

    try {
      await this.temporalClient.signalWorkflow({
        workflowId,
        signalName: DispatchWorkflowSignals.RESPOND_TO_OFFER,
        args: [{ notificationId, action }],
      });
    } catch (err) {
      this.logger.error('Failed to signal dispatch workflow', err);
      throw err;
    }

    return { workflowId, orderId: notification.orderId };
  }
}

function workflowIdForOrder(orderId: string): string {
  return `simulator-order-${orderId}`;
}
