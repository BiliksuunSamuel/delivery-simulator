import type {
  DispatchAttempt,
  DispatchCandidate,
  Notification,
  Order,
} from "@/lib/types";
import { scoreByProximity } from "@/lib/utils/scoring";
import { getStore, newId, nowIso } from "./store";

interface OfferTimer {
  notificationId: string;
  timeoutId: ReturnType<typeof setTimeout>;
}

const activeTimers = new Map<string, OfferTimer>();

function clearOfferTimer(orderId: string) {
  const t = activeTimers.get(orderId);
  if (t) {
    clearTimeout(t.timeoutId);
    activeTimers.delete(orderId);
  }
}

export function startDispatch(orderId: string): Order {
  const store = getStore();
  const state = store.getState();
  const order = state.orders.find((o) => o.id === orderId);
  if (!order) throw new Error(`Order ${orderId} not found`);
  if (order.state !== "Created" && order.state !== "FailedToDispatch") {
    throw new Error(`Order ${orderId} is in state ${order.state}; cannot dispatch.`);
  }

  const cfg = state.config;
  const retailer = state.retailers.find((r) => r.id === order.retailerId);
  if (!retailer) throw new Error(`Retailer ${order.retailerId} not found`);

  // Mock mode keeps no `rider_locations` collection — fall back to a fixed
  // dummy point per rider so the loop can still demo. Real backend uses
  // the rider_locations collection seeded by the location-jitter cron.
  const eligibleRiders = state.riders.filter(
    (r) => r.isEligible && r.state === "OnlineIdle"
  );
  const scored = eligibleRiders
    .map((r) => ({
      rider: r,
      score: scoreByProximity(
        { latitude: retailer.latitude, longitude: retailer.longitude },
        { latitude: order.pickupLatitude, longitude: order.pickupLongitude },
        cfg.proximityRadiusMeters,
      ),
    }))
    .filter((x) => x.score.distanceMeters <= cfg.proximityRadiusMeters)
    .filter((x) => x.rider.currentLoad < 1)
    .sort((a, b) => a.score.distanceMeters - b.score.distanceMeters)
    .slice(0, cfg.maxCandidatesPerDispatch);

  const candidates: DispatchCandidate[] = scored.map((x, idx) => ({
    riderId: x.rider.id,
    rank: idx + 1,
    score: x.score.total,
    distanceMeters: x.score.distanceMeters,
    offerStatus: "Pending",
    respondedAt: null,
  }));

  const t = nowIso();
  const attempt: DispatchAttempt = {
    id: newId(),
    orderId,
    startedAt: t,
    completedAt: null,
    outcome: "InProgress",
    candidates,
    winningRiderId: null,
    createdAt: t,
    updatedAt: t,
  };

  store.setState((s) => ({
    ...s,
    dispatchAttempts: [
      ...s.dispatchAttempts.filter((a) => a.orderId !== orderId),
      attempt,
    ],
    orders: s.orders.map((o) =>
      o.id === orderId
        ? { ...o, state: "PendingRiderAccept", dispatchedAt: t, updatedAt: t }
        : o
    ),
  }));
  store.emitEvent(
    "OrderStateChanged",
    `Order ${orderId.slice(0, 8)} → Dispatching`,
    { orderId, newState: "PendingRiderAccept" }
  );

  if (candidates.length === 0) {
    failDispatch(orderId, "No eligible riders within proximity radius.");
    return store.getState().orders.find((o) => o.id === orderId)!;
  }

  issueOffer(orderId, 1);
  return store.getState().orders.find((o) => o.id === orderId)!;
}

function issueOffer(orderId: string, rank: number) {
  const store = getStore();
  const state = store.getState();
  const attempt = state.dispatchAttempts.find((a) => a.orderId === orderId);
  if (!attempt) return;
  const candidate = attempt.candidates.find((c) => c.rank === rank);
  if (!candidate) {
    failDispatch(orderId, "Candidate list exhausted.");
    return;
  }

  const cfg = state.config;
  const t = nowIso();
  const timesOutAt = new Date(
    Date.now() + cfg.offerTimeoutSeconds * 1000
  ).toISOString();

  const notification: Notification = {
    id: newId(),
    orderId,
    riderId: candidate.riderId,
    status: "Pending",
    offerRank: rank,
    score: candidate.score,
    distanceMeters: candidate.distanceMeters,
    issuedAt: t,
    timesOutAt,
    respondedAt: null,
    estimatedPayoutGhs: null,
    createdAt: t,
    updatedAt: t,
  };

  store.setState((s) => ({
    ...s,
    notifications: [...s.notifications, notification],
  }));
  store.emitEvent(
    "OfferIssued",
    `Offer #${rank} issued to ${candidate.riderId.slice(0, 8)}`,
    { orderId, riderId: candidate.riderId, rank, notificationId: notification.id }
  );

  const timeoutId = setTimeout(() => {
    handleTimeout(notification.id);
  }, cfg.offerTimeoutSeconds * 1000);
  activeTimers.set(orderId, { notificationId: notification.id, timeoutId });
}

function handleTimeout(notificationId: string) {
  const store = getStore();
  const state = store.getState();
  const notif = state.notifications.find((n) => n.id === notificationId);
  if (!notif || notif.status !== "Pending") return;

  const t = nowIso();
  store.setState((s) => ({
    ...s,
    notifications: s.notifications.map((n) =>
      n.id === notificationId
        ? { ...n, status: "TimedOut", respondedAt: t, updatedAt: t }
        : n
    ),
    dispatchAttempts: s.dispatchAttempts.map((a) =>
      a.orderId === notif.orderId
        ? {
            ...a,
            candidates: a.candidates.map((c) =>
              c.rank === notif.offerRank
                ? { ...c, offerStatus: "TimedOut", respondedAt: t }
                : c
            ),
            updatedAt: t,
          }
        : a
    ),
  }));
  store.emitEvent(
    "OfferTimedOut",
    `Offer #${notif.offerRank} timed out for ${notif.riderId.slice(0, 8)}`,
    { notificationId, orderId: notif.orderId, riderId: notif.riderId }
  );
  activeTimers.delete(notif.orderId);
  issueOffer(notif.orderId, notif.offerRank + 1);
}

