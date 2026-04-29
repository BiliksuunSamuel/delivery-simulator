import { v4 as uuid } from "uuid";
import type {
  Campaign,
  Config,
  DispatchAttempt,
  Notification,
  Order,
  Retailer,
  Rider,
  SystemEvent,
  SystemEventType,
  Tier,
} from "@/lib/types";
import {
  DEFAULT_CONFIG,
  makeSeedCampaigns,
  makeSeedOrders,
  makeSeedRetailers,
  makeSeedRiders,
  makeSeedTiers,
} from "./seed";

const STORAGE_KEY = "rider-allocation-sim-v1";

export interface MockState {
  riders: Rider[];
  retailers: Retailer[];
  orders: Order[];
  notifications: Notification[];
  dispatchAttempts: DispatchAttempt[];
  tiers: Tier[];
  campaigns: Campaign[];
  events: SystemEvent[];
  config: Config;
}

function buildInitialState(): MockState {
  const tiers = makeSeedTiers();
  const retailers = makeSeedRetailers();
  const riders = makeSeedRiders(tiers);
  const orders = makeSeedOrders(retailers, riders);
  const campaigns = makeSeedCampaigns(tiers);
  return {
    tiers,
    retailers,
    riders,
    orders,
    notifications: [],
    dispatchAttempts: [],
    campaigns,
    events: [
      {
        id: uuid(),
        type: "ConfigUpdated",
        timestamp: new Date().toISOString(),
        summary: "Simulator seeded with default config and sample data.",
        details: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    config: DEFAULT_CONFIG,
  };
}

function loadFromStorage(): MockState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MockState;
    if (!parsed.config || !parsed.riders) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persist(state: MockState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

type Listener = () => void;

class Store {
  private state: MockState;
  private listeners = new Set<Listener>();

  constructor() {
    const loaded = loadFromStorage();
    this.state = loaded ?? buildInitialState();
    if (!loaded) persist(this.state);
  }

  getState(): MockState {
    return this.state;
  }

  setState(updater: (s: MockState) => MockState) {
    this.state = updater(this.state);
    persist(this.state);
    this.notify();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  reset() {
    this.state = buildInitialState();
    persist(this.state);
    this.notify();
  }

  emitEvent(type: SystemEventType, summary: string, details: Record<string, unknown> = {}) {
    const t = new Date().toISOString();
    const event: SystemEvent = {
      id: uuid(),
      type,
      timestamp: t,
      summary,
      details,
      createdAt: t,
      updatedAt: t,
    };
    this.setState((s) => ({ ...s, events: [event, ...s.events].slice(0, 500) }));
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }
}

let storeInstance: Store | null = null;

export function getStore(): Store {
  if (!storeInstance) storeInstance = new Store();
  return storeInstance;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(): string {
  return uuid();
}
