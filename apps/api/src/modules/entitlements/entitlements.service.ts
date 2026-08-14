import { Injectable, Logger } from '@nestjs/common';
import { FeatureType, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';

export const UNLIMITED = 'unlimited';

export interface Entitlement {
  key: string;
  name: string;
  type: FeatureType;
  enabled: boolean;
  /** LIMIT-ისთვის: რიცხვი ან "unlimited". სხვა ტიპებზე null. */
  value: string | null;
  unit: string | null;
}

export interface EntitlementSnapshot {
  planCode: string | null;
  planName: string | null;
  status: SubscriptionStatus | null;
  periodEnd: Date | null;
  features: Record<string, Entitlement>;
}

interface CacheEntry {
  snapshot: EntitlementSnapshot;
  expiresAt: number;
}

const CACHE_TTL_MS = 60_000;

/**
 * წვდომის გამომთვლელი ძრავა.
 *
 * კოდი არასდროს ამოწმებს პაკეტის სახელს (`if (plan === 'premium')`).
 * ის კითხულობს მხოლოდ ფუნქციის key-ს, ხოლო თუ რომელი პაკეტი რას მოიცავს —
 * ბაზაშია და Super Admin-ის კონტროლშია.
 *
 * ქეში ჯერჯერობით პროცესის მეხსიერებაშია. ერთ ინსტანსზე ეს საკმარისია;
 * რამდენიმე ინსტანსზე გადასვლისას ჩანაცვლდება Redis-ით — ინტერფეისი იგივე რჩება.
 */
@Injectable()
export class EntitlementsService {
  private readonly logger = new Logger(EntitlementsService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly prisma: PrismaService) {}

  /** ლოგიკური ფუნქცია ჩართულია თუ არა. */
  async can(userId: string, featureKey: string): Promise<boolean> {
    const snapshot = await this.resolve(userId);
    return snapshot.features[featureKey]?.enabled ?? false;
  }

  /**
   * რიცხვითი ლიმიტი. `null` ნიშნავს უსასრულოს.
   * გამოძახება: `const max = await entitlements.limit(userId, 'max_children')`
   */
  async limit(userId: string, featureKey: string): Promise<number | null> {
    const snapshot = await this.resolve(userId);
    const value = snapshot.features[featureKey]?.value;

    if (!value || value === UNLIMITED) return null;

    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  /** ლიმიტის შემოწმება მიმდინარე რაოდენობასთან. */
  async withinLimit(userId: string, featureKey: string, current: number): Promise<boolean> {
    const max = await this.limit(userId, featureKey);
    return max === null || current < max;
  }

  /**
   * მომხმარებლის სრული უფლებები. მობილური აპი ამას ერთხელ იღებს და
   * მის მიხედვით მალავს/აჩვენებს ღილაკებს — ლოგიკა კლიენტში არ დუბლირდება.
   */
  async resolve(userId: string): Promise<EntitlementSnapshot> {
    const cached = this.cache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.snapshot;
    }

    const snapshot = await this.compute(userId);
    this.cache.set(userId, { snapshot, expiresAt: Date.now() + CACHE_TTL_MS });
    return snapshot;
  }

  /** გამოწერის ცვლილებისას ერთი მომხმარებლის ქეშის გაუქმება. */
  invalidate(userId: string): void {
    this.cache.delete(userId);
  }

  /** პაკეტის/ფუნქციის რედაქტირებისას — ცვლილება ყველას ეხება. */
  invalidateAll(): void {
    this.cache.clear();
    this.logger.log('Entitlements ქეში გასუფთავდა');
  }

  private async compute(userId: string): Promise<EntitlementSnapshot> {
    const [features, subscription] = await Promise.all([
      this.prisma.feature.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.subscription.findFirst({
        where: {
          userId,
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
          OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: new Date() } }],
        },
        orderBy: { createdAt: 'desc' },
        include: {
          plan: { include: { features: true } },
        },
      }),
    ]);

    // პაკეტში ჩაწერილი წესები — featureId → PlanFeature
    const planRules = new Map(
      (subscription?.plan.features ?? []).map((pf) => [pf.featureId, pf]),
    );

    const resolved: Record<string, Entitlement> = {};

    for (const feature of features) {
      const rule = planRules.get(feature.id);

      // პაკეტში რომ არ არის ნახსენები, მოქმედებს ფუნქციის ნაგულისხმევი მნიშვნელობა
      const enabled = rule
        ? rule.enabled
        : this.defaultEnabled(feature.type, feature.defaultValue);

      const value =
        feature.type === FeatureType.LIMIT || feature.type === FeatureType.ACCESS
          ? (rule?.value ?? feature.defaultValue ?? null)
          : null;

      resolved[feature.key] = {
        key: feature.key,
        name: feature.name,
        type: feature.type,
        enabled,
        value,
        unit: feature.unit,
      };
    }

    return {
      planCode: subscription?.plan.code ?? null,
      planName: subscription?.plan.name ?? null,
      status: subscription?.status ?? null,
      periodEnd: subscription?.currentPeriodEnd ?? null,
      features: resolved,
    };
  }

  private defaultEnabled(type: FeatureType, defaultValue: string | null): boolean {
    if (type === FeatureType.BOOLEAN) return defaultValue === 'true';
    // LIMIT/ACCESS ჩართულია, თუ ნაგულისხმევი მნიშვნელობა საერთოდ არსებობს
    return !!defaultValue;
  }
}