export function respondToOffer(
  notificationId: string,
  action: "accept" | "decline"
): Notification {
  const store = getStore();
  const state = store.getState();
  const notif = state.notifications.find((n) => n.id === notificationId);
  if (!notif) throw new Error(`Notification ${notificationId} not found`);
  if (notif.status !== "Pending") {
    throw new Error(`Notification already ${notif.status}`);
  }

  const t = nowIso();
  const newStatus = action === "accept" ? "Accepted" : "Declined";

  // Resolve early — clear the timeout first so we don't double-fire
  const timer = activeTimers.get(notif.orderId);
  if (timer && timer.notificationId === notificationId) {
    clearTimeout(timer.timeoutId);
    activeTimers.delete(notif.orderId);
  }

  store.setState((s) => ({
    ...s,
    notifications: s.notifications.map((n) =>
      n.id === notificationId
        ? { ...n, status: newStatus, respondedAt: t, updatedAt: t }
        : n
    ),
    dispatchAttempts: s.dispatchAttempts.map((a) =>
      a.orderId === notif.orderId
        ? {
            ...a,
            candidates: a.candidates.map((c) =>
              c.rank === notif.offerRank
                ? { ...c, offerStatus: newStatus, respondedAt: t }
                : c
            ),
            updatedAt: t,
          }
        : a
    ),
  }));

  if (action === "accept") {
    handleAccept(notif);
  } else {
    handleDecline(notif);
  }

  return store.getState().notifications.find((n) => n.id === notificationId)!;
}

function handleAccept(notif: Notification) {
  const store = getStore();
  const t = nowIso();

  store.setState((s) => ({
    ...s,
    orders: s.orders.map((o) =>
      o.id === notif.orderId
        ? {
            ...o,
            state: "RiderAccepted",
            assignedRiderId: notif.riderId,
            acceptedAt: t,
            updatedAt: t,
          }
        : o
    ),
    riders: s.riders.map((r) =>
      r.id === notif.riderId
        ? {
            ...r,
            state: "OnlineAssigned",
            currentLoad: r.currentLoad + 1,
            updatedAt: t,
          }
        : r
    ),
    dispatchAttempts: s.dispatchAttempts.map((a) =>
      a.orderId === notif.orderId
        ? {
            ...a,
            outcome: "Succeeded",
            completedAt: t,
            winningRiderId: notif.riderId,
            updatedAt: t,
          }
        : a
    ),
  }));
  store.emitEvent(
    "OfferAccepted",
    `Offer #${notif.offerRank} accepted by ${notif.riderId.slice(0, 8)}`,
    { orderId: notif.orderId, riderId: notif.riderId }
  );
  store.emitEvent(
    "DispatchSucceeded",
    `Order ${notif.orderId.slice(0, 8)} assigned to ${notif.riderId.slice(0, 8)}`,
    { orderId: notif.orderId, riderId: notif.riderId }
  );
  store.emitEvent(
    "RiderStateChanged",
    `Rider ${notif.riderId.slice(0, 8)} → OnlineAssigned`,
    { riderId: notif.riderId, newState: "OnlineAssigned" }
  );
}

function handleDecline(notif: Notification) {
  const store = getStore();
  const cfg = store.getState().config;
  const t = nowIso();

  store.setState((s) => ({
    ...s,
    riders: s.riders.map((r) => {
      if (r.id !== notif.riderId) return r;
      const newDeclines = r.declinesToday + 1;
      const overCap = newDeclines >= cfg.declineCapPerDay;
      return {
        ...r,
        declinesToday: newDeclines,
        isEligible: overCap ? false : r.isEligible,
        ineligibilityReason: overCap ? "decline cap reached" : r.ineligibilityReason,
        updatedAt: t,
      };
    }),
  }));
  store.emitEvent(
    "OfferDeclined",
    `Offer #${notif.offerRank} declined by ${notif.riderId.slice(0, 8)}`,
    { orderId: notif.orderId, riderId: notif.riderId }
  );

  const updatedRider = store.getState().riders.find((r) => r.id === notif.riderId);
  if (updatedRider && !updatedRider.isEligible && updatedRider.ineligibilityReason === "decline cap reached") {
    store.emitEvent(
      "RiderEligibilityChanged",
      `Rider ${notif.riderId.slice(0, 8)} eligibility off — decline cap reached`,
      { riderId: notif.riderId, isEligible: false, reason: "decline cap reached" }
    );
  }

  issueOffer(notif.orderId, notif.offerRank + 1);
}

function failDispatch(orderId: string, reason: string) {
  const store = getStore();
  const t = nowIso();
  store.setState((s) => ({
    ...s,
    orders: s.orders.map((o) =>
      o.id === orderId
        ? { ...o, state: "FailedToDispatch", updatedAt: t }
        : o
    ),
    dispatchAttempts: s.dispatchAttempts.map((a) =>
      a.orderId === orderId
        ? { ...a, outcome: "Failed", completedAt: t, updatedAt: t }
        : a
    ),
  }));
  clearOfferTimer(orderId);
  store.emitEvent("DispatchFailed", `Order ${orderId.slice(0, 8)} failed to dispatch — ${reason}`, {
    orderId,
    reason,
  });
}
