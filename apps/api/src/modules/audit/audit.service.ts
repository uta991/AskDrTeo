import { Injectable, Logger } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface AuditEntry {
  actorId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * „ვინ რა შეცვალა" — ყველა ადმინისეული მუტაცია აქ იწერება.
 *
 * ჩაწერა არასდროს აგდებს შეცდომას: audit-ის ჩავარდნამ არ უნდა გააუქმოს
 * უკვე შესრულებული ბიზნეს-ოპერაცია.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: entry.actorId,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          before: this.toJson(entry.before),
          after: this.toJson(entry.after),
          description: entry.description,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
        },
      });
    } catch (error) {
      this.logger.error(
        `audit ჩანაწერი ვერ შეიქმნა (${entry.entityType}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private toJson(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined || value === null) return undefined;
    // Date და Decimal ტიპები JSON-ში პირდაპირ არ ჯდება — სერიალიზაციით ვასწორებთ
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
