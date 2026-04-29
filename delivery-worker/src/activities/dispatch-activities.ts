import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Activity } from 'nest-temporal-host';
import { generateId } from 'src/utils';
import { computePayout } from 'src/utils/payout';
import { haversineMeters } from 'src/utils/scoring';
import type {
  RiderPerformanceStatus,
  SystemEventType,
} from 'src/enums';
import type {
  AcceptOfferInput,
  DeclineOfferInput,
  FailDispatchInput,
  IssueOfferInput,
  IssuedOffer,
  PreparedCandidatePayout,
  PreparedDispatch,
  TimeoutOfferInput,
  TransitionOrderStateInput,
} from 'src/models/order-models';
import type { DispatchCandidate } from 'src/schemas/dispatch-attempt.schema';
import { DispatchAttempt } from 'src/schemas/dispatch-attempt.schema';
import { Notification } from 'src/schemas/notification.schema';
import { Order } from 'src/schemas/order.schema';
import { Retailer } from 'src/schemas/retailer.schema';
import { Rider } from 'src/schemas/rider.schema';
import { RiderLocation } from 'src/schemas/rider-location.schema';
import { RiderPayment } from 'src/schemas/rider-payment.schema';
import { RiderPerformance } from 'src/schemas/rider-performance.schema';
import { SimConfig } from 'src/schemas/sim-config.schema';
import { SystemEvent } from 'src/schemas/system-event.schema';
import { Tier } from 'src/schemas/tier.schema';

interface LocationSnapshot {
  retailerLatitude?: number | null;
  retailerLongitude?: number | null;
  riderLatitude?: number | null;
  riderLongitude?: number | null;
}

interface PayoutSnapshot {
  payoutAmountGhs: number | null;
  tierIdSnapshot: string | null;
  tierNameSnapshot: string | null;
}

interface GeoSnapshot {
  zoneSnapshot: string | null;
  stationSnapshot: string | null;
}

@Activity()
export class DispatchActivities {
  private readonly logger = new Logger(DispatchActivities.name);

  constructor(
    @InjectModel(Order.name) private readonly orders: Model<Order>,
    @InjectModel(Rider.name) private readonly riders: Model<Rider>,
    @InjectModel(Retailer.name) private readonly retailers: Model<Retailer>,
    @InjectModel(RiderLocation.name)
    private readonly riderLocations: Model<RiderLocation>,
    @InjectModel(RiderPerformance.name)
    private readonly performances: Model<RiderPerformance>,
    @InjectModel(RiderPayment.name)
    private readonly payments: Model<RiderPayment>,
    @InjectModel(Tier.name) private readonly tiers: Model<Tier>,
    @InjectModel(SimConfig.name) private readonly configs: Model<SimConfig>,
    @InjectModel(DispatchAttempt.name)
    private readonly attempts: Model<DispatchAttempt>,
    @InjectModel(Notification.name)
    private readonly notifications: Model<Notification>,
    @InjectModel(SystemEvent.name)
    private readonly events: Model<SystemEvent>,
  ) {}

  // -------------------------------------------------------------------------
  // 1. prepareDispatch — load eligible on-duty riders, rank by proximity to
  //    the order's pickup point, take top N, persist DispatchAttempt + flip
  //    order to PendingRiderAccept.
  // -------------------------------------------------------------------------

