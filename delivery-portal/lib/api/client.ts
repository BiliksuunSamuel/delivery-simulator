import type {
  Campaign,
  Config,
  DispatchAttempt,
  Notification,
  Order,
  OrderFilters,
  OrderState,
  Retailer,
  Rider,
  RiderFilters,
  RiderLocation,
  RiderPayment,
  RiderPerformance,
  RiderPerformanceStatus,
  RiderPerformanceSummary,
  PagedRiderPayment,
  PagedRiderPerformance,
  RiderState,
  SystemEvent,
  Tier,
  NotificationFilters,
} from "@/lib/types";

export interface ApiClient {
  // Riders
  listRiders: (filters?: RiderFilters) => Promise<Rider[]>;
  getRider: (id: string) => Promise<Rider>;
  createRider: (data: Partial<Rider>) => Promise<Rider>;
  updateRider: (id: string, data: Partial<Rider>) => Promise<Rider>;
  deleteRider: (id: string) => Promise<void>;
  updateRiderLocation: (
    id: string,
    data: {
      latitude: number;
      longitude: number;
      batteryPercent: number;
      gpsAccuracyMeters: number;
    }
  ) => Promise<Rider>;
  transitionRiderState: (
    id: string,
    data: { newState: RiderState; reason?: string }
  ) => Promise<Rider>;
  overrideRiderEligibility: (
    id: string,
    data: { isEligible: boolean; reason: string }
  ) => Promise<Rider>;

  // Rider locations (rolling, separate collection)
  listRiderLocations: () => Promise<RiderLocation[]>;
  getRiderLocation: (riderId: string) => Promise<RiderLocation>;

  // Rider performance log
  listRiderPerformance: (
    riderId: string,
    opts?: { page?: number; pageSize?: number; status?: RiderPerformanceStatus },
  ) => Promise<PagedRiderPerformance>;
  getRiderPerformanceSummary: (
    riderId: string,
  ) => Promise<RiderPerformanceSummary>;
  listRiderPayments: (
    riderId: string,
    opts?: { page?: number; pageSize?: number },
  ) => Promise<PagedRiderPayment>;
  getRiderPaymentForOrder: (
    riderId: string,
    orderId: string,
  ) => Promise<RiderPayment | null>;

  // Retailers
  listRetailers: () => Promise<Retailer[]>;
  getRetailer: (id: string) => Promise<Retailer>;
  createRetailer: (
    data: Omit<Retailer, "id" | "createdAt" | "updatedAt">
  ) => Promise<Retailer>;
  updateRetailer: (id: string, data: Partial<Retailer>) => Promise<Retailer>;
  deleteRetailer: (id: string) => Promise<void>;

  // Orders
  listOrders: (filters?: OrderFilters) => Promise<Order[]>;
  getOrder: (id: string) => Promise<Order>;
  createOrder: (data: {
    retailerId: string;
    dropLatitude: number;
    dropLongitude: number;
    dropAddress?: string | null;
  }) => Promise<Order>;
  dispatchOrder: (id: string) => Promise<Order>;
  transitionOrderState: (
    id: string,
    data: { newState: OrderState }
  ) => Promise<Order>;
  getDispatchAttempt: (orderId: string) => Promise<DispatchAttempt | null>;
  getOrderPerformance: (orderId: string) => Promise<RiderPerformance[]>;

  // Notifications
  listNotifications: (filters?: NotificationFilters) => Promise<Notification[]>;
  respondToNotification: (
    id: string,
    data: { action: "accept" | "decline" }
  ) => Promise<Notification>;

  // Tiers
  listTiers: () => Promise<Tier[]>;
  createTier: (
    data: Omit<Tier, "id" | "createdAt" | "updatedAt">
  ) => Promise<Tier>;
  updateTier: (id: string, data: Partial<Tier>) => Promise<Tier>;
  deleteTier: (id: string) => Promise<void>;

  // Campaigns
  listCampaigns: () => Promise<Campaign[]>;
  createCampaign: (
    data: Omit<Campaign, "id" | "createdAt" | "updatedAt">
  ) => Promise<Campaign>;
  updateCampaign: (id: string, data: Partial<Campaign>) => Promise<Campaign>;
  deleteCampaign: (id: string) => Promise<void>;

  // Events
  listEvents: (since?: string) => Promise<SystemEvent[]>;

  // Config
  getConfig: () => Promise<Config>;
  updateConfig: (data: Partial<Config>) => Promise<Config>;

  // Sim helpers (mock-only no-ops in real client)
  resetState: () => Promise<void>;
}
