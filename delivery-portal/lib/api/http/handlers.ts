import type { ApiClient } from "@/lib/api/client";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const PREFIX = "/api/v1";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${PREFIX}${path}`, {
    headers: { "Content-Type": "application/json", ...init.headers },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function qs(params: Record<string, unknown> | undefined): string {
  if (!params) return "";
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (!entries.length) return "";
  const sp = new URLSearchParams();
  entries.forEach(([k, v]) => {
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, String(x)));
    else sp.set(k, String(v));
  });
  return `?${sp.toString()}`;
}

export const httpClient: ApiClient = {
  listRiders: (filters) => request(`/riders${qs(filters)}`),
  getRider: (id) => request(`/riders/${id}`),
  createRider: (data) => request(`/riders`, { method: "POST", body: JSON.stringify(data) }),
  updateRider: (id, data) => request(`/riders/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteRider: (id) => request(`/riders/${id}`, { method: "DELETE" }),
  updateRiderLocation: (id, data) =>
    request(`/riders/${id}/location`, { method: "PATCH", body: JSON.stringify(data) }),
  transitionRiderState: (id, data) =>
    request(`/riders/${id}/state`, { method: "POST", body: JSON.stringify(data) }),
  overrideRiderEligibility: (id, data) =>
    request(`/riders/${id}/eligibility`, { method: "POST", body: JSON.stringify(data) }),

  listRiderLocations: () => request(`/rider-locations`),
  getRiderLocation: (riderId) => request(`/riders/${riderId}/location`),
  listRiderPerformance: (riderId, opts) =>
    request(`/riders/${riderId}/performance${qs(opts)}`),
  getRiderPerformanceSummary: (riderId) =>
    request(`/riders/${riderId}/performance/summary`),
  listRiderPayments: (riderId, opts) =>
    request(`/riders/${riderId}/payments${qs(opts)}`),
  getRiderPaymentForOrder: (riderId, orderId) =>
    request(`/riders/${riderId}/payments/${orderId}`),

  listRetailers: () => request(`/retailers`),
  getRetailer: (id) => request(`/retailers/${id}`),
  createRetailer: (data) => request(`/retailers`, { method: "POST", body: JSON.stringify(data) }),
  updateRetailer: (id, data) => request(`/retailers/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteRetailer: (id) => request(`/retailers/${id}`, { method: "DELETE" }),

  listOrders: (filters) => request(`/orders${qs(filters)}`),
  getOrder: (id) => request(`/orders/${id}`),
  createOrder: (data) => request(`/orders`, { method: "POST", body: JSON.stringify(data) }),
  dispatchOrder: (id) => request(`/orders/${id}/dispatch`, { method: "POST" }),
  transitionOrderState: (id, data) =>
    request(`/orders/${id}/state`, { method: "POST", body: JSON.stringify(data) }),
  getDispatchAttempt: (id) => request(`/orders/${id}/dispatch-attempt`),
  getOrderPerformance: (id) => request(`/orders/${id}/performance`),

  listNotifications: (filters) => request(`/notifications${qs(filters)}`),
  respondToNotification: (id, data) =>
    request(`/notifications/${id}/respond`, { method: "POST", body: JSON.stringify(data) }),

  listTiers: () => request(`/tiers`),
  createTier: (data) => request(`/tiers`, { method: "POST", body: JSON.stringify(data) }),
  updateTier: (id, data) => request(`/tiers/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTier: (id) => request(`/tiers/${id}`, { method: "DELETE" }),

  listCampaigns: () => request(`/campaigns`),
  createCampaign: (data) => request(`/campaigns`, { method: "POST", body: JSON.stringify(data) }),
  updateCampaign: (id, data) => request(`/campaigns/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteCampaign: (id) => request(`/campaigns/${id}`, { method: "DELETE" }),

  listEvents: (since) => request(`/events${qs(since ? { since } : undefined)}`),

  getConfig: () => request(`/config`),
  updateConfig: (data) => request(`/config`, { method: "PATCH", body: JSON.stringify(data) }),

  resetState: () =>
    request<void>(`/system/reset`, { method: 'POST' }),
};
