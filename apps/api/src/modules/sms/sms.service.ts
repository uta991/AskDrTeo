import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsStatus } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface SendSmsInput {
  phone: string;
  body: string;
  userId?: string;
  templateKey?: string;
}

interface SmsProviderResult {
  providerRef?: string;
  costMinor?: number;
}

/**
 * SMS-ის გაგზავნა provider-ისგან დამოუკიდებლად.
 * ყველა გაგზავნილი შეტყობინება ლოგდება `sms_messages` ცხრილში.
 *
 * ახალი provider-ის დასამატებლად საკმარისია ერთი მეთოდის დაწერა და
 * `dispatch`-ში ერთი ხაზის დამატება — გამომძახებელი კოდი არ იცვლება.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async send(input: SendSmsInput): Promise<void> {
    const record = await this.prisma.smsMessage.create({
      data: {
        userId: input.userId,
        phone: input.phone,
        body: input.body,
        templateKey: input.templateKey,
        provider: this.config.get<string>('sms.provider'),
        status: SmsStatus.QUEUED,
      },
    });

    try {
      const result = await this.dispatch(input.phone, input.body);
      await this.prisma.smsMessage.update({
        where: { id: record.id },
        data: {
          status: SmsStatus.SENT,
          providerRef: result.providerRef,
          costMinor: result.costMinor,
          sentAt: new Date(),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`SMS ვერ გაიგზავნა ${input.phone}: ${message}`);
      await this.prisma.smsMessage.update({
        where: { id: record.id },
        data: { status: SmsStatus.FAILED, error: message },
      });
      // SMS-ის ჩავარდნა რეგისტრაციას არ წყვეტს — მომხმარებელს resend შეუძლია.
    }
  }

  private async dispatch(phone: string, body: string): Promise<SmsProviderResult> {
    const provider = this.config.get<string>('sms.provider');

    switch (provider) {
      case 'console':
        this.logger.warn(`[SMS → ${phone}] ${body}`);
        return {};
      default:
        throw new Error(`SMS provider "${provider}" არ არის იმპლემენტირებული`);
    }
  }
}
