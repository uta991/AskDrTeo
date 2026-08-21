import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { User } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { SessionContext } from './tokens.service';

/** კოდის სიცოცხლე — საკმარისი SMS-ის მოსვლისთვის, მოკლე გამოცნობისთვის. */
const CODE_TTL_MINUTES = 10;

/** 6 ციფრი = 1 000 000 ვარიანტი; 5 შანსი ბრუტფორსს გამორიცხავს. */
const MAX_ATTEMPTS = 5;
const MAX_RESENDS = 3;
const RESEND_COOLDOWN_SEC = 60;

/** ნაცნობი მოწყობილობა ამ ხნით კოდს აღარ ითხოვს. */
const TRUST_DAYS = 30;

export interface ChallengeIssued {
  challengeId: string;
  /** ნიღბიანი ნომერი — სრული ნომრის ჩვენება ზედმეტი გაჟონვაა */
  maskedPhone: string;
  expiresAt: Date;
}

@Injectable()
export class TwoFactorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsService,
  ) {}

  /** მოწყობილობა ნდობის სიაშია თუ არა — მაშინ კოდი აღარ სჭირდება. */
  async isTrustedDevice(userId: string, token?: string): Promise<boolean> {
    if (!token) return false;

    const device = await this.prisma.trustedDevice.findUnique({
      where: { tokenHash: hashToken(token) },
    });

    if (!device || device.userId !== userId) return false;
    if (device.revokedAt || device.expiresAt < new Date()) return false;

    await this.prisma.trustedDevice.update({
      where: { id: device.id },
      data: { lastUsedAt: new Date() },
    });

    return true;
  }

  /** კოდის გაცემა და გაგზავნა. */
  async issue(user: User, ctx: SessionContext): Promise<ChallengeIssued> {
    const target = codeTarget(user);
    if (!target) {
      throw new BadRequestException('ანგარიშს ტელეფონის ნომერი არ აქვს — დაგვიკავშირდით');
    }

    // ძველი დაუდასტურებელი კოდები უქმდება — ერთდროულად ერთი მოქმედი
    await this.prisma.loginChallenge.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    const code = generateCode();

    const challenge = await this.prisma.loginChallenge.create({
      data: {
        userId: user.id,
        codeHash: await argon2.hash(code),
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        deviceId: ctx.deviceId,
        expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60_000),
      },
    });

    await this.deliver(user, code);

    return {
      challengeId: challenge.id,
      maskedPhone: maskPhone(target),
      expiresAt: challenge.expiresAt,
    };
  }

  /** ხელახლა გაგზავნა — პაუზითა და ლიმიტით. */
  async resend(challengeId: string): Promise<{ message: string }> {
    const challenge = await this.prisma.loginChallenge.findUnique({
      where: { id: challengeId },
      include: { user: true },
    });

    if (!challenge || challenge.consumedAt || challenge.expiresAt < new Date()) {
      throw new UnauthorizedException('სესიის ვადა ამოიწურა — შედით თავიდან');
    }

    if (challenge.resends >= MAX_RESENDS) {
      throw new BadRequestException('ხელახლა გაგზავნის ლიმიტი ამოიწურა — შედით თავიდან');
    }

    const elapsed = (Date.now() - challenge.lastSentAt.getTime()) / 1000;
    if (elapsed < RESEND_COOLDOWN_SEC) {
      throw new BadRequestException(
        `ახალი კოდის გამოთხოვა შესაძლებელია ${Math.ceil(RESEND_COOLDOWN_SEC - elapsed)} წამში`,
      );
    }

    const code = generateCode();

    await this.prisma.loginChallenge.update({
      where: { id: challengeId },
      data: {
        codeHash: await argon2.hash(code),
        resends: { increment: 1 },
        lastSentAt: new Date(),
        // ახალი კოდი — ძველი მცდელობები აღარ ითვლება
        attempts: 0,
      },
    });

    await this.deliver(challenge.user, code);
    return { message: 'ახალი კოდი გამოგზავნილია' };
  }

  /**
   * კოდის შემოწმება.
   *
   * აბრუნებს მომხმარებელს — გამომძახებელი ტოკენებს თავად გასცემს.
   */
  async verify(challengeId: string, code: string): Promise<User> {
    const challenge = await this.prisma.loginChallenge.findUnique({
      where: { id: challengeId },
      include: { user: true },
    });

    if (!challenge || challenge.consumedAt) {
      throw new UnauthorizedException('სესიის ვადა ამოიწურა — შედით თავიდან');
    }

    if (challenge.expiresAt < new Date()) {
      throw new UnauthorizedException('კოდის ვადა ამოიწურა — შედით თავიდან');
    }

    if (challenge.attempts >= MAX_ATTEMPTS) {
      await this.consume(challengeId);
      throw new UnauthorizedException('მცდელობების ლიმიტი ამოიწურა — შედით თავიდან');
    }

    if (!(await argon2.verify(challenge.codeHash, code))) {
      const left = MAX_ATTEMPTS - challenge.attempts - 1;

      await this.prisma.loginChallenge.update({
        where: { id: challengeId },
        data: { attempts: { increment: 1 } },
      });

      throw new UnauthorizedException(
        left > 0 ? `კოდი არასწორია. დარჩა ${left} მცდელობა` : 'კოდი არასწორია',
      );
    }

    await this.consume(challengeId);
    return challenge.user;
  }

  /**
   * მოწყობილობის დამახსოვრება.
   *
   * აბრუნებს ღია ტოკენს — ის მხოლოდ ერთხელ ჩანს და კლიენტმა უნდა
   * შეინახოს; ბაზაში მხოლოდ hash რჩება.
   */
  async trustDevice(userId: string, ctx: SessionContext): Promise<string> {
    const token = randomBytes(32).toString('base64url');

    await this.prisma.trustedDevice.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        label: ctx.userAgent?.slice(0, 80),
        expiresAt: new Date(Date.now() + TRUST_DAYS * 24 * 3600_000),
      },
    });

    return token;
  }

  private async consume(challengeId: string): Promise<void> {
    await this.prisma.loginChallenge.update({
      where: { id: challengeId },
      data: { consumedAt: new Date() },
    });
  }

  private async deliver(user: User, code: string): Promise<void> {
    const target = codeTarget(user);
    if (!target) return;

    await this.sms.send({
      phone: target,
      userId: user.id,
      templateKey: 'login_code',
      body: `AskDrTeo: შესვლის კოდია ${code}. არავის გაუზიაროთ.`,
    });
  }
}

/**
 * სად მიდის კოდი.
 *
 * `twoFactorPhone` პრიორიტეტულია: ერთი ფიზიკური ტელეფონი შეიძლება
 * რამდენიმე ანგარიშს ემსახურებოდეს, `phone` კი უნიკალურია.
 */
function codeTarget(user: User): string | null {
  return user.twoFactorPhone ?? user.phone ?? null;
}

/** `crypto.randomInt` — `Math.random` წინასწარმეტყველებადია. */
function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** +995599123456 → +995 *** ** 56 */
function maskPhone(phone: string): string {
  return phone.length <= 4 ? phone : `${phone.slice(0, 4)} *** ** ${phone.slice(-2)}`;
}
