import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PACKS, findPack, type ConsultationPackOffer } from './packs.catalog';

/** ცენტები დოლარად — მრგვალი თანხა ცენტების გარეშე იწერება. */
function usd(minor: number): string {
  const amount = minor / 100;
  return `$${minor % 100 === 0 ? amount.toFixed(0) : amount.toFixed(2)}`;
}

@Injectable()
export class PacksService {
  constructor(private readonly prisma: PrismaService) {}

  /** ვიტრინა — კატალოგი და მშობლის მოქმედი ლიმიტები. */
  async overview(userId: string) {
    const active = await this.active(userId);

    return {
      offers: PACKS.map((pack) => ({
        code: pack.code,
        name: pack.name,
        chats: pack.chats,
        periodLabel: pack.periodLabel,
        description: pack.description,
        highlight: pack.highlight ?? false,
        price: usd(pack.amountMinor),
        amountMinor: pack.amountMinor,
        currency: pack.currency,
      })),
      active: active.map((pack) => ({
        code: pack.code,
        remaining: Math.max(0, pack.chatLimit - pack.used),
        limit: pack.chatLimit,
        expiresAt: pack.expiresAt,
      })),
      remaining: active.reduce((sum, pack) => sum + Math.max(0, pack.chatLimit - pack.used), 0),
    };
  }

  /** გადახდის დადასტურების შემდეგ — ლიმიტის ჩარიცხვა. */
  async grant(userId: string, code: string, paymentId?: string) {
    const offer = findPack(code);
    if (!offer) throw new NotFoundException('პაკეტი ვერ მოიძებნა');

    return this.prisma.consultationPack.create({
      data: {
        userId,
        code: offer.code,
        chatLimit: offer.chats,
        expiresAt: new Date(Date.now() + offer.days * 24 * 60 * 60 * 1000),
        paymentId,
      },
    });
  }

  /**
   * ერთი საუბრის ჩამოწერა.
   *
   * ჯერ ის პაკეტი იხარჯება, რომელსაც ვადა უფრო ადრე ეწურება —
   * თორემ ხანმოკლე პაკეტი გამოუყენებელი ჩაივლიდა.
   */
  async consume(userId: string): Promise<boolean> {
    const active = await this.active(userId);
    const usable = active.find((pack) => pack.used < pack.chatLimit);
    if (!usable) return false;

    await this.prisma.consultationPack.update({
      where: { id: usable.id },
      data: { used: { increment: 1 } },
    });

    return true;
  }

  private active(userId: string) {
    return this.prisma.consultationPack.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { expiresAt: 'asc' },
    });
  }
}

export type { ConsultationPackOffer };
