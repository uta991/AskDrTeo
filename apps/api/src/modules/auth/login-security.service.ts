import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SmsService } from '../sms/sms.service';

/**
 * პაროლის ბლოკირება.
 *
 * მრიცხველი ბაზაშია და არა მეხსიერებაში: სერვერის რესტარტი
 * თავდამსხმელს არ უნდა შველოდეს.
 */
const LOCK_STEPS: { attempts: number; minutes: number }[] = [
  { attempts: 10, minutes: 6 * 60 },
  { attempts: 7, minutes: 60 },
  { attempts: 5, minutes: 15 },
  { attempts: 3, minutes: 1 },
];

/** ამ ხნის სიჩუმის შემდეგ მრიცხველი ნულდება — მფლობელი თავად არ ჩაიკეტოს. */
const COUNTER_RESET_HOURS = 12;

/** მფლობელს გაფრთხილება ამაზე ხშირად არ მიდის — თორემ SMS-ით დაბომბვა გამოვა. */
const ALERT_COOLDOWN_HOURS = 6;

/** რა მომენტიდან ვატყობინებთ მფლობელს. */
const ALERT_AFTER_ATTEMPTS = 5;

@Injectable()
export class LoginSecurityService {
  private readonly logger = new Logger(LoginSecurityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsService,
  ) {}

  /** ჩაკეტილია თუ არა ანგარიში — შესვლის მცდელობამდე. */
  assertNotLocked(user: User): void {
    if (!user.lockedUntil || user.lockedUntil <= new Date()) return;

    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    throw new UnauthorizedException(
      `ანგარიში დროებით დაბლოკილია. სცადეთ ${minutes} წუთში`,
    );
  }

  /** არასწორი პაროლი — მრიცხველი იზრდება და საჭიროებისას იკეტება. */
  async registerFailure(user: User): Promise<void> {
    const stale =
      user.lastFailedLoginAt &&
      Date.now() - user.lastFailedLoginAt.getTime() > COUNTER_RESET_HOURS * 3600_000;

    const attempts = (stale ? 0 : user.failedLoginAttempts) + 1;
    const step = LOCK_STEPS.find((s) => attempts >= s.attempts);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: attempts,
        lastFailedLoginAt: new Date(),
        lockedUntil: step ? new Date(Date.now() + step.minutes * 60_000) : null,
      },
    });

    if (step) {
      this.logger.warn(`${user.id} დაიბლოკა ${step.minutes} წუთით (${attempts} მცდელობა)`);
    }

    await this.alertOwner(user, attempts);
  }

  /** წარმატებული შესვლა — მრიცხველი იწმინდება. */
  async registerSuccess(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lastFailedLoginAt: null, lockedUntil: null },
    });
  }

  /**
   * ორეტაპიანი შესვლა სავალდებულოა თუ არა.
   *
   * ნომრის გარეშე კოდის გაგზავნა შეუძლებელია — ასეთი ანგარიში
   * სამუდამოდ ჩაიკეტებოდა. ამიტომ 2FA გამოტოვდება და ლოგში
   * გაფრთხილება რჩება; ნომრის დამატება პროფილიდან შეიძლება.
   */
  isTwoFactorRequired(user: User): boolean {
    if (!user.twoFactorPhone && !user.phone) {
      if (user.role !== UserRole.PARENT) {
        this.logger.warn(
          `${user.email ?? user.id}: ნომრის გარეშე ორეტაპიანი შესვლა ვერ ირთვება`,
        );
      }
      return false;
    }

    // პერსონალს ყოველთვის — მათ ანგარიშებზე სხვისი მონაცემები ჩანს
    if (user.role !== UserRole.PARENT) return true;
    return user.twoFactorEnabled;
  }

  /**
   * მფლობელს ვატყობინებთ, რომ ვიღაც ცდილობს შესვლას.
   *
   * ჩავარდნა შესვლას არ წყვეტს — SMS არხის პრობლემა უსაფრთხოების
   * შეტყობინებას ეხება და არა თავად ავტორიზაციას.
   */
  private async alertOwner(user: User, attempts: number): Promise<void> {
    if (attempts < ALERT_AFTER_ATTEMPTS || !user.phone) return;

    const recentlyAlerted =
      user.lastLockAlertAt &&
      Date.now() - user.lastLockAlertAt.getTime() < ALERT_COOLDOWN_HOURS * 3600_000;
    if (recentlyAlerted) return;

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLockAlertAt: new Date() },
    });

    await this.sms
      .send({
        phone: user.phone,
        userId: user.id,
        templateKey: 'login_alert',
        body:
          'AskDrTeo: თქვენს ანგარიშზე შესვლის რამდენიმე წარუმატებელი მცდელობა დაფიქსირდა. ' +
          'თუ ეს თქვენ არ ხართ, შეცვალეთ პაროლი.',
      })
      .catch(() => undefined);
  }
}