  async prepareDispatch(orderId: string): Promise<PreparedDispatch> {
    const order = await this.orders.findOne({ id: orderId }).lean();
    if (!order) throw new Error(`Order ${orderId} not found`);
    if (order.state !== 'Created' && order.state !== 'FailedToDispatch') {
      throw new Error(
        `Order ${orderId} is in state ${order.state}; cannot dispatch.`,
      );
    }

    const config = await this.configs.findOne({}).lean();
    if (!config) throw new Error('SimConfig is not initialised');

    // Active on-duty riders → look up their last-known locations → distance
    // from rider to pickup → keep within proximity radius → top N.
    const onDuty = await this.riders
      .find({ state: 'OnlineIdle', isEligible: true })
      .lean();
    const riderIds = onDuty.map((r) => r.id);
    const locations = await this.riderLocations
      .find({ riderId: { $in: riderIds } })
      .lean();
    const locationByRider = new Map(locations.map((l) => [l.riderId, l]));

    type Ranked = { rider: Rider; distanceMeters: number };
    const rankedOrNull: Array<Ranked | null> = onDuty.map((rider) => {
      const loc = locationByRider.get(rider.id);
      if (!loc) return null;
      const distanceMeters = haversineMeters(
        { latitude: loc.latitude, longitude: loc.longitude },
        { latitude: order.pickupLatitude, longitude: order.pickupLongitude },
      );
      return { rider, distanceMeters };
    });
    const ranked: Ranked[] = rankedOrNull
      .filter((x): x is Ranked => x !== null)
      .filter((x) => x.distanceMeters <= config.proximityRadiusMeters)
      .filter((x) => x.rider.currentLoad < 1)
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, config.maxCandidatesPerDispatch);

    // Familiarity index = how many orders this rider has accepted in the
    // current order's zone. Looked up per candidate and normalised across
    // the candidate pool so the most-familiar rider scores 1.0. Combined
    // with proximityScore via the configurable weights so dispatch can
    // favour riders who know the area.
    const familiarityByRider = new Map<string, number>();
    if (order.zone) {
      const counts = await Promise.all(
        ranked.map(async (x) => {
          const count = await this.performances.countDocuments({
            riderId: x.rider.id,
            status: 'Accepted',
            zoneSnapshot: order.zone,
          });
          return [x.rider.id, count] as const;
        }),
      );
      for (const [id, count] of counts) familiarityByRider.set(id, count);
    } else {
      for (const x of ranked) familiarityByRider.set(x.rider.id, 0);
    }
    const maxFamiliarity = Math.max(
      0,
      ...Array.from(familiarityByRider.values()),
    );

    const proximityWeight = config.proximityWeight ?? 0.7;
    const familiarityWeight = config.familiarityWeight ?? 0.3;

    type Scored = {
      ranked: Ranked;
      proximityScore: number;
      familiarityIndex: number;
      familiarityScore: number;
      combinedScore: number;
    };
    const scored: Scored[] = ranked.map((x) => {
      const proximityScore = 1 - x.distanceMeters / config.proximityRadiusMeters;
      const familiarityIndex = familiarityByRider.get(x.rider.id) ?? 0;
      const familiarityScore =
        maxFamiliarity > 0 ? familiarityIndex / maxFamiliarity : 0;
      const combinedScore =
        proximityWeight * proximityScore +
        familiarityWeight * familiarityScore;
      return {
        ranked: x,
        proximityScore,
        familiarityIndex,
        familiarityScore,
        combinedScore,
      };
    });
    scored.sort((a, b) => b.combinedScore - a.combinedScore);

    const candidates: DispatchCandidate[] = scored.map((s, idx) => ({
      riderId: s.ranked.rider.id,
      rank: idx + 1,
      score: s.combinedScore,
      distanceMeters: s.ranked.distanceMeters,
      offerStatus: 'Pending',
      respondedAt: null,
      familiarityIndex: s.familiarityIndex,
      proximityScore: s.proximityScore,
      familiarityScore: s.familiarityScore,
      combinedScore: s.combinedScore,
    }));

