import type { ApiClient } from "@/lib/api/client";
import type {
  Campaign,
  Config,
  DispatchAttempt,
  Notification,
  Order,
  OrderState,
  Retailer,
  Rider,
  RiderState,
  SystemEvent,
  Tier,
} from "@/lib/types";
import { canTransitionOrder, canTransitionRider } from "@/lib/utils/state-machines";
import { getStore, newId, nowIso } from "./store";
import { respondToOffer, startDispatch } from "./simulator";

// Tiny artificial latency to make the UI feel alive.
const tick = <T>(value: T): Promise<T> =>
  new Promise((res) => setTimeout(() => res(value), 25));

function applyRiderEligibilityFromBattery(
  rider: Rider,
  batteryPercent: number,
  batteryThreshold: number,
): Rider {
  const wasBatteryBlocked = rider.ineligibilityReason === "battery below threshold";
  if (batteryPercent < batteryThreshold) {
    return {
      ...rider,
      isEligible: false,
      ineligibilityReason: "battery below threshold",
    };
  }
  if (wasBatteryBlocked) {
    return {
      ...rider,
      isEligible: true,
      ineligibilityReason: null,
    };
  }
  return rider;
}

function applyRiderEligibilityFromKyc(rider: Rider): Rider {
  const wasKycBlocked =
    rider.ineligibilityReason?.toLowerCase().includes("kyc") ?? false;
  if (rider.kycStatus === "Rejected") {
    return {
      ...rider,
      isEligible: false,
      ineligibilityReason: "kyc rejected",
    };
  }
  if (wasKycBlocked && rider.kycStatus === "Approved") {
    return {
      ...rider,
      isEligible: true,
      ineligibilityReason: null,
    };
  }
  return rider;
}

