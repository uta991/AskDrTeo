import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuditAction,
  AuthProvider,
  OtpPurpose,
  Prisma,
  SubscriptionStatus,
  User,
  UserStatus,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  normalizeEmail,
  normalizePhone,
  resolveIdentifier,
} from '@/common/utils/identifier.util';
import {
  AppleAuthDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  GoogleAuthDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyOtpDto,
} from './dto/auth.dto';
import { OtpService } from './otp.service';
import { AppleService } from './providers/apple.service';
import { SessionContext, TokenPair, TokensService } from './tokens.service';

const TERMS_VERSION = '1.0';

export interface AuthResult {
  user: PublicUser;
  tokens: TokenPair;
}

/**
 * რეგისტრაციის პასუხი.
 *
 * როცა SMS არხი მიუწვდომელია, `tokens` მოდის მაშინვე — დასადასტურებელი
 * ნაბიჯი გამოტოვებულია. კლიენტი სწორედ ამ ველს უყურებს და წყვეტს,
 * კოდის ეკრანზე გადავიდეს თუ პირდაპირ შეიყვანოს.
 */
export interface RegisterResult {
  destination: string;
  message: string;
  verificationRequired: boolean;
  user?: PublicUser;
  tokens?: TokenPair;
}

export interface PublicUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  avatarUrl: string | null;
  phoneVerified: boolean;
  emailVerified: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleClient = new OAuth2Client();

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
    private readonly otp: OtpService,
    private readonly apple: AppleService,
    private readonly config: ConfigService,
  ) {}

  // ─── რეგისტრაცია ───────────────────────────────────────────────────────

  async register(dto: RegisterDto, ctx: SessionContext): Promise<RegisterResult> {
    if (!dto.acceptedTerms) {
      throw new BadRequestException('წესებსა და პირობებზე დათანხმება სავალდებულოა');
    }

    const email = normalizeEmail(dto.email);
    const phone = normalizePhone(dto.phone);

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { phone }], deletedAt: null },
    });

    if (existing) {
      // დადასტურებულ ანგარიშზე ღიად ვამბობთ — რეგისტრაციისას ეს არ არის გაჟონვა,
      // მომხმარებელს სჭირდება მიხვდეს რომ უკვე დარეგისტრირებულია.
      if (existing.status !== UserStatus.PENDING_VERIFICATION) {
        throw new ConflictException(
          existing.email === email
            ? 'ამ ელ. ფოსტით ანგარიში უკვე არსებობს'
            : 'ამ ნომრით ანგარიში უკვე არსებობს',
        );
      }
      // დაუდასტურებელი ანგარიში — მონაცემებს ვანახლებთ და კოდს თავიდან ვგზავნით.
      await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          email,
          phone,
          passwordHash: await argon2.hash(dto.password),
        },
      });
      return this.finishRegistration(existing.id, phone, ctx);
    }

    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email,
        phone,
        passwordHash: await argon2.hash(dto.password),
        status: UserStatus.PENDING_VERIFICATION,
        acceptedTermsAt: new Date(),
        termsVersion: TERMS_VERSION,
      },
    });

    return this.finishRegistration(user.id, phone, ctx);
  }

  /**
   * რეგისტრაციის დასრულება — ან კოდს ვგზავნით, ან ანგარიშს მაშინვე ვხსნით.
   *
   * `console` provider-ზე SMS არსად მიდის: კოდი მხოლოდ სერვერის ლოგშია.
   * ასეთ დროს დადასტურების მოთხოვნა რეგისტრაციას ჩიხში აგდებს — ვერავინ
   * ვერ დაასრულებს. ამიტომ არხის გარეშე ანგარიშს პირდაპირ ვააქტიურებთ,
   * ხოლო რეალური provider-ის ჩართვისთანავე ნაბიჯი თავისით ბრუნდება.
   */
  private async finishRegistration(
    userId: string,
    phone: string,
    ctx: SessionContext,
  ): Promise<RegisterResult> {
    if (this.otpReachable(phone)) {
      await this.otp.issue(phone, OtpPurpose.PHONE_VERIFICATION, userId);
      return {
        destination: phone,
        message: 'დადასტურების კოდი გამოგზავნილია',
        verificationRequired: true,
      };
    }

    this.logger.warn(
      `კოდის მიწოდება შეუძლებელია — ${phone} აქტიურდება დადასტურების გარეშე`,
    );

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.ACTIVE },
    });

    await this.ensureDefaultSubscription(user.id);
    const result = await this.buildAuthResult(user, ctx);

    return {
      destination: phone,
      message: 'ანგარიში შეიქმნა',
      verificationRequired: false,
      ...result,
    };
  }

  /**
   * კოდი მიაღწევს თუ არა მიმღებს.
   *
   * ორი გზაა: რეალური SMS provider, ან სატესტო ნომერი ფიქსირებული კოდით.
   * არცერთის შემთხვევაში დადასტურების მოთხოვნა უაზროა.
   */
  private otpReachable(phone: string): boolean {
    return (
      this.config.get<string>('sms.provider') !== 'console' ||
      !!this.otp.testCodeFor(phone)
    );
  }

  /** ტელეფონის დადასტურება — აქტივაცია და პირველივე შესვლა ერთ ნაბიჯში. */
  async verifyPhone(dto: VerifyOtpDto, ctx: SessionContext): Promise<AuthResult> {
    const destination = dto.destination.includes('@')
      ? normalizeEmail(dto.destination)
      : normalizePhone(dto.destination);

    const { userId } = await this.otp.verify(destination, dto.code, dto.purpose);
    if (!userId) {
      throw new BadRequestException('მომხმარებელი ვერ მოიძებნა');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.ACTIVE,
        phoneVerifiedAt: destination.includes('@') ? undefined : new Date(),
        emailVerifiedAt: destination.includes('@') ? new Date() : undefined,
      },
    });

    await this.ensureDefaultSubscription(user.id);
    return this.buildAuthResult(user, ctx);
  }

  async resendOtp(destination: string, purpose: OtpPurpose): Promise<{ message: string }> {
    const value = destination.includes('@')
      ? normalizeEmail(destination)
      : normalizePhone(destination);

    const user = await this.prisma.user.findFirst({
      where: value.includes('@') ? { email: value } : { phone: value },
    });

    // მომხმარებლის არსებობას არ ვამხელთ — პასუხი ყოველთვის ერთნაირია.
    if (user) {
      await this.otp.issue(value, purpose, user.id);
    }
    return { message: 'თუ ანგარიში არსებობს, კოდი გამოგზავნილია' };
  }

  // ─── შესვლა ────────────────────────────────────────────────────────────

  async login(dto: LoginDto, ctx: SessionContext): Promise<AuthResult> {
    const { kind, value } = resolveIdentifier(dto.identifier);

    const user = await this.prisma.user.findFirst({
      where: kind === 'email' ? { email: value, deletedAt: null } : { phone: value, deletedAt: null },
    });

    // მუდმივი შეტყობინება — არ ვამხელთ, ანგარიში არსებობს თუ პაროლია არასწორი.
    const invalid = new UnauthorizedException('ელ. ფოსტა/ტელეფონი ან პაროლი არასწორია');

    if (!user?.passwordHash) throw invalid;
    if (!(await argon2.verify(user.passwordHash, dto.password))) throw invalid;

    if (user.status === UserStatus.PENDING_VERIFICATION) {
      // SMS-ის გარეშე კოდს ვერსად ვაგზავნით — ასეთი ანგარიში სამუდამოდ
      // ჩარჩებოდა. ვხსნით და შესვლას ვაგრძელებთ.
      if (!this.otpReachable(user.phone ?? '')) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { status: UserStatus.ACTIVE },
        });
        await this.ensureDefaultSubscription(user.id);
      } else {
        await this.otp
          .issue(user.phone!, OtpPurpose.PHONE_VERIFICATION, user.id)
          .catch(() => undefined);
        throw new UnauthorizedException('ნომერი არ არის დადასტურებული. კოდი გამოგზავნილია');
      }
    }
    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('ანგარიში დაბლოკილია. დაგვიკავშირდით');
    }

    return this.buildAuthResult(user, ctx, { deviceId: dto.deviceId });
  }

  async loginWithGoogle(dto: GoogleAuthDto, ctx: SessionContext): Promise<AuthResult> {
    const clientIds = this.config.get<string[]>('google.clientIds', []);
    if (!clientIds.length) {
      throw new BadRequestException('Google ავტორიზაცია არ არის კონფიგურირებული');
    }

    const ticket = await this.googleClient
      .verifyIdToken({ idToken: dto.idToken, audience: clientIds })
      .catch(() => {
        throw new UnauthorizedException('Google-ის ტოკენი არასწორია');
      });

    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException('Google-მა ელ. ფოსტა არ დააბრუნა');
    }

    return this.authenticateWithProvider(
      {
        provider: AuthProvider.GOOGLE,
        providerUserId: payload.sub,
        email: payload.email,
        emailVerified: payload.email_verified !== false,
        firstName: payload.given_name,
        lastName: payload.family_name,
        avatarUrl: payload.picture,
      },
      ctx,
      dto.deviceId,
    );
  }

  async loginWithApple(dto: AppleAuthDto, ctx: SessionContext): Promise<AuthResult> {
    const identity = await this.apple.verify(dto.identityToken);

    return this.authenticateWithProvider(
      {
        provider: AuthProvider.APPLE,
        providerUserId: identity.providerUserId,
        email: identity.email,
        emailVerified: identity.emailVerified,
        // სახელი მხოლოდ პირველ ავტორიზაციაზე მოდის კლიენტიდან
        firstName: dto.firstName,
        lastName: dto.lastName,
        // Hide My Email-ის მისამართი რეალური ყუთი არ არის — ანგარიშების
        // შერწყმას მასზე არ ვახდენთ, თორემ სხვისი ანგარიში აღმოჩნდება.
        allowEmailLinking: !identity.isPrivateEmail,
      },
      ctx,
      dto.deviceId,
    );
  }

  /**
   * Google-ისა და Apple-ის საერთო ლოგიკა:
   * 1. თუ provider უკვე მიბმულია — შედის;
   * 2. თუ იმავე ელ. ფოსტის ანგარიში არსებობს — provider ემატება მას;
   * 3. სხვა შემთხვევაში იქმნება ახალი ანგარიში.
   */
  private async authenticateWithProvider(
    input: {
      provider: AuthProvider;
      providerUserId: string;
      email?: string;
      emailVerified: boolean;
      firstName?: string;
      lastName?: string;
      avatarUrl?: string;
      allowEmailLinking?: boolean;
    },
    ctx: SessionContext,
    deviceId?: string,
  ): Promise<AuthResult> {
    const email = input.email ? normalizeEmail(input.email) : undefined;

    const existingIdentity = await this.prisma.authIdentity.findUnique({
      where: {
        provider_providerUserId: {
          provider: input.provider,
          providerUserId: input.providerUserId,
        },
      },
      include: { user: true },
    });

    if (existingIdentity) {
      if (existingIdentity.user.status === UserStatus.SUSPENDED) {
        throw new UnauthorizedException('ანგარიში დაბლოკილია. დაგვიკავშირდით');
      }
      return this.buildAuthResult(existingIdentity.user, ctx, { deviceId });
    }

    // ანგარიშების შერწყმა მხოლოდ დადასტურებულ, რეალურ ელ. ფოსტაზე —
    // წინააღმდეგ შემთხვევაში სხვისი ანგარიშის მითვისება გახდებოდა შესაძლებელი.
    const canLinkByEmail = !!email && input.emailVerified && input.allowEmailLinking !== false;

    const existingUser = canLinkByEmail
      ? await this.prisma.user.findFirst({ where: { email, deletedAt: null } })
      : null;

    const user =
      existingUser ??
      (await this.prisma.user.create({
        data: {
          firstName: input.firstName?.trim() || 'მომხმარებელი',
          lastName: input.lastName?.trim() || '',
          email,
          avatarUrl: input.avatarUrl,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: email && input.emailVerified ? new Date() : null,
          acceptedTermsAt: new Date(),
          termsVersion: TERMS_VERSION,
        },
      }));

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('ანგარიში დაბლოკილია. დაგვიკავშირდით');
    }

    // დაუდასტურებელი ანგარიში სოციალური შესვლისას აქტიურდება
    if (user.status === UserStatus.PENDING_VERIFICATION) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { status: UserStatus.ACTIVE },
      });
      user.status = UserStatus.ACTIVE;
    }

    await this.prisma.authIdentity.create({
      data: {
        userId: user.id,
        provider: input.provider,
        providerUserId: input.providerUserId,
        email,
      },
    });

    await this.ensureDefaultSubscription(user.id);
    return this.buildAuthResult(user, ctx, { deviceId });
  }

  // ─── სესიები ───────────────────────────────────────────────────────────

  refresh(refreshToken: string, ctx: SessionContext): Promise<TokenPair> {
    return this.tokens.rotate(refreshToken, ctx);
  }

  async logout(sessionId: string): Promise<{ message: string }> {
    await this.tokens.revokeSession(sessionId);
    return { message: 'გამოხვედით სისტემიდან' };
  }

  async logoutAll(userId: string): Promise<{ message: string }> {
    await this.tokens.revokeAllForUser(userId);
    return { message: 'ყველა მოწყობილობიდან გამოხვედით' };
  }

  // ─── პაროლი ────────────────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ destination: string; message: string }> {
    const { kind, value } = resolveIdentifier(dto.identifier);

    const user = await this.prisma.user.findFirst({
      where: kind === 'email' ? { email: value, deletedAt: null } : { phone: value, deletedAt: null },
    });

    // კოდი ყოველთვის ტელეფონზე მიდის — ელ. ფოსტის არხი ჯერ არ არის ჩართული.
    if (user?.phone) {
      await this.otp.issue(user.phone, OtpPurpose.PASSWORD_RESET, user.id);
    }

    return {
      destination: user?.phone ? this.maskPhone(user.phone) : this.maskPhone(value),
      message: 'თუ ანგარიში არსებობს, აღდგენის კოდი გამოგზავნილია',
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const destination = dto.destination.includes('@')
      ? normalizeEmail(dto.destination)
      : normalizePhone(dto.destination);

    const { userId } = await this.otp.verify(destination, dto.code, OtpPurpose.PASSWORD_RESET);
    if (!userId) throw new BadRequestException('მომხმარებელი ვერ მოიძებნა');

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await argon2.hash(dto.newPassword) },
    });

    // პაროლი შეიცვალა — ყველა ძველი სესია უქმდება.
    await this.tokens.revokeAllForUser(userId);
    return { message: 'პაროლი წარმატებით შეიცვალა' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    if (!user.passwordHash) {
      throw new BadRequestException('ანგარიშს პაროლი არ აქვს დაყენებული');
    }
    if (!(await argon2.verify(user.passwordHash, dto.currentPassword))) {
      throw new BadRequestException('მიმდინარე პაროლი არასწორია');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await argon2.hash(dto.newPassword) },
    });
    await this.tokens.revokeAllForUser(userId);
    return { message: 'პაროლი შეიცვალა, გაიარეთ ავტორიზაცია თავიდან' };
  }

  // ─── დამხმარე ──────────────────────────────────────────────────────────

  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.toPublicUser(user);
  }

  /**
   * ახალ მომხმარებელს ავტომატურად ენიჭება ნაგულისხმევი (უფასო) პაკეტი.
   * პაკეტი ბაზაშია — კოდი მხოლოდ `isDefault` ფლაგს ეძებს.
   */
  private async ensureDefaultSubscription(userId: string): Promise<void> {
    const active = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] } },
    });
    if (active) return;

    const plan = await this.prisma.plan.findFirst({
      where: { isDefault: true, status: 'ACTIVE', deletedAt: null },
    });
    if (!plan) {
      this.logger.warn('ნაგულისხმევი პაკეტი ვერ მოიძებნა — გაუშვი `npm run api:seed`');
      return;
    }

    await this.prisma.subscription.create({
      data: {
        userId,
        planId: plan.id,
        status: plan.trialDays > 0 ? SubscriptionStatus.TRIALING : SubscriptionStatus.ACTIVE,
        trialEndsAt:
          plan.trialDays > 0
            ? new Date(Date.now() + plan.trialDays * 24 * 60 * 60 * 1000)
            : null,
      },
    });
  }

  private async buildAuthResult(
    user: User,
    ctx: SessionContext,
    overrides: Partial<SessionContext> = {},
  ): Promise<AuthResult> {
    const tokens = await this.tokens.issue(user, { ...ctx, ...overrides });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: AuditAction.LOGIN,
        entityType: 'User',
        entityId: user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      } satisfies Prisma.AuditLogUncheckedCreateInput,
    });

    return { user: this.toPublicUser(user), tokens };
  }

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      avatarUrl: user.avatarUrl,
      phoneVerified: !!user.phoneVerifiedAt,
      emailVerified: !!user.emailVerifiedAt,
    };
  }

  private maskPhone(phone: string): string {
    return phone.length > 4 ? `${'*'.repeat(phone.length - 4)}${phone.slice(-4)}` : phone;
  }
}