    // Pre-compute each candidate's locked-at-issue payout. Forwarded onto
    // the workflow's IssueOffer call so each notification carries the
    // figure that should entice the rider to accept.
    const tierIds = Array.from(new Set(ranked.map((x) => x.rider.tierId)));
    const tierDocs = await this.tiers.find({ id: { $in: tierIds } }).lean();
    const tierById = new Map(tierDocs.map((t) => [t.id, t]));
    const payouts: PreparedCandidatePayout[] = [];
    for (const x of ranked) {
      const tier = tierById.get(x.rider.tierId);
      const todayDelivered = await this.todayDeliveredCount(x.rider.id);
      if (!tier) {
        payouts.push({
          riderId: x.rider.id,
          estimatedPayoutGhs: 0,
          todayDeliveredCount: todayDelivered,
        });
        continue;
      }
      const computed = computePayout(tier, todayDelivered);
      payouts.push({
        riderId: x.rider.id,
        estimatedPayoutGhs: computed.totalPayoutGhs,
        todayDeliveredCount: todayDelivered,
      });
    }

    const now = new Date();
    const attemptId = generateId();
    await this.attempts.create({
      id: attemptId,
      orderId,
      startedAt: now,
      completedAt: null,
      outcome: 'InProgress',
      candidates,
      winningRiderId: null,
      createdAt: now,
      updatedAt: now,
    });

    await this.orders.findOneAndUpdate(
      { id: orderId },
      { $set: { state: 'PendingRiderAccept', updatedAt: now } },
    );

    await this.emitEvent(
      'OrderStateChanged',
      `Order ${orderId.slice(0, 8)} → PendingRiderAccept`,
      { orderId, newState: 'PendingRiderAccept', attemptId },
    );

