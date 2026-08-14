import { Injectable } from '@nestjs/common';
import { PaymentStatus, SubscriptionStatus, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  /** დაშბორდის ციფრები — რეგისტრაციები, ბავშვები, გამოწერები. */
  async overview() {
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const [
      totalUsers,
      parents,
      staff,
      newThisMonth,
      children,
      activeSubscriptions,
      paidSubscriptions,
      publishedNews,
      videos,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { role: UserRole.PARENT, deletedAt: null } }),
      this.prisma.user.count({
        where: { role: { not: UserRole.PARENT }, deletedAt: null },
      }),
      this.prisma.user.count({ where: { createdAt: { gte: monthAgo }, deletedAt: null } }),
      this.prisma.child.count({ where: { deletedAt: null } }),
      this.prisma.subscription.count({
        where: { status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] } },
      }),
      this.prisma.subscription.count({
        where: {
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
          plan: { isFree: false },
        },
      }),
      this.prisma.newsPost.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
      this.prisma.video.count({ where: { deletedAt: null } }),
    ]);

    return {
      users: { total: totalUsers, parents, staff, newThisMonth },
      children,
      subscriptions: {
        active: activeSubscriptions,
        paid: paidSubscriptions,
        free: activeSubscriptions - paidSubscriptions,
      },
      content: { news: publishedNews, videos },
    };
  }

  /**
   * ფინანსური მაჩვენებლები.
   *
   * შემოსავალი მხოლოდ წარმატებული გადახდებიდან ითვლება — pending და
   * failed ჩანაწერები რეალურ ფულს არ ნიშნავს.
   */
  async financial() {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [allTime, thisMonth, byPlan, pending, refunded] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { status: PaymentStatus.SUCCEEDED },
        _sum: { amountMinor: true },
        _count: true,
      }),
      this.prisma.payment.aggregate({
        where: { status: PaymentStatus.SUCCEEDED, paidAt: { gte: monthStart } },
        _sum: { amountMinor: true },
        _count: true,
      }),
      this.prisma.subscription.groupBy({
        by: ['planId'],
        where: { status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] } },
        _count: true,
      }),
      this.prisma.payment.count({ where: { status: PaymentStatus.PENDING } }),
      this.prisma.payment.aggregate({
        where: { status: PaymentStatus.REFUNDED },
        _sum: { amountMinor: true },
      }),
    ]);

    const plans = await this.prisma.plan.findMany({
      where: { id: { in: byPlan.map((row) => row.planId) } },
      select: { id: true, code: true, name: true, isFree: true, prices: true },
    });

    const planBreakdown = byPlan.map((row) => {
      const plan = plans.find((p) => p.id === row.planId);
      const monthly = plan?.prices.find((price) => price.interval === 'MONTH');

      return {
        planCode: plan?.code ?? 'unknown',
        planName: plan?.name ?? '—',
        subscribers: row._count,
        // მოსალოდნელი თვიური შემოსავალი — არსებული აბონენტები × თვიური ფასი
        monthlyRevenueMinor: (monthly?.amountMinor ?? 0) * row._count,
      };
    });

    return {
      currency: 'GEL',
      allTime: {
        revenueMinor: allTime._sum.amountMinor ?? 0,
        payments: allTime._count,
      },
      thisMonth: {
        revenueMinor: thisMonth._sum.amountMinor ?? 0,
        payments: thisMonth._count,
      },
      refundedMinor: refunded._sum.amountMinor ?? 0,
      pendingPayments: pending,
      /** MRR — მოქმედი გამოწერების თვიური ჯამი */
      mrrMinor: planBreakdown.reduce((sum, row) => sum + row.monthlyRevenueMinor, 0),
      planBreakdown,
    };
  }
}
