"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type {
  NotificationFilters,
  OrderFilters,
  OrderState,
  RiderFilters,
  RiderPerformanceStatus,
  RiderState,
  Config,
  Tier,
  Campaign,
  Retailer,
} from "@/lib/types";

export const POLL = {
  fast: 1000,
  normal: 2000,
  slow: 3000,
} as const;

export const qk = {
  riders: (filters?: RiderFilters) => ["riders", filters ?? {}] as const,
  rider: (id: string) => ["rider", id] as const,
  retailers: () => ["retailers"] as const,
  retailer: (id: string) => ["retailer", id] as const,
  orders: (filters?: OrderFilters) => ["orders", filters ?? {}] as const,
  order: (id: string) => ["order", id] as const,
  dispatch: (orderId: string) => ["dispatch", orderId] as const,
  notifications: (filters?: NotificationFilters) =>
    ["notifications", filters ?? {}] as const,
  events: () => ["events"] as const,
  tiers: () => ["tiers"] as const,
  riderLocations: () => ["rider-locations"] as const,
  riderLocation: (riderId: string) => ["rider-location", riderId] as const,
  riderPerformance: (
    riderId: string,
    opts?: { page?: number; pageSize?: number; status?: string },
  ) => ["rider-performance", riderId, opts ?? {}] as const,
  riderPerformanceSummary: (riderId: string) =>
    ["rider-performance-summary", riderId] as const,
  riderPayments: (
    riderId: string,
    opts?: { page?: number; pageSize?: number },
  ) => ["rider-payments", riderId, opts ?? {}] as const,
  riderPaymentForOrder: (riderId: string, orderId: string) =>
    ["rider-payment-for-order", riderId, orderId] as const,
  orderPerformance: (orderId: string) => ["order-performance", orderId] as const,
  campaigns: () => ["campaigns"] as const,
  config: () => ["config"] as const,
};

export function useRiders(filters?: RiderFilters, refetchInterval: number = POLL.normal) {
  return useQuery({
    queryKey: qk.riders(filters),
    queryFn: () => api.listRiders(filters),
    refetchInterval,
  });
}
export function useRider(id: string | undefined, refetchInterval: number = POLL.slow) {
  return useQuery({
    queryKey: qk.rider(id ?? ""),
    queryFn: () => api.getRider(id!),
    enabled: !!id,
    refetchInterval,
  });
}

export function useRetailers() {
  return useQuery({
    queryKey: qk.retailers(),
    queryFn: () => api.listRetailers(),
  });
}
export function useRetailer(id: string | undefined) {
  return useQuery({
    queryKey: qk.retailer(id ?? ""),
    queryFn: () => api.getRetailer(id!),
    enabled: !!id,
  });
}

export function useOrders(filters?: OrderFilters, refetchInterval: number = POLL.normal) {
  return useQuery({
    queryKey: qk.orders(filters),
    queryFn: () => api.listOrders(filters),
    refetchInterval,
  });
}
export function useOrder(id: string | undefined, refetchInterval: number = POLL.slow) {
  return useQuery({
    queryKey: qk.order(id ?? ""),
    queryFn: () => api.getOrder(id!),
    enabled: !!id,
    refetchInterval,
  });
}

export function useDispatchAttempt(orderId: string | undefined, refetchInterval: number = POLL.fast) {
  return useQuery({
    queryKey: qk.dispatch(orderId ?? ""),
    queryFn: () => api.getDispatchAttempt(orderId!),
    enabled: !!orderId,
    refetchInterval,
  });
}

export function useNotifications(
  filters?: NotificationFilters,
  refetchInterval: number = POLL.normal
) {
  return useQuery({
    queryKey: qk.notifications(filters),
    queryFn: () => api.listNotifications(filters),
    refetchInterval,
  });
}

export function useEvents(refetchInterval: number = POLL.normal) {
  return useQuery({
    queryKey: qk.events(),
    queryFn: () => api.listEvents(),
    refetchInterval,
  });
}

export function useTiers() {
  return useQuery({ queryKey: qk.tiers(), queryFn: () => api.listTiers() });
}

export function useRiderLocations(refetchInterval: number = POLL.normal) {
  return useQuery({
    queryKey: qk.riderLocations(),
    queryFn: () => api.listRiderLocations(),
    refetchInterval,
  });
}

export function useRiderLocation(
  riderId: string | undefined,
  refetchInterval: number = POLL.slow,
) {
  return useQuery({
    queryKey: qk.riderLocation(riderId ?? ""),
    queryFn: () => api.getRiderLocation(riderId!),
    enabled: !!riderId,
    refetchInterval,
  });
}

export function useRiderPerformance(
  riderId: string | undefined,
  opts?: { page?: number; pageSize?: number; status?: RiderPerformanceStatus },
) {
  return useQuery({
    queryKey: qk.riderPerformance(riderId ?? "", opts),
    queryFn: () => api.listRiderPerformance(riderId!, opts),
    enabled: !!riderId,
  });
}

