import { v4 as uuid } from "uuid";
import type {
  Campaign,
  Config,
  Order,
  Retailer,
  Rider,
  Tier,
} from "@/lib/types";

const now = () => new Date().toISOString();

export const DEFAULT_CONFIG: Config = {
  batteryThresholdPercent: 15,
  gpsAccuracyThresholdMeters: 50,
  declineCapPerDay: 3,
  offerTimeoutSeconds: 15,
  maxCandidatesPerDispatch: 5,
  proximityRadiusMeters: 5000,
  arriveAtPickupDelaySeconds: 8,
  arriveAtDeliveryDelaySeconds: 10,
  confirmDeliveryDelaySeconds: 5,
  proximityWeight: 0.7,
  familiarityWeight: 0.3,
};

export function makeSeedTiers(): Tier[] {
  const t = now();
  return [
    {
      id: uuid(),
      name: "Gold",
      description: "Top performers — best base payout and bonuses.",
      colorHex: "#F39A1F",
      basePayoutGhs: 8,
      bonusRules: [],
      createdAt: t,
      updatedAt: t,
    },
    {
      id: uuid(),
      name: "Silver",
      description: "Standard riders.",
      colorHex: "#1FA39B",
      basePayoutGhs: 6,
      bonusRules: [],
      createdAt: t,
      updatedAt: t,
    },
    {
      id: uuid(),
      name: "Bronze",
      description: "New or low-performing riders.",
      colorHex: "#6B7280",
      basePayoutGhs: 5,
      bonusRules: [],
      createdAt: t,
      updatedAt: t,
    },
  ];
}

export function makeSeedRetailers(): Retailer[] {
  const t = now();
  return [
    {
      id: uuid(),
      name: "FreshMart East Legon",
      address: "Lagos Avenue, East Legon",
      latitude: 5.6504,
      longitude: -0.1547,
      zone: "Accra East",
      station: "East Legon Station",
      createdAt: t,
      updatedAt: t,
    },
    {
      id: uuid(),
      name: "Osu Pantry",
      address: "Oxford Street, Osu",
      latitude: 5.5573,
      longitude: -0.1819,
      zone: "Accra Central",
      station: "Osu Station",
      createdAt: t,
      updatedAt: t,
    },
    {
      id: uuid(),
      name: "Tema Harbour Market",
      address: "Community 1, Tema",
      latitude: 5.6695,
      longitude: -0.0166,
      zone: "Tema",
      station: "Tema Community Station",
      createdAt: t,
      updatedAt: t,
    },
  ];
}

export function makeSeedRiders(tiers: Tier[]): Rider[] {
  const t = now();
  const [gold, silver, bronze] = tiers;
  const presets: Array<Omit<Rider, "id" | "createdAt" | "updatedAt">> = [
    {
      fullName: "Kwame Mensah",
      phone: "+233241112201",
      photoUrl: null,
      tierId: gold.id,
      state: "OnlineIdle",
      isEligible: true,
      ineligibilityReason: null,
      acceptanceRate: 92,
      declinesToday: 0,
      currentLoad: 0,
      kycStatus: "Approved",
    },
    {
      fullName: "Ama Owusu",
      phone: "+233244223301",
      photoUrl: null,
      tierId: silver.id,
      state: "OnlineIdle",
      isEligible: true,
      ineligibilityReason: null,
      acceptanceRate: 78,
      declinesToday: 0,
      currentLoad: 0,
      kycStatus: "Approved",
    },
    {
      fullName: "Yaw Boateng",
      phone: "+233205334412",
      photoUrl: null,
      tierId: silver.id,
      state: "OnDelivery",
      isEligible: true,
      ineligibilityReason: null,
      acceptanceRate: 84,
      declinesToday: 1,
      currentLoad: 1,
      kycStatus: "Approved",
    },
    {
      fullName: "Akua Sarpong",
      phone: "+233266545506",
      photoUrl: null,
      tierId: bronze.id,
      state: "OnlineIdle",
      isEligible: false,
      ineligibilityReason: "battery below threshold",
      acceptanceRate: 64,
      declinesToday: 0,
      currentLoad: 0,
      kycStatus: "Approved",
    },
    {
      fullName: "Kojo Quaye",
      phone: "+233247656617",
      photoUrl: null,
      tierId: gold.id,
      state: "Offline",
      isEligible: false,
      ineligibilityReason: "rider offline",
      acceptanceRate: 95,
      declinesToday: 0,
      currentLoad: 0,
      kycStatus: "Approved",
    },
  ];

  return presets.map((p) => ({
    id: uuid(),
    createdAt: t,
    updatedAt: t,
    ...p,
  }));
}

export function makeSeedOrders(retailers: Retailer[], riders: Rider[]): Order[] {
  const t = now();
  const r0 = retailers[0];
  const r1 = retailers[1];
  const onDelivery = riders.find((r) => r.state === "OnDelivery");

  return [
    {
      id: uuid(),
      retailerId: r0.id,
      pickupLatitude: r0.latitude,
      pickupLongitude: r0.longitude,
      dropLatitude: 5.6404,
      dropLongitude: -0.158,
      dropAddress: "Customer near East Legon",
      state: "Created",
      assignedRiderId: null,
      dispatchedAt: null,
      acceptedAt: null,
      arrivedAtPickupAt: null,
      arrivedAtDeliveryAt: null,
      deliveredAt: null,
      cancelledAt: null,
      zone: r0.zone,
      station: r0.station,
      createdAt: t,
      updatedAt: t,
    },
    {
      id: uuid(),
      retailerId: r1.id,
      pickupLatitude: r1.latitude,
      pickupLongitude: r1.longitude,
      dropLatitude: 5.5615,
      dropLongitude: -0.18,
      dropAddress: "Customer near Osu",
      state: "Delivered",
      assignedRiderId: onDelivery?.id ?? null,
      dispatchedAt: t,
      acceptedAt: t,
      arrivedAtPickupAt: t,
      arrivedAtDeliveryAt: t,
      deliveredAt: t,
      cancelledAt: null,
      zone: r1.zone,
      station: r1.station,
      createdAt: t,
      updatedAt: t,
    },
  ];
}

export function makeSeedCampaigns(tiers: Tier[]): Campaign[] {
  const t = now();
  const dayMs = 86_400_000;
  const start = new Date(Date.now() - 7 * dayMs).toISOString();
  const end = new Date(Date.now() + 30 * dayMs).toISOString();
  const goldId = tiers.find((tt) => tt.name === "Gold")?.id ?? null;
  return [
    {
      id: uuid(),
      name: "Gold Streak",
      kind: "Campaign",
      description: "Gold tier riders who maintain >90% acceptance get a bonus.",
      triggerType: "AcceptanceRate",
      threshold: 90,
      rewardAmountGhs: 75,
      startDate: start,
      endDate: end,
      isActive: true,
      targetTierId: goldId,
      createdAt: t,
      updatedAt: t,
    },
  ];
}