export const mockClient: ApiClient = {
  async listRiders(filters) {
    const { riders } = getStore().getState();
    let result = riders;
    if (filters?.state) {
      const states = Array.isArray(filters.state) ? filters.state : [filters.state];
      result = result.filter((r) => states.includes(r.state));
    }
    if (filters?.tierId) result = result.filter((r) => r.tierId === filters.tierId);
    if (typeof filters?.isEligible === "boolean")
      result = result.filter((r) => r.isEligible === filters.isEligible);
    return tick(result);
  },

  async getRider(id) {
    const r = getStore().getState().riders.find((x) => x.id === id);
    if (!r) throw new Error(`Rider ${id} not found`);
    return tick(r);
  },

  async createRider(data) {
    const t = nowIso();
    const tiers = getStore().getState().tiers;
    const rider: Rider = {
      id: newId(),
      fullName: data.fullName ?? "New Rider",
      phone: data.phone ?? "",
      photoUrl: data.photoUrl ?? null,
      tierId: data.tierId ?? tiers[0]?.id ?? "",
      state: data.state ?? "Offline",
      isEligible: data.isEligible ?? false,
      ineligibilityReason: data.ineligibilityReason ?? "newly created",
      acceptanceRate: data.acceptanceRate ?? 80,
      declinesToday: data.declinesToday ?? 0,
      currentLoad: data.currentLoad ?? 0,
      kycStatus: data.kycStatus ?? "Pending",
      createdAt: t,
      updatedAt: t,
    };
    getStore().setState((s) => ({ ...s, riders: [...s.riders, rider] }));
    return tick(rider);
  },

  async updateRider(id, data) {
    const store = getStore();
    const t = nowIso();
    let updated: Rider | undefined;
    store.setState((s) => ({
      ...s,
      riders: s.riders.map((r) => {
        if (r.id !== id) return r;
        const merged: Rider = { ...r, ...data, updatedAt: t };
        const afterKyc = applyRiderEligibilityFromKyc(merged);
        updated = afterKyc;
        return afterKyc;
      }),
    }));
    if (!updated) throw new Error(`Rider ${id} not found`);
    return tick(updated);
  },

  async deleteRider(id) {
    getStore().setState((s) => ({ ...s, riders: s.riders.filter((r) => r.id !== id) }));
    return tick(undefined);
  },

  async updateRiderLocation(id, data) {
    const store = getStore();
    const t = nowIso();
    let updated: Rider | undefined;
    let prevEligible = true;
    store.setState((s) => {
      const cfg = s.config;
      return {
        ...s,
        riders: s.riders.map((r) => {
          if (r.id !== id) return r;
          prevEligible = r.isEligible;
          const next: Rider = { ...r, updatedAt: t };
          const after = applyRiderEligibilityFromBattery(
            next,
            data.batteryPercent,
            cfg.batteryThresholdPercent,
          );
          updated = after;
          return after;
        }),
      };
    });
    if (!updated) throw new Error(`Rider ${id} not found`);
    if (updated.isEligible !== prevEligible) {
      const cfg = store.getState().config;
      if (data.batteryPercent < cfg.batteryThresholdPercent) {
        store.emitEvent(
          "BatteryThresholdCrossed",
          `Rider ${id.slice(0, 8)} battery dropped to ${data.batteryPercent}%`,
          { riderId: id, batteryPercent: data.batteryPercent }
        );
      }
      store.emitEvent(
        "RiderEligibilityChanged",
        `Rider ${id.slice(0, 8)} eligibility → ${updated.isEligible ? "ON" : "OFF"}`,
        { riderId: id, isEligible: updated.isEligible, reason: updated.ineligibilityReason }
      );
    }
    return tick(updated);
  },

  async transitionRiderState(id, { newState, reason }) {
    const store = getStore();
    const t = nowIso();
    const rider = store.getState().riders.find((r) => r.id === id);
    if (!rider) throw new Error(`Rider ${id} not found`);
    if (!canTransitionRider(rider.state, newState))
      throw new Error(`Invalid transition: ${rider.state} → ${newState}`);
    store.setState((s) => ({
      ...s,
      riders: s.riders.map((r) =>
        r.id === id ? { ...r, state: newState, updatedAt: t } : r
      ),
    }));
    store.emitEvent(
      "RiderStateChanged",
      `Rider ${id.slice(0, 8)} → ${newState}${reason ? ` (${reason})` : ""}`,
      { riderId: id, newState, reason }
    );
    return tick(store.getState().riders.find((r) => r.id === id)!);
  },

  async overrideRiderEligibility(id, { isEligible, reason }) {
    const store = getStore();
    const t = nowIso();
    let updated: Rider | undefined;
    store.setState((s) => ({
      ...s,
      riders: s.riders.map((r) => {
        if (r.id !== id) return r;
        updated = {
          ...r,
          isEligible,
          ineligibilityReason: isEligible ? null : reason,
          updatedAt: t,
        };
        return updated;
      }),
    }));
    if (!updated) throw new Error(`Rider ${id} not found`);
    store.emitEvent(
      "RiderEligibilityChanged",
      `Rider ${id.slice(0, 8)} eligibility → ${isEligible ? "ON" : "OFF"} (override)`,
      { riderId: id, isEligible, reason }
    );
    return tick(updated);
  },

  // The mock keeps location embedded on Rider; these stubs let the new API
  // surface compile and behave reasonably. Mock mode pre-dates the
  // rider_locations split — see real backend for the canonical model.
  async listRiderLocations() {
    return tick([]);
  },
  async getRiderLocation(riderId: string) {
    const rider = getStore()
      .getState()
      .riders.find((r) => r.id === riderId);
    if (!rider) throw new Error(`Rider ${riderId} not found`);
    const t = nowIso();
    return tick({
      id: rider.id,
      riderId: rider.id,
      latitude: 5.6037,
      longitude: -0.187,
      batteryPercent: 100,
      gpsAccuracyMeters: 10,
      lastUpdatedAt: t,
      createdAt: t,
      updatedAt: t,
    });
  },
  async listRiderPerformance(_riderId, opts) {
    return tick({
      items: [],
      total: 0,
      page: opts?.page ?? 1,
      pageSize: opts?.pageSize ?? 20,
    });
  },
  async getRiderPerformanceSummary() {
    const empty = {
      accepted: 0,
      declined: 0,
      timedOut: 0,
      delivered: 0,
      cancelled: 0,
    };
    return tick({
      today: { ...empty },
      yesterday: { ...empty },
      lastMonth: { ...empty },
      total: { ...empty },
    });
  },
  async listRiderPayments(_riderId, opts) {
    return tick({
      items: [],
      total: 0,
      page: opts?.page ?? 1,
      pageSize: opts?.pageSize ?? 20,
    });
  },
  async getRiderPaymentForOrder() {
    return tick(null);
  },
  async getOrderPerformance() {
    return tick([]);
  },

  async listRetailers() {
    return tick(getStore().getState().retailers);
  },

  async getRetailer(id) {
    const r = getStore().getState().retailers.find((x) => x.id === id);
    if (!r) throw new Error(`Retailer ${id} not found`);
    return tick(r);
  },

  async createRetailer(data) {
    const t = nowIso();
    const retailer: Retailer = { ...data, id: newId(), createdAt: t, updatedAt: t };
    getStore().setState((s) => ({ ...s, retailers: [...s.retailers, retailer] }));
    return tick(retailer);
  },

  async updateRetailer(id, data) {
    const t = nowIso();
    let updated: Retailer | undefined;
    getStore().setState((s) => ({
      ...s,
      retailers: s.retailers.map((r) => {
        if (r.id !== id) return r;
        updated = { ...r, ...data, updatedAt: t };
        return updated;
      }),
    }));
    if (!updated) throw new Error(`Retailer ${id} not found`);
    return tick(updated);
  },

  async deleteRetailer(id) {
    getStore().setState((s) => ({
      ...s,
      retailers: s.retailers.filter((r) => r.id !== id),
    }));
    return tick(undefined);
  },

  async listOrders(filters) {
    const { orders } = getStore().getState();
    let result = orders;
    if (filters?.state) {
      const states = Array.isArray(filters.state) ? filters.state : [filters.state];
      result = result.filter((o) => states.includes(o.state));
    }
    if (filters?.retailerId)
      result = result.filter((o) => o.retailerId === filters.retailerId);
    return tick([...result].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  },

  async getOrder(id) {
    const o = getStore().getState().orders.find((x) => x.id === id);
    if (!o) throw new Error(`Order ${id} not found`);
    return tick(o);
  },

  async createOrder(data) {
    const t = nowIso();
    const retailer = getStore()
      .getState()
      .retailers.find((r) => r.id === data.retailerId);
    const order: Order = {
      id: newId(),
      retailerId: data.retailerId,
      pickupLatitude: retailer?.latitude ?? 0,
      pickupLongitude: retailer?.longitude ?? 0,
      dropLatitude: data.dropLatitude,
      dropLongitude: data.dropLongitude,
      dropAddress: data.dropAddress ?? null,
      state: "Created",
      assignedRiderId: null,
      dispatchedAt: null,
      acceptedAt: null,
      arrivedAtPickupAt: null,
      arrivedAtDeliveryAt: null,
      deliveredAt: null,
      cancelledAt: null,
      zone: retailer?.zone ?? null,
      station: retailer?.station ?? null,
      createdAt: t,
      updatedAt: t,
    };
    const store = getStore();
    store.setState((s) => ({ ...s, orders: [order, ...s.orders] }));
    store.emitEvent("OrderCreated", `Order ${order.id.slice(0, 8)} created`, {
      orderId: order.id,
      retailerId: order.retailerId,
    });
    return tick(order);
  },

  async dispatchOrder(id) {
    const result = startDispatch(id);
    return tick(result);
  },

  async transitionOrderState(id, { newState }) {
    const store = getStore();
    const order = store.getState().orders.find((o) => o.id === id);
    if (!order) throw new Error(`Order ${id} not found`);
    if (!canTransitionOrder(order.state, newState))
      throw new Error(`Invalid transition: ${order.state} → ${newState}`);
    const t = nowIso();
    store.setState((s) => ({
      ...s,
      orders: s.orders.map((o) => {
        if (o.id !== id) return o;
        return {
          ...o,
          state: newState,
          arrivedAtPickupAt: newState === "ArriveAtPickup" ? t : o.arrivedAtPickupAt,
          arrivedAtDeliveryAt: newState === "ArriveAtDelivery" ? t : o.arrivedAtDeliveryAt,
          deliveredAt: newState === "Delivered" ? t : o.deliveredAt,
          cancelledAt: newState === "Cancelled" ? t : o.cancelledAt,
          updatedAt: t,
        };
      }),
      riders:
        newState === "Delivered" || newState === "Cancelled"
          ? s.riders.map((r) =>
              r.id === order.assignedRiderId
                ? {
                    ...r,
                    currentLoad: Math.max(0, r.currentLoad - 1),
                    state: "OnlineIdle",
                    updatedAt: t,
                  }
                : r
            )
          : s.riders,
    }));
    store.emitEvent(
      "OrderStateChanged",
      `Order ${id.slice(0, 8)} → ${newState}`,
      { orderId: id, newState }
    );
    return tick(store.getState().orders.find((o) => o.id === id)!);
  },

  async getDispatchAttempt(orderId) {
    const a = getStore()
      .getState()
      .dispatchAttempts.find((x) => x.orderId === orderId);
    return tick(a ?? null);
  },

  async listNotifications(filters) {
    let { notifications } = getStore().getState();
    if (filters?.riderId) notifications = notifications.filter((n) => n.riderId === filters.riderId);
    if (filters?.orderId) notifications = notifications.filter((n) => n.orderId === filters.orderId);
    if (filters?.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      notifications = notifications.filter((n) => statuses.includes(n.status));
    }
    return tick(
      [...notifications].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
    );
  },

  async respondToNotification(id, { action }) {
    const result = respondToOffer(id, action);
    return tick(result);
  },

  async listTiers() {
    return tick(getStore().getState().tiers);
  },

  async createTier(data) {
    const t = nowIso();
    const tier: Tier = { ...data, id: newId(), createdAt: t, updatedAt: t };
    getStore().setState((s) => ({ ...s, tiers: [...s.tiers, tier] }));
    return tick(tier);
  },

  async updateTier(id, data) {
    const t = nowIso();
    let updated: Tier | undefined;
    getStore().setState((s) => ({
      ...s,
      tiers: s.tiers.map((tier) => {
        if (tier.id !== id) return tier;
        updated = { ...tier, ...data, updatedAt: t };
        return updated;
      }),
    }));
    if (!updated) throw new Error(`Tier ${id} not found`);
    return tick(updated);
  },

  async deleteTier(id) {
    getStore().setState((s) => ({ ...s, tiers: s.tiers.filter((t) => t.id !== id) }));
    return tick(undefined);
  },

  async listCampaigns() {
    return tick(getStore().getState().campaigns);
  },

  async createCampaign(data) {
    const t = nowIso();
    const campaign: Campaign = { ...data, id: newId(), createdAt: t, updatedAt: t };
    getStore().setState((s) => ({ ...s, campaigns: [...s.campaigns, campaign] }));
    return tick(campaign);
  },

  async updateCampaign(id, data) {
    const t = nowIso();
    let updated: Campaign | undefined;
    getStore().setState((s) => ({
      ...s,
      campaigns: s.campaigns.map((c) => {
        if (c.id !== id) return c;
        updated = { ...c, ...data, updatedAt: t };
        return updated;
      }),
    }));
    if (!updated) throw new Error(`Campaign ${id} not found`);
    return tick(updated);
  },

  async deleteCampaign(id) {
    getStore().setState((s) => ({
      ...s,
      campaigns: s.campaigns.filter((c) => c.id !== id),
    }));
    return tick(undefined);
  },

  async listEvents(since) {
    const { events } = getStore().getState();
    const filtered = since
      ? events.filter((e) => e.timestamp > since)
      : events.slice(0, 50);
    return tick(filtered);
  },

  async getConfig() {
    return tick(getStore().getState().config);
  },

  async updateConfig(data) {
    const store = getStore();
    let next: Config | undefined;
    store.setState((s) => {
      next = { ...s.config, ...data };
      return { ...s, config: next };
    });
    store.emitEvent("ConfigUpdated", "Configuration updated", {
      changedKeys: Object.keys(data),
    });
    return tick(next!);
  },

  async resetState() {
    getStore().reset();
    return tick(undefined);
  },
};

// Helper exports for typed referencing in pages
export type {
  Campaign,
  Config,
  DispatchAttempt,
  Notification,
  Order,
  OrderState,
  Retailer,
  Rider,
  RiderState,
  SystemEvent,
  Tier,
};
