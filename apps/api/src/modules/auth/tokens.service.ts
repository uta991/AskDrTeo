import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface JwtPayload {
  sub: string;
  role: string;
  sid: string;
}

export interface SessionContext {
  deviceId?: string;
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Access token — მოკლევადიანი JWT (stateless).
 * Refresh token — შემთხვევითი 64-ბაიტიანი სტრიქონი; ბაზაში მხოლოდ SHA-256 hash ინახება,
 * რომ ბაზის გაჟონვის შემთხვევაში მოქმედი token არავის ხელში არ აღმოჩნდეს.
 */
@Injectable()
export class TokensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async issue(user: User, ctx: SessionContext = {}): Promise<TokenPair> {
    const refreshToken = randomBytes(64).toString('base64url');
    const ttlDays = this.config.get<number>('jwt.refreshTtlDays', 30);

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: this.hash(refreshToken),
        deviceId: ctx.deviceId,
        userAgent: ctx.userAgent,
        ipAddress: ctx.ipAddress,
        expiresAt: new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000),
      },
    });

    const accessToken = await this.signAccess(user, session.id);
    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.get<string>('jwt.accessTtl', '15m'),
    };
  }

  /** Refresh-ის როტაცია: ძველი სესია უქმდება, ახალი იქმნება. */
  async rotate(refreshToken: string, ctx: SessionContext = {}): Promise<TokenPair> {
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: this.hash(refreshToken) },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('სესიის ვადა ამოიწურა, გაიარეთ ავტორიზაცია თავიდან');
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    return this.issue(session.user, {
      deviceId: ctx.deviceId ?? session.deviceId ?? undefined,
      userAgent: ctx.userAgent,
      ipAddress: ctx.ipAddress,
    });
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** „ყველა მოწყობილობიდან გასვლა“ — პაროლის შეცვლისასაც გამოიყენება. */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private signAccess(user: User, sessionId: string): Promise<string> {
    const payload: JwtPayload = { sub: user.id, role: user.role, sid: sessionId };
    return this.jwt.signAsync(payload);
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
