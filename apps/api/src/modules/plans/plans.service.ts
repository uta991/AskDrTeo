import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Plan, PlanStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import {
  CreateFeatureDto,
  CreatePlanDto,
  PlanFeatureDto,
  PlanPriceDto,
  UpdateFeatureDto,
  UpdatePlanDto,
} from './dto/plan.dto';

const PLAN_INCLUDE = {
  prices: { where: { isActive: true }, orderBy: { amountMinor: 'asc' } },
  features: { include: { feature: true } },
} satisfies Prisma.PlanInclude;

@Injectable()
export class PlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly entitlements: EntitlementsService,
  ) {}

  // ─── საჯარო (მობილური აპი) ───────────────────────────────────────────

  /** აქტიური პაკეტები ფასებითა და ფუნქციების სიით — გამოწერის ეკრანისთვის. */
  async listPublic() {
    const plans = await this.prisma.plan.findMany({
      where: { status: PlanStatus.ACTIVE, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
      include: PLAN_INCLUDE,
    });

    return plans.map((plan) => ({
      id: plan.id,
      code: plan.code,
      name: plan.name,
      description: plan.description,
      isFree: plan.isFree,
      trialDays: plan.trialDays,
      badge: plan.badge,
      colorHex: plan.colorHex,
      highlight: plan.highlight,
      prices: plan.prices.map((p) => ({
        id: p.id,
        currency: p.currency,
        amountMinor: p.amountMinor,
        interval: p.interval,
        intervalCount: p.intervalCount,
      })),
      // მხოლოდ ჩართული ფუნქციები — აპი მათ სიად აჩვენებს ბარათზე
      features: plan.features
        // ტექნიკური ლიმიტები (ატვირთვის ზომა) ვიტრინაში არ ჩანს
        .filter((pf) => pf.enabled && pf.feature.isActive && pf.feature.isPublic)
        .sort((a, b) => a.feature.sortOrder - b.feature.sortOrder)
        .map((pf) => ({
          key: pf.feature.key,
          name: pf.feature.name,
          value: pf.value,
          unit: pf.feature.unit,
        })),
    }));
  }

  // ─── ფუნქციების კატალოგი (Super Admin) ───────────────────────────────

  listFeatures() {
    return this.prisma.feature.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createFeature(dto: CreateFeatureDto, actorId: string) {
    const exists = await this.prisma.feature.findUnique({ where: { key: dto.key } });
    if (exists) throw new ConflictException(`ფუნქცია "${dto.key}" უკვე არსებობს`);

    const feature = await this.prisma.feature.create({ data: dto });

    await this.audit.record({
      actorId,
      action: AuditAction.CREATE,
      entityType: 'Feature',
      entityId: feature.id,
      after: feature,
      description: `ახალი ფუნქცია: ${feature.key}`,
    });

    this.entitlements.invalidateAll();
    return feature;
  }

  async updateFeature(id: string, dto: UpdateFeatureDto, actorId: string) {
    const before = await this.prisma.feature.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('ფუნქცია ვერ მოიძებნა');

    const after = await this.prisma.feature.update({ where: { id }, data: dto });

    await this.audit.record({
      actorId,
      action: AuditAction.UPDATE,
      entityType: 'Feature',
      entityId: id,
      before,
      after,
    });

    this.entitlements.invalidateAll();
    return after;
  }

  // ─── პაკეტები (Super Admin) ──────────────────────────────────────────

  listAll() {
    return this.prisma.plan.findMany({
      where: { deletedAt: null },
      orderBy: { sortOrder: 'asc' },
      include: { ...PLAN_INCLUDE, _count: { select: { subscriptions: true } } },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.plan.findFirst({
      where: { id, deletedAt: null },
      include: PLAN_INCLUDE,
    });
    if (!plan) throw new NotFoundException('პაკეტი ვერ მოიძებნა');
    return plan;
  }

  async create(dto: CreatePlanDto, actorId: string) {
    const exists = await this.prisma.plan.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException(`პაკეტი "${dto.code}" უკვე არსებობს`);

    const featureRows = await this.resolveFeatures(dto.features ?? []);

    const plan = await this.prisma.plan.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        isFree: dto.isFree ?? false,
        trialDays: dto.trialDays ?? 0,
        badge: dto.badge,
        colorHex: dto.colorHex,
        highlight: dto.highlight ?? false,
        sortOrder: dto.sortOrder ?? 0,
        status: PlanStatus.DRAFT, // ახალი პაკეტი ჯერ არავის ეჩვენება
        prices: { create: (dto.prices ?? []).map(this.toPriceData) },
        features: { create: featureRows },
      },
      include: PLAN_INCLUDE,
    });

    await this.audit.record({
      actorId,
      action: AuditAction.CREATE,
      entityType: 'Plan',
      entityId: plan.id,
      after: plan,
      description: `ახალი პაკეტი: ${plan.code}`,
    });

    return plan;
  }

  async update(id: string, dto: UpdatePlanDto, actorId: string) {
    const before = await this.findOne(id);

    const { features, prices, ...scalars } = dto;

    const plan = await this.prisma.$transaction(async (tx) => {
      await tx.plan.update({ where: { id }, data: scalars });

      // ფუნქციები/ფასები სრულად ჩანაცვლდება — ნაწილობრივი განახლება
      // ადმინ-პანელში დაბნეულობას იწვევდა („რა დარჩა ძველი?")
      if (features) {
        const rows = await this.resolveFeatures(features);
        await tx.planFeature.deleteMany({ where: { planId: id } });
        await tx.planFeature.createMany({
          data: rows.map((r) => ({ ...r, planId: id })),
        });
      }

      if (prices) {
        await tx.planPrice.deleteMany({ where: { planId: id } });
        await tx.planPrice.createMany({
          data: prices.map((p) => ({ ...this.toPriceData(p), planId: id })),
        });
      }

      return tx.plan.findUniqueOrThrow({ where: { id }, include: PLAN_INCLUDE });
    });

    await this.audit.record({
      actorId,
      action: AuditAction.UPDATE,
      entityType: 'Plan',
      entityId: id,
      before,
      after: plan,
    });

    // ფასის/ფუნქციის ცვლილება ყველა აბონენტს ეხება
    this.entitlements.invalidateAll();
    return plan;
  }

  async setStatus(id: string, status: PlanStatus, actorId: string): Promise<Plan> {
    const before = await this.findOne(id);

    if (before.isDefault && status !== PlanStatus.ACTIVE) {
      throw new BadRequestException(
        'ნაგულისხმევი პაკეტის გამორთვა შეუძლებელია — ჯერ სხვა პაკეტი დააყენეთ ნაგულისხმევად',
      );
    }

    const plan = await this.prisma.plan.update({ where: { id }, data: { status } });

    await this.audit.record({
      actorId,
      action: status === PlanStatus.ACTIVE ? AuditAction.PUBLISH : AuditAction.UPDATE,
      entityType: 'Plan',
      entityId: id,
      before: { status: before.status },
      after: { status },
      description: `პაკეტი "${plan.code}" → ${status}`,
    });

    this.entitlements.invalidateAll();
    return plan;
  }

  /** ნაგულისხმევი პაკეტი ერთადერთია — ახლის დაყენება ძველს ავტომატურად ხსნის. */
  async setDefault(id: string, actorId: string): Promise<Plan> {
    const plan = await this.findOne(id);

    if (plan.status !== PlanStatus.ACTIVE) {
      throw new BadRequestException('ნაგულისხმევი მხოლოდ აქტიური პაკეტი შეიძლება იყოს');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.plan.updateMany({
        where: { isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
      return tx.plan.update({ where: { id }, data: { isDefault: true } });
    });

    await this.audit.record({
      actorId,
      action: AuditAction.UPDATE,
      entityType: 'Plan',
      entityId: id,
      after: { isDefault: true },
      description: `"${updated.code}" გახდა ნაგულისხმევი პაკეტი`,
    });

    return updated;
  }

  /**
   * არქივირება წაშლის ნაცვლად — აქტიური გამოწერების მქონე პაკეტის წაშლა
   * ისტორიას გაანადგურებდა.
   */
  async archive(id: string, actorId: string): Promise<Plan> {
    const plan = await this.findOne(id);

    if (plan.isDefault) {
      throw new BadRequestException('ნაგულისხმევი პაკეტის არქივირება შეუძლებელია');
    }

    const activeCount = await this.prisma.subscription.count({
      where: { planId: id, status: { in: ['ACTIVE', 'TRIALING'] } },
    });

    const archived = await this.prisma.plan.update({
      where: { id },
      data: { status: PlanStatus.ARCHIVED },
    });

    await this.audit.record({
      actorId,
      action: AuditAction.UPDATE,
      entityType: 'Plan',
      entityId: id,
      before: { status: plan.status },
      after: { status: PlanStatus.ARCHIVED },
      description: `პაკეტი არქივში: ${plan.code} (აქტიური გამოწერა: ${activeCount})`,
    });

    this.entitlements.invalidateAll();
    return archived;
  }

  // ─── დამხმარე ────────────────────────────────────────────────────────

  /** featureKey → featureId, ვალიდაციით რომ ყველა key რეალურად არსებობს. */
  private async resolveFeatures(items: PlanFeatureDto[]) {
    if (!items.length) return [];

    const keys = items.map((i) => i.featureKey);
    const features = await this.prisma.feature.findMany({ where: { key: { in: keys } } });
    const byKey = new Map(features.map((f) => [f.key, f]));

    const missing = keys.filter((k) => !byKey.has(k));
    if (missing.length) {
      throw new BadRequestException(`უცნობი ფუნქცია: ${missing.join(', ')}`);
    }

    return items.map((item) => ({
      featureId: byKey.get(item.featureKey)!.id,
      enabled: item.enabled,
      value: item.value ?? null,
    }));
  }

  private toPriceData(price: PlanPriceDto) {
    return {
      currency: price.currency ?? 'GEL',
      amountMinor: price.amountMinor,
      interval: price.interval,
      intervalCount: price.intervalCount ?? 1,
    };
  }
}