export function useRiderPerformanceSummary(riderId: string | undefined) {
  return useQuery({
    queryKey: qk.riderPerformanceSummary(riderId ?? ""),
    queryFn: () => api.getRiderPerformanceSummary(riderId!),
    enabled: !!riderId,
  });
}

export function useRiderPayments(
  riderId: string | undefined,
  opts?: { page?: number; pageSize?: number },
) {
  return useQuery({
    queryKey: qk.riderPayments(riderId ?? "", opts),
    queryFn: () => api.listRiderPayments(riderId!, opts),
    enabled: !!riderId,
  });
}

export function useRiderPaymentForOrder(
  riderId: string | undefined,
  orderId: string | undefined,
) {
  return useQuery({
    queryKey: qk.riderPaymentForOrder(riderId ?? "", orderId ?? ""),
    queryFn: () => api.getRiderPaymentForOrder(riderId!, orderId!),
    enabled: !!riderId && !!orderId,
  });
}

export function useOrderPerformance(
  orderId: string | undefined,
  refetchInterval: number = POLL.normal,
) {
  return useQuery({
    queryKey: qk.orderPerformance(orderId ?? ""),
    queryFn: () => api.getOrderPerformance(orderId!),
    enabled: !!orderId,
    refetchInterval,
  });
}

export function useCampaigns() {
  return useQuery({ queryKey: qk.campaigns(), queryFn: () => api.listCampaigns() });
}

export function useConfig() {
  return useQuery({ queryKey: qk.config(), queryFn: () => api.getConfig() });
}

// ---------- Mutations ----------

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries();
}

export function useDispatchOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => api.dispatchOrder(orderId),
    onSuccess: () => invalidateAll(qc),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRespondNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: "accept" | "decline" }) =>
      api.respondToNotification(id, { action }),
    onSuccess: () => invalidateAll(qc),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      retailerId: string;
      dropLatitude: number;
      dropLongitude: number;
      dropAddress?: string | null;
    }) => api.createOrder(data),
    onSuccess: () => invalidateAll(qc),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useTransitionOrderState() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newState }: { id: string; newState: OrderState }) =>
      api.transitionOrderState(id, { newState }),
    onSuccess: () => invalidateAll(qc),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateRider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.updateRider>[1] }) =>
      api.updateRider(id, data),
    onSuccess: () => invalidateAll(qc),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useTransitionRiderState() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      newState,
      reason,
    }: {
      id: string;
      newState: RiderState;
      reason?: string;
    }) => api.transitionRiderState(id, { newState, reason }),
    onSuccess: () => invalidateAll(qc),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useOverrideRiderEligibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isEligible, reason }: { id: string; isEligible: boolean; reason: string }) =>
      api.overrideRiderEligibility(id, { isEligible, reason }),
    onSuccess: () => invalidateAll(qc),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateRiderLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof api.updateRiderLocation>[1];
    }) => api.updateRiderLocation(id, data),
    onSuccess: () => invalidateAll(qc),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCreateRider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof api.createRider>[0]) => api.createRider(data),
    onSuccess: () => invalidateAll(qc),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteRider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteRider(id),
    onSuccess: () => invalidateAll(qc),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCreateRetailer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Retailer, "id" | "createdAt" | "updatedAt">) =>
      api.createRetailer(data),
    onSuccess: () => invalidateAll(qc),
    onError: (err: Error) => toast.error(err.message),
  });
}
export function useUpdateRetailer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Retailer> }) =>
      api.updateRetailer(id, data),
    onSuccess: () => invalidateAll(qc),
    onError: (err: Error) => toast.error(err.message),
  });
}
export function useDeleteRetailer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteRetailer(id),
    onSuccess: () => invalidateAll(qc),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCreateTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Tier, "id" | "createdAt" | "updatedAt">) => api.createTier(data),
    onSuccess: () => invalidateAll(qc),
    onError: (err: Error) => toast.error(err.message),
  });
}
export function useUpdateTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Tier> }) => api.updateTier(id, data),
    onSuccess: () => invalidateAll(qc),
    onError: (err: Error) => toast.error(err.message),
  });
}
export function useDeleteTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTier(id),
    onSuccess: () => invalidateAll(qc),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Campaign, "id" | "createdAt" | "updatedAt">) =>
      api.createCampaign(data),
    onSuccess: () => invalidateAll(qc),
    onError: (err: Error) => toast.error(err.message),
  });
}
export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Campaign> }) =>
      api.updateCampaign(id, data),
    onSuccess: () => invalidateAll(qc),
    onError: (err: Error) => toast.error(err.message),
  });
}
export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCampaign(id),
    onSuccess: () => invalidateAll(qc),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Config>) => api.updateConfig(data),
    onSuccess: () => invalidateAll(qc),
    onError: (err: Error) => toast.error(err.message),
  });
}
