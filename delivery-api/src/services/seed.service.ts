import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TierRepository } from 'src/repositories/tier.repository';
import { RetailerRepository } from 'src/repositories/retailer.repository';
import { RiderRepository } from 'src/repositories/rider.repository';
import { OrderRepository } from 'src/repositories/order.repository';
import { CampaignRepository } from 'src/repositories/campaign.repository';
import { SimConfigRepository } from 'src/repositories/sim-config.repository';
import { SystemEventRepository } from 'src/repositories/system-event.repository';
import { RiderLocationRepository } from 'src/repositories/rider-location.repository';
import { Tier } from 'src/schemas/tier.schema';
import { Retailer } from 'src/schemas/retailer.schema';
import { Rider } from 'src/schemas/rider.schema';
import { Order } from 'src/schemas/order.schema';
import { Notification } from 'src/schemas/notification.schema';
import { DispatchAttempt } from 'src/schemas/dispatch-attempt.schema';
import { Campaign } from 'src/schemas/campaign.schema';
import { SystemEvent } from 'src/schemas/system-event.schema';
import { SimConfig } from 'src/schemas/sim-config.schema';
import { RiderLocation } from 'src/schemas/rider-location.schema';
import { RiderPerformance } from 'src/schemas/rider-performance.schema';

interface RiderSeedRow {
  fullName: string;
  phone: string;
  tierName: 'Gold' | 'Silver' | 'Bronze';
  state: Rider['state'];
  isEligible: boolean;
  ineligibilityReason?: string;
  acceptanceRate: number;
  declinesToday?: number;
  currentLoad?: number;
  location: { latitude: number; longitude: number; batteryPercent: number };
}

