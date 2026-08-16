import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpPurpose } from '@prisma/client';
import { createHash, randomInt } from 'node:crypto';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SmsService } from '../sms/sms.service';

const RESEND_COOLDOWN_SECONDS = 60;

const MESSAGES: Record<OtpPurpose, (code: string) => string> = {
  PHONE_VERIFICATION: (c) => `თქვენი დადასტურების კოდია: ${c}`,
  EMAIL_VERIFICATION: (c) => `თქვენი დადასტურების კოდია: ${c}`,
  PASSWORD_RESET: (c) => `პაროლის აღდგენის კოდია: ${c}`,
  LOGIN: (c) => `შესვლის კოდია: ${c}`,
};

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly sms: SmsService,
  ) {}

  /**
   * ქმნის და აგზავნის კოდს. იმავე destination+purpose-ის ძველი კოდები უქმდება,
   * რომ ერთდროულად ერთზე მეტი მოქმედი კოდი არასდროს არსებობდეს.
   */
  async issue(destination: string, purpose: OtpPurpose, userId?: string): Promise<void> {
    const testCode = this.testCodeFor(destination);

    // სატესტო ნომერს cooldown არ ეხება — თორემ ზედიზედ ცდა შეუძლებელი გახდება.
    if (!testCode) await this.assertNotThrottled(destination, purpose);

    const length = this.config.get<number>('otp.length', 6);
    const ttlMinutes = this.config.get<number>('otp.ttlMinutes', 5);
    const code = testCode ?? this.generateCode(length);

    await this.prisma.$transaction([
      this.prisma.otpCode.updateMany({
        where: { destination, purpose, consumedAt: null },
        data: { consumedAt: new Date() },
      }),
      this.prisma.otpCode.create({
        data: {
          userId,
          destination,
          purpose,
          codeHash: this.hash(code),
          maxAttempts: this.config.get<number>('otp.maxAttempts', 5),
          expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
        },
      }),
    ]);

    // ელ. ფოსტის არხი ჯერ არ არის ჩართული — SMS-ით ვგზავნით ტელეფონზე.
    // სატესტო ნომერზე გაგზავნა უაზროა: კოდი წინასწარ ცნობილია.
    if (!destination.includes('@') && !testCode) {
      await this.sms.send({
        phone: destination,
        body: MESSAGES[purpose](code),
        userId,
        templateKey: `otp_${purpose.toLowerCase()}`,
      });
    }
  }

  /**
   * ამოწმებს კოდს და მოხმარებულად ნიშნავს.
   * აბრუნებს იმ userId-ს, რომელზეც კოდი გაიცა (თუ იყო მიბმული).
   */
  async verify(
    destination: string,
    code: string,
    purpose: OtpPurpose,
  ): Promise<{ userId: string | null }> {
    const otp = await this.prisma.otpCode.findFirst({
      where: { destination, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new BadRequestException('კოდი არ მოიძებნა, გამოითხოვეთ ახალი');
    }

    if (otp.expiresAt < new Date()) {
      throw new BadRequestException('კოდის ვადა ამოიწურა, გამოითხოვეთ ახალი');
    }

    if (otp.attempts >= otp.maxAttempts) {
      throw new BadRequestException('მცდელობების ლიმიტი ამოიწურა, გამოითხოვეთ ახალი კოდი');
    }

    if (otp.codeHash !== this.hash(code)) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      const left = otp.maxAttempts - otp.attempts - 1;
      throw new BadRequestException(
        left > 0 ? `კოდი არასწორია. დარჩა ${left} მცდელობა` : 'კოდი არასწორია',
      );
    }

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });

    return { userId: otp.userId };
  }

  /** ერთი წუთის cooldown — SMS-ის ხარჯისა და spam-ის საწინააღმდეგოდ. */
  private async assertNotThrottled(destination: string, purpose: OtpPurpose): Promise<void> {
    const last = await this.prisma.otpCode.findFirst({
      where: { destination, purpose },
      orderBy: { createdAt: 'desc' },
    });

    if (!last) return;

    const elapsed = (Date.now() - last.createdAt.getTime()) / 1000;
    if (elapsed < RESEND_COOLDOWN_SECONDS) {
      const wait = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed);
      throw new BadRequestException(`ახალი კოდის გამოთხოვა შესაძლებელია ${wait} წამში`);
    }
  }

  /** ამ ნომრის ფიქსირებული კოდი, თუ სატესტოა. */
  testCodeFor(destination: string): string | null {
    const numbers = this.config.get<Record<string, string>>('otp.testNumbers', {});
    return numbers[destination] ?? null;
  }

  private generateCode(length: number): string {
    const max = 10 ** length;
    return randomInt(0, max).toString().padStart(length, '0');
  }

  private hash(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }
}