    return {
      orderId,
      attemptId,
      offerTimeoutSeconds: config.offerTimeoutSeconds,
      arriveAtPickupDelaySeconds: config.arriveAtPickupDelaySeconds,
      arriveAtDeliveryDelaySeconds: config.arriveAtDeliveryDelaySeconds,
      confirmDeliveryDelaySeconds: config.confirmDeliveryDelaySeconds,
      candidates,
      payouts,
    };
  }

  // -------------------------------------------------------------------------
  // 2. issueOffer — create Notification, mark order's dispatchedAt on first
  //    offer, emit OfferIssued event.
  // -------------------------------------------------------------------------

  async issueOffer(input: IssueOfferInput): Promise<IssuedOffer> {
    const now = new Date();
    const timesOutAt = new Date(now.getTime() + input.timeoutSeconds * 1000);
    const notificationId = generateId();

    await this.notifications.create({
      id: notificationId,
      orderId: input.orderId,
      riderId: input.riderId,
      status: 'Pending',
      offerRank: input.rank,
      score: input.score,
      distanceMeters: input.distanceMeters,
      issuedAt: now,
      timesOutAt,
      respondedAt: null,
      estimatedPayoutGhs: input.estimatedPayoutGhs,
      createdAt: now,
      updatedAt: now,
    });

    if (input.isFirstOffer) {
      await this.orders.findOneAndUpdate(
        { id: input.orderId },
        { $set: { dispatchedAt: now, updatedAt: now } },
      );
    }

    await this.emitEvent(
      'OfferIssued',
      `Offer #${input.rank} issued to ${input.riderId.slice(0, 8)}`,
      {
        orderId: input.orderId,
        riderId: input.riderId,
        rank: input.rank,
        notificationId,
        attemptId: input.attemptId,
      },
    );

    return { notificationId, timesOutAt: timesOutAt.toISOString() };
  }

  // -------------------------------------------------------------------------
  // 3. acceptOffer — flip order to RiderAccepted, attach the rider, attempt
  //    Succeeded, log to performance.
  // -------------------------------------------------------------------------

  async acceptOffer(input: AcceptOfferInput): Promise<void> {
    const now = new Date();

    await this.notifications.findOneAndUpdate(
      { id: input.notificationId },
      { $set: { status: 'Accepted', respondedAt: now, updatedAt: now } },
    );

    await this.attempts.findOneAndUpdate(
      { id: input.attemptId, 'candidates.riderId': input.riderId },
      {
        $set: {
          'candidates.$.offerStatus': 'Accepted',
          'candidates.$.respondedAt': now,
          outcome: 'Succeeded',
          completedAt: now,
          winningRiderId: input.riderId,
          updatedAt: now,
        },
      },
    );

    await this.orders.findOneAndUpdate(
      { id: input.orderId },
      {
        $set: {
          state: 'RiderAccepted',
          assignedRiderId: input.riderId,
          acceptedAt: now,
          updatedAt: now,
        },
      },
    );

    await this.riders.findOneAndUpdate(
      { id: input.riderId },
      {
        $set: { state: 'OnlineAssigned', updatedAt: now },
        $inc: { currentLoad: 1 },
      },
    );

    const snapshot = await this.snapshotLocations(
      input.orderId,
      input.riderId,
    );
    const payoutSnapshot = await this.snapshotPayoutAtAccept(
      input.notificationId,
      input.riderId,
    );
    await this.logPerformance(
      input.riderId,
      input.orderId,
      'Accepted',
      `Accepted offer #${input.rank}`,
      snapshot,
      payoutSnapshot,
      {
        zoneSnapshot: snapshot.zoneSnapshot,
        stationSnapshot: snapshot.stationSnapshot,
      },
    );

    await this.emitEvent(
      'OfferAccepted',
      `Offer accepted by ${input.riderId.slice(0, 8)}`,
      {
        orderId: input.orderId,
        riderId: input.riderId,
        notificationId: input.notificationId,
      },
    );
    await this.emitEvent(
      'OrderStateChanged',
      `Order ${input.orderId.slice(0, 8)} → RiderAccepted`,
      { orderId: input.orderId, newState: 'RiderAccepted' },
    );
    await this.emitEvent(
      'DispatchSucceeded',
      `Order ${input.orderId.slice(0, 8)} assigned to ${input.riderId.slice(0, 8)}`,
      { orderId: input.orderId, riderId: input.riderId },
    );
    await this.emitEvent(
      'RiderStateChanged',
      `Rider ${input.riderId.slice(0, 8)} → OnlineAssigned`,
      { riderId: input.riderId, newState: 'OnlineAssigned' },
    );
  }

  // -------------------------------------------------------------------------
  // 4. declineOffer — mark notification declined, increment declinesToday,
  //    flip eligibility off if at cap, emit OfferDeclined.
  // -------------------------------------------------------------------------

  async declineOffer(input: DeclineOfferInput): Promise<void> {
    const now = new Date();

    await this.notifications.findOneAndUpdate(
      { id: input.notificationId },
      { $set: { status: 'Declined', respondedAt: now, updatedAt: now } },
    );

    await this.attempts.findOneAndUpdate(
      { id: input.attemptId, 'candidates.riderId': input.riderId },
      {
        $set: {
          'candidates.$.offerStatus': 'Declined',
          'candidates.$.respondedAt': now,
          updatedAt: now,
        },
      },
    );

    const updatedRider = await this.riders.findOneAndUpdate(
      { id: input.riderId },
      { $inc: { declinesToday: 1 }, $set: { updatedAt: now } },
      { new: true },
    );

    let capHit = false;
    if (updatedRider && updatedRider.declinesToday >= input.declineCapPerDay) {
      await this.riders.findOneAndUpdate(
        { id: input.riderId },
        {
          $set: {
            isEligible: false,
            ineligibilityReason: 'decline cap reached',
            updatedAt: now,
          },
        },
      );
      capHit = true;
    }

    const declineSnapshot = await this.snapshotLocations(
      input.orderId,
      input.riderId,
    );
    await this.logPerformance(
      input.riderId,
      input.orderId,
      'Declined',
      `Declined offer #${input.rank}`,
      declineSnapshot,
      undefined,
      {
        zoneSnapshot: declineSnapshot.zoneSnapshot,
        stationSnapshot: declineSnapshot.stationSnapshot,
      },
    );

    await this.emitEvent(
      'OfferDeclined',
      `Offer declined by ${input.riderId.slice(0, 8)}`,
      {
        orderId: input.orderId,
        riderId: input.riderId,
        notificationId: input.notificationId,
      },
    );
    if (capHit) {
      await this.emitEvent(
        'RiderEligibilityChanged',
        `Rider ${input.riderId.slice(0, 8)} eligibility off — decline cap reached`,
        { riderId: input.riderId, isEligible: false },
      );
    }
  }

  // -------------------------------------------------------------------------
  // 5. timeoutOffer — same advance-to-next semantics as a decline, but logged
  //    as TimedOut so audit trails distinguish ignored from explicit refusal.
  // -------------------------------------------------------------------------

  async timeoutOffer(input: TimeoutOfferInput): Promise<void> {
    const now = new Date();

    await this.notifications.findOneAndUpdate(
      { id: input.notificationId, status: 'Pending' },
      { $set: { status: 'TimedOut', respondedAt: now, updatedAt: now } },
    );

    await this.attempts.findOneAndUpdate(
      { id: input.attemptId, 'candidates.riderId': input.riderId },
      {
        $set: {
          'candidates.$.offerStatus': 'TimedOut',
          'candidates.$.respondedAt': now,
          updatedAt: now,
        },
      },
    );

    const timeoutSnapshot = await this.snapshotLocations(
      input.orderId,
      input.riderId,
    );
    await this.logPerformance(
      input.riderId,
      input.orderId,
      'TimedOut',
      `Did not respond to offer #${input.rank} within timeout`,
      timeoutSnapshot,
      undefined,
      {
        zoneSnapshot: timeoutSnapshot.zoneSnapshot,
        stationSnapshot: timeoutSnapshot.stationSnapshot,
      },
    );

    await this.emitEvent(
      'OfferTimedOut',
      `Offer timed out for ${input.riderId.slice(0, 8)}`,
      {
        orderId: input.orderId,
        riderId: input.riderId,
        notificationId: input.notificationId,
      },
    );
  }

  // -------------------------------------------------------------------------
  // 6. failDispatch — order to FailedToDispatch, attempt to Failed.
  // -------------------------------------------------------------------------

  async failDispatch(input: FailDispatchInput): Promise<void> {
    const now = new Date();

    await this.orders.findOneAndUpdate(
      { id: input.orderId },
      { $set: { state: 'FailedToDispatch', updatedAt: now } },
    );

    if (input.attemptId) {
      await this.attempts.findOneAndUpdate(
        { id: input.attemptId },
        { $set: { outcome: 'Failed', completedAt: now, updatedAt: now } },
      );
    }

    await this.emitEvent(
      'DispatchFailed',
      `Order ${input.orderId.slice(0, 8)} failed to dispatch — ${input.reason}`,
      { orderId: input.orderId, reason: input.reason },
    );
    await this.emitEvent(
      'OrderStateChanged',
      `Order ${input.orderId.slice(0, 8)} → FailedToDispatch`,
      { orderId: input.orderId, newState: 'FailedToDispatch' },
    );
  }

  // -------------------------------------------------------------------------
  // 7. transitionOrderState — auto-progress steps after acceptance:
  //    ArriveAtPickup → ArriveAtDelivery → Delivered. On Delivered, we
  //    release the assigned rider so they're ready for new offers.
  // -------------------------------------------------------------------------

  async transitionOrderState(input: TransitionOrderStateInput): Promise<void> {
    const now = new Date();
    const patch: Record<string, unknown> = {
      state: input.newState,
      updatedAt: now,
    };
    if (input.newState === 'ArriveAtPickup') patch.arrivedAtPickupAt = now;
    if (input.newState === 'ArriveAtDelivery') patch.arrivedAtDeliveryAt = now;
    if (input.newState === 'Delivered') patch.deliveredAt = now;

    const order = await this.orders
      .findOneAndUpdate({ id: input.orderId }, { $set: patch }, { new: true })
      .lean();
    if (!order) {
      this.logger.warn(`Order ${input.orderId} not found during auto-progress`);
      return;
    }

    // Patch the open Accepted performance row so the rider page can show the
    // full pickup → delivery timeline without re-joining `orders`.
    if (
      (input.newState === 'ArriveAtPickup' ||
        input.newState === 'Delivered') &&
      order.assignedRiderId
    ) {
      const lifecycleField =
        input.newState === 'ArriveAtPickup' ? 'pickedUpAt' : 'deliveredAt';
      await this.performances.findOneAndUpdate(
        {
          orderId: input.orderId,
          riderId: order.assignedRiderId,
          status: 'Accepted',
        },
        { $set: { [lifecycleField]: now, updatedAt: now } },
        { sort: { timestamp: -1 } },
      );
    }

    // On Delivered, mimic the rider payment: write a RiderPayment row using
    // the locked-at-issue notification payout + the rider's current tier
    // snapshot. We recompute the breakdown using the rider's
    // todays-delivered count *before* this delivery so the breakdown lines
    // match what the rider was originally promised.
    if (input.newState === 'Delivered' && order.assignedRiderId) {
      await this.recordRiderPayment(input.orderId, order.assignedRiderId);
    }

    // Release rider on Delivered.
    if (input.newState === 'Delivered' && order.assignedRiderId) {
      await this.riders.findOneAndUpdate(
        { id: order.assignedRiderId },
        {
          $set: { state: 'OnlineIdle', updatedAt: now },
          $inc: { currentLoad: -1 },
        },
      );
      // Floor at zero in case currentLoad was already 0.
      await this.riders.updateOne(
        { id: order.assignedRiderId, currentLoad: { $lt: 0 } },
        { $set: { currentLoad: 0 } },
      );
      await this.emitEvent(
        'RiderStateChanged',
        `Rider ${order.assignedRiderId.slice(0, 8)} → OnlineIdle`,
        { riderId: order.assignedRiderId, newState: 'OnlineIdle' },
      );
    }

    await this.emitEvent(
      'OrderStateChanged',
      `Order ${input.orderId.slice(0, 8)} → ${input.newState}`,
      { orderId: input.orderId, newState: input.newState },
    );
  }

  // -------------------------------------------------------------------------
  // helpers
  // -------------------------------------------------------------------------

  private async logPerformance(
    riderId: string,
    orderId: string,
    status: RiderPerformanceStatus,
    notes: string | null = null,
    snapshot: LocationSnapshot = {},
    payout: PayoutSnapshot = {
      payoutAmountGhs: null,
      tierIdSnapshot: null,
      tierNameSnapshot: null,
    },
    geo: GeoSnapshot = { zoneSnapshot: null, stationSnapshot: null },
  ): Promise<void> {
    const now = new Date();
    await this.performances.create({
      id: generateId(),
      riderId,
      orderId,
      status,
      notes,
      timestamp: now,
      retailerLatitude: snapshot.retailerLatitude ?? null,
      retailerLongitude: snapshot.retailerLongitude ?? null,
      riderLatitude: snapshot.riderLatitude ?? null,
      riderLongitude: snapshot.riderLongitude ?? null,
      pickedUpAt: null,
      deliveredAt: null,
      cancelledAt: null,
      payoutAmountGhs: payout.payoutAmountGhs,
      tierIdSnapshot: payout.tierIdSnapshot,
      tierNameSnapshot: payout.tierNameSnapshot,
      zoneSnapshot: geo.zoneSnapshot,
      stationSnapshot: geo.stationSnapshot,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Snapshots retailer + rider location at the moment of an offer response so
   * the rider page can later plot accept/decline traffic without re-joining
   * mutating tables. Also pulls zone/station off the order doc so the perf
   * record carries the operational geography it was decided in.
   */
  private async snapshotLocations(
    orderId: string,
    riderId: string,
  ): Promise<LocationSnapshot & GeoSnapshot> {
    const order = await this.orders.findOne({ id: orderId }).lean();
    const riderLoc = await this.riderLocations
      .findOne({ riderId })
      .sort({ updatedAt: -1 })
      .lean();
    return {
      retailerLatitude: order?.pickupLatitude ?? null,
      retailerLongitude: order?.pickupLongitude ?? null,
      riderLatitude: riderLoc?.latitude ?? null,
      riderLongitude: riderLoc?.longitude ?? null,
      zoneSnapshot: order?.zone ?? null,
      stationSnapshot: order?.station ?? null,
    };
  }

  /**
   * Reads the locked-at-issue payout off the notification and the rider's
   * tier metadata so the perf record carries the figure the rider committed
   * to (and the tier they were on at decision time).
   */
  private async snapshotPayoutAtAccept(
    notificationId: string,
    riderId: string,
  ): Promise<PayoutSnapshot> {
    const notif = await this.notifications.findOne({ id: notificationId }).lean();
    const rider = await this.riders.findOne({ id: riderId }).lean();
    const tier = rider
      ? await this.tiers.findOne({ id: rider.tierId }).lean()
      : null;
    return {
      payoutAmountGhs: notif?.estimatedPayoutGhs ?? null,
      tierIdSnapshot: tier?.id ?? null,
      tierNameSnapshot: tier?.name ?? null,
    };
  }

  private async todayDeliveredCount(riderId: string): Promise<number> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return this.performances.countDocuments({
      riderId,
      deliveredAt: { $gte: startOfToday },
    });
  }

  /**
   * On Delivered, simulate the rider payment. The total uses the
   * locked-at-issue value from the perf record so the rider is paid what
   * they were originally promised; the breakdown is recomputed against the
   * todays-delivered-count *before* this delivery (the lifecycle patch has
   * already incremented it). Tier rules are denormalised onto the payment
   * doc so future tier edits don't rewrite history.
   */
  private async recordRiderPayment(
    orderId: string,
    riderId: string,
  ): Promise<void> {
    const perf = await this.performances
      .findOne({ orderId, riderId, status: 'Accepted' })
      .sort({ timestamp: -1 })
      .lean();
    const rider = await this.riders.findOne({ id: riderId }).lean();
    const tier = rider
      ? await this.tiers.findOne({ id: rider.tierId }).lean()
      : null;
    if (!tier) {
      this.logger.warn(
        `recordRiderPayment: tier missing for rider ${riderId}; skipping payment`,
      );
      return;
    }

    const totalDeliveredNow = await this.todayDeliveredCount(riderId);
    const upcomingNumberAtAccept = Math.max(1, totalDeliveredNow);
    const computed = computePayout(tier, upcomingNumberAtAccept - 1);

    const totalPayoutGhs = perf?.payoutAmountGhs ?? computed.totalPayoutGhs;

    const now = new Date();
    await this.payments.create({
      id: generateId(),
      riderId,
      orderId,
      basePayoutGhs: computed.basePayoutGhs,
      totalPayoutGhs,
      bonusBreakdown: computed.bonusBreakdown,
      tierSnapshot: {
        id: tier.id,
        name: tier.name,
        basePayoutGhs: tier.basePayoutGhs ?? 0,
        bonusRules: tier.bonusRules ?? [],
      },
      todayDeliveredCountAtPayment: upcomingNumberAtAccept,
      paidAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await this.emitEvent(
      'PaymentRecorded',
      `Rider ${riderId.slice(0, 8)} paid GHS ${totalPayoutGhs} for order ${orderId.slice(0, 8)}`,
      { orderId, riderId, totalPayoutGhs },
    );
  }

  private async emitEvent(
    type: SystemEventType,
    summary: string,
    details: Record<string, unknown> = {},
  ): Promise<void> {
    const now = new Date();
    await this.events.create({
      id: generateId(),
      type,
      timestamp: now,
      summary,
      details,
      createdAt: now,
      updatedAt: now,
    });
  }
}