const RIDER_SEEDS: RiderSeedRow[] = [
  {
    fullName: 'Kwame Mensah',
    phone: '+233241112201',
    tierName: 'Gold',
    state: 'OnlineIdle',
    isEligible: true,
    acceptanceRate: 92,
    location: { latitude: 5.612, longitude: -0.165, batteryPercent: 88 },
  },
  {
    fullName: 'Ama Owusu',
    phone: '+233244223301',
    tierName: 'Silver',
    state: 'OnlineIdle',
    isEligible: true,
    acceptanceRate: 78,
    location: { latitude: 5.565, longitude: -0.19, batteryPercent: 72 },
  },
  {
    fullName: 'Yaw Boateng',
    phone: '+233205334412',
    tierName: 'Silver',
    state: 'OnDelivery',
    isEligible: true,
    acceptanceRate: 84,
    declinesToday: 1,
    currentLoad: 1,
    location: { latitude: 5.66, longitude: -0.02, batteryPercent: 56 },
  },
  {
    fullName: 'Akua Sarpong',
    phone: '+233266545506',
    tierName: 'Bronze',
    state: 'OnlineIdle',
    isEligible: false,
    ineligibilityReason: 'battery below threshold',
    acceptanceRate: 64,
    location: { latitude: 5.6, longitude: -0.21, batteryPercent: 12 },
  },
  {
    fullName: 'Kojo Quaye',
    phone: '+233247656617',
    tierName: 'Gold',
    state: 'Offline',
    isEligible: false,
    ineligibilityReason: 'rider offline',
    acceptanceRate: 95,
    location: { latitude: 5.59, longitude: -0.18, batteryPercent: 40 },
  },
];

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly tiers: TierRepository,
    private readonly retailers: RetailerRepository,
    private readonly riders: RiderRepository,
    private readonly orders: OrderRepository,
    private readonly campaigns: CampaignRepository,
    private readonly simConfig: SimConfigRepository,
    private readonly events: SystemEventRepository,
    private readonly riderLocations: RiderLocationRepository,
    @InjectModel(Tier.name) private readonly tierModel: Model<Tier>,
    @InjectModel(Retailer.name) private readonly retailerModel: Model<Retailer>,
    @InjectModel(Rider.name) private readonly riderModel: Model<Rider>,
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<Notification>,
    @InjectModel(DispatchAttempt.name)
    private readonly attemptModel: Model<DispatchAttempt>,
    @InjectModel(Campaign.name) private readonly campaignModel: Model<Campaign>,
    @InjectModel(SystemEvent.name)
    private readonly eventModel: Model<SystemEvent>,
    @InjectModel(SimConfig.name)
    private readonly simConfigModel: Model<SimConfig>,
    @InjectModel(RiderLocation.name)
    private readonly riderLocationModel: Model<RiderLocation>,
    @InjectModel(RiderPerformance.name)
    private readonly riderPerformanceModel: Model<RiderPerformance>,
  ) {}

  async onApplicationBootstrap() {
    await this.simConfig.getOrInit();

    if ((await this.tiers.count()) === 0) await this.seedTiers();
    if ((await this.retailers.count()) === 0) await this.seedRetailers();
    if ((await this.riders.count()) === 0) await this.seedRiders();
    if ((await this.orders.count()) === 0) await this.seedOrders();
    if ((await this.campaigns.count()) === 0) await this.seedCampaigns();

    await this.events.emit(
      'ConfigUpdated',
      'Simulator API ready — seed verified.',
      {},
    );
  }

  /**
   * Wipe every simulator collection and re-run the bootstrap seed. Used by
   * the topbar Reset state button so demos start clean.
   */
  async reset(): Promise<void> {
    this.logger.warn('Resetting simulator state — wiping all collections');
    await Promise.all([
      this.tierModel.deleteMany({}),
      this.retailerModel.deleteMany({}),
      this.riderModel.deleteMany({}),
      this.riderLocationModel.deleteMany({}),
      this.riderPerformanceModel.deleteMany({}),
      this.orderModel.deleteMany({}),
      this.notificationModel.deleteMany({}),
      this.attemptModel.deleteMany({}),
      this.campaignModel.deleteMany({}),
      this.eventModel.deleteMany({}),
      this.simConfigModel.deleteMany({}),
    ]);

    await this.simConfig.getOrInit();
    await this.seedTiers();
    await this.seedRetailers();
    await this.seedRiders();
    await this.seedOrders();
    await this.seedCampaigns();

    await this.events.emit(
      'ConfigUpdated',
      'Simulator state reset.',
      {},
    );
  }

  private async seedTiers() {
    this.logger.log('Seeding tiers');
    await this.tiers.create({
      name: 'Gold',
      description: 'Top performers — best base payout and bonuses.',
      colorHex: '#F39A1F',
      basePayoutGhs: 8,
      bonusRules: [
        {
          trigger: 'on_nth',
          threshold: 4,
          mode: 'percent',
          amount: 20,
          description: '+20% on your 4th order',
        },
        {
          trigger: 'every_after_nth',
          threshold: 8,
          mode: 'flat',
          amount: 10,
          description: '+GHS 10 for every order after #8',
        },
      ],
    });
    await this.tiers.create({
      name: 'Silver',
      description: 'Standard riders.',
      colorHex: '#1FA39B',
      basePayoutGhs: 6,
      bonusRules: [
        {
          trigger: 'on_nth',
          threshold: 5,
          mode: 'percent',
          amount: 10,
          description: '+10% on your 5th order',
        },
      ],
    });
    await this.tiers.create({
      name: 'Bronze',
      description: 'New riders — base payout only.',
      colorHex: '#6B7280',
      basePayoutGhs: 5,
      bonusRules: [],
    });
  }

  private async seedRetailers() {
    this.logger.log('Seeding retailers');
    await this.retailers.create({
      name: 'FreshMart East Legon',
      address: 'Lagos Avenue, East Legon',
      latitude: 5.6504,
      longitude: -0.1547,
      zone: 'Accra East',
      station: 'East Legon Station',
    });
    await this.retailers.create({
      name: 'Osu Pantry',
      address: 'Oxford Street, Osu',
      latitude: 5.5573,
      longitude: -0.1819,
      zone: 'Accra Central',
      station: 'Osu Station',
    });
    await this.retailers.create({
      name: 'Tema Harbour Market',
      address: 'Community 1, Tema',
      latitude: 5.6695,
      longitude: -0.0166,
      zone: 'Tema',
      station: 'Tema Community Station',
    });
  }

  private async seedRiders() {
    this.logger.log('Seeding riders');
    const tiers = await this.tiers.list();
    const tierByName = new Map(tiers.map((t) => [t.name, t]));

    for (const seed of RIDER_SEEDS) {
      const tier = tierByName.get(seed.tierName);
      if (!tier) continue;
      const rider = await this.riders.create({
        fullName: seed.fullName,
        phone: seed.phone,
        tierId: tier.id,
        state: seed.state,
        isEligible: seed.isEligible,
        ineligibilityReason: seed.ineligibilityReason ?? null,
        acceptanceRate: seed.acceptanceRate,
        declinesToday: seed.declinesToday ?? 0,
        currentLoad: seed.currentLoad ?? 0,
        kycStatus: 'Approved',
      });
      await this.riderLocations.upsert({
        riderId: rider.id,
        latitude: seed.location.latitude,
        longitude: seed.location.longitude,
        batteryPercent: seed.location.batteryPercent,
        gpsAccuracyMeters: 10,
      });
    }
  }

  private async seedOrders() {
    this.logger.log('Seeding orders');
    const retailers = await this.retailers.list();
    const riders = await this.riders.list();
    const onDelivery = riders.find((r) => r.state === 'OnDelivery');
    const now = new Date();

    if (retailers[0]) {
      await this.orders.create({
        retailerId: retailers[0].id,
        pickupLatitude: retailers[0].latitude,
        pickupLongitude: retailers[0].longitude,
        dropLatitude: 5.6404,
        dropLongitude: -0.158,
        dropAddress: 'Customer near East Legon',
        state: 'Created',
      });
    }
    if (retailers[1]) {
      await this.orders.create({
        retailerId: retailers[1].id,
        pickupLatitude: retailers[1].latitude,
        pickupLongitude: retailers[1].longitude,
        dropLatitude: 5.5615,
        dropLongitude: -0.18,
        dropAddress: 'Customer near Osu',
        state: 'Delivered',
        assignedRiderId: onDelivery?.id ?? null,
        dispatchedAt: now,
        acceptedAt: now,
        arrivedAtPickupAt: now,
        arrivedAtDeliveryAt: now,
        deliveredAt: now,
      });
    }
  }

  private async seedCampaigns() {
    this.logger.log('Seeding campaigns');
    const tiers = await this.tiers.list();
    const gold = tiers.find((t) => t.name === 'Gold');
    const dayMs = 86_400_000;
    await this.campaigns.create({
      name: 'Gold Streak',
      kind: 'Campaign',
      description:
        'Gold tier riders who maintain >90% acceptance get a bonus.',
      triggerType: 'AcceptanceRate',
      threshold: 90,
      rewardAmountGhs: 75,
      startDate: new Date(Date.now() - 7 * dayMs),
      endDate: new Date(Date.now() + 30 * dayMs),
      isActive: true,
      targetTierId: gold?.id ?? null,
    });
  }
}
