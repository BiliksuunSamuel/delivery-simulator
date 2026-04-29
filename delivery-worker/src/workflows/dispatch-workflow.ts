import {
  createWorkflow,
  Execute,
  Query,
  Signal,
  TemporalWorkflow,
  Workflow,
} from 'nest-temporal-host/workflow';
import { proxyActivities, sleep } from '@temporalio/workflow';
import type { DispatchActivities } from 'src/activities/dispatch-activities';
import { WorkflowQueries, WorkflowSignals } from 'src/enums';
import type {
  DispatchWorkflowStatus,
  OfferResponseSignal,
  PreparedCandidatePayout,
} from 'src/models/order-models';
import type { DispatchCandidate } from 'src/schemas/dispatch-attempt.schema';

const {
  prepareDispatch,
  issueOffer,
  acceptOffer,
  declineOffer,
  timeoutOffer,
  failDispatch,
  transitionOrderState,
} = proxyActivities<DispatchActivities>({
  startToCloseTimeout: '30 seconds',
  retry: { maximumAttempts: 3 },
});

interface WorkflowState {
  orderId: string;
  attemptId: string | null;
  candidates: DispatchCandidate[];
  currentRank: number;
  activeNotificationId: string | null;
  /** Set by the respondToOffer signal; the offer loop's waitUntil checks it. */
  response: OfferResponseSignal | null;
  outcome: 'InProgress' | 'Succeeded' | 'Failed';
  startedAt: string;
  completedAt: string | null;
}

@Workflow()
class DispatchOrderWorkflowClass extends TemporalWorkflow {
  private state: WorkflowState | null = null;

  @Execute()
  async run(orderId: string): Promise<DispatchWorkflowStatus> {
    this.state = {
      orderId,
      attemptId: null,
      candidates: [],
      currentRank: 0,
      activeNotificationId: null,
      response: null,
      outcome: 'InProgress',
      startedAt: new Date().toISOString(),
      completedAt: null,
    };

    // 1. Prepare: rank on-duty riders by proximity, persist DispatchAttempt,
    //    flip order to PendingRiderAccept.
    let prepared;
    try {
      prepared = await prepareDispatch(orderId);
    } catch (err) {
      console.error('prepareDispatch failed', err);
      await failDispatch({
        orderId,
        attemptId: null,
        reason: err instanceof Error ? err.message : 'preparation failed',
      });
      this.state.outcome = 'Failed';
      this.state.completedAt = new Date().toISOString();
      return this.snapshot();
    }

    this.state.attemptId = prepared.attemptId;
    this.state.candidates = prepared.candidates;

    if (prepared.candidates.length === 0) {
      await failDispatch({
        orderId,
        attemptId: prepared.attemptId,
        reason: 'No on-duty riders within proximity radius.',
      });
      this.state.outcome = 'Failed';
      this.state.completedAt = new Date().toISOString();
      return this.snapshot();
    }

    // 2. Sequential offer loop. Stale signals can never match a fresh
    //    iteration's notificationId because the predicate compares against
    //    the freshly issued one.
    let accepted: { riderId: string; notificationId: string } | null = null;
    for (let i = 0; i < prepared.candidates.length; i++) {
      const candidate = prepared.candidates[i];
      this.state.currentRank = candidate.rank;

      const payout = prepared.payouts.find(
        (p: PreparedCandidatePayout) => p.riderId === candidate.riderId,
      );
      const issued = await issueOffer({
        orderId,
        attemptId: prepared.attemptId,
        riderId: candidate.riderId,
        rank: candidate.rank,
        score: candidate.score,
        distanceMeters: candidate.distanceMeters,
        timeoutSeconds: prepared.offerTimeoutSeconds,
        isFirstOffer: i === 0,
        estimatedPayoutGhs: payout?.estimatedPayoutGhs ?? null,
      });
      this.state.activeNotificationId = issued.notificationId;

      const responded = await this.waitUntil(
        () => this.state?.response?.notificationId === issued.notificationId,
        `${prepared.offerTimeoutSeconds} seconds`,
      );

      const response: OfferResponseSignal | null =
        this.state?.response ?? null;

      if (responded && response) {
        if (response.action === 'accept') {
          await acceptOffer({
            orderId,
            attemptId: prepared.attemptId,
            notificationId: issued.notificationId,
            riderId: candidate.riderId,
            rank: candidate.rank,
          });
          accepted = {
            riderId: candidate.riderId,
            notificationId: issued.notificationId,
          };
          break;
        }
        // Declined → walk to next candidate.
        await declineOffer({
          orderId,
          attemptId: prepared.attemptId,
          notificationId: issued.notificationId,
          riderId: candidate.riderId,
          rank: candidate.rank,
          declineCapPerDay: 3,
        });
      } else {
        // Timed out → treat as decline functionally, log as TimedOut.
        await timeoutOffer({
          orderId,
          attemptId: prepared.attemptId,
          notificationId: issued.notificationId,
          riderId: candidate.riderId,
          rank: candidate.rank,
        });
      }
    }

    if (!accepted) {
      // 3a. List exhausted with nobody accepting → fail dispatch.
      await failDispatch({
        orderId,
        attemptId: prepared.attemptId,
        reason: 'All candidates declined or timed out.',
      });
      this.state.outcome = 'Failed';
      this.state.completedAt = new Date().toISOString();
      this.state.activeNotificationId = null;
      return this.snapshot();
    }

    // 3b. Auto-progress the rest of the lifecycle. Each transition is
    //     gated by a Temporal-aware sleep, so the workflow survives worker
    //     restarts and the timer is durable on the server side.
    this.state.activeNotificationId = null;

    await sleep(`${prepared.arriveAtPickupDelaySeconds} seconds`);
    await transitionOrderState({ orderId, newState: 'ArriveAtPickup' });

    await sleep(`${prepared.arriveAtDeliveryDelaySeconds} seconds`);
    await transitionOrderState({ orderId, newState: 'ArriveAtDelivery' });

    await sleep(`${prepared.confirmDeliveryDelaySeconds} seconds`);
    await transitionOrderState({ orderId, newState: 'Delivered' });

    this.state.outcome = 'Succeeded';
    this.state.completedAt = new Date().toISOString();
    return this.snapshot();
  }

  @Signal(WorkflowSignals.RESPOND_TO_OFFER)
  async respondToOffer(payload: OfferResponseSignal): Promise<void> {
    if (!this.state) return;
    if (payload.notificationId !== this.state.activeNotificationId) {
      console.warn(
        `Ignoring stale offer response: signal=${payload.notificationId} active=${this.state.activeNotificationId}`,
      );
      return;
    }
    this.state.response = payload;
  }

  @Query(WorkflowQueries.STATUS)
  status(): DispatchWorkflowStatus | null {
    if (!this.state) return null;
    return this.snapshot();
  }

  private snapshot(): DispatchWorkflowStatus {
    if (!this.state) {
      throw new Error('Workflow state not initialised');
    }
    return {
      orderId: this.state.orderId,
      attemptId: this.state.attemptId,
      outcome: this.state.outcome,
      totalCandidates: this.state.candidates.length,
      currentRank: this.state.currentRank,
      activeNotificationId: this.state.activeNotificationId,
      startedAt: this.state.startedAt,
      completedAt: this.state.completedAt,
    };
  }
}

export const DispatchOrderWorkflow = createWorkflow(DispatchOrderWorkflowClass);
