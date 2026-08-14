import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { UserStatus } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuthenticatedUser } from '@/common/decorators/current-user.decorator';
import { JwtPayload } from '../tokens.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.accessSecret'),
    });
  }

  /**
   * ხელმოწერის შემოწმება საკმარისი არ არის — ვამოწმებთ, სესია გაუქმებული ხომ არ არის.
   * ეს აძლევს ძალას "ყველა მოწყობილობიდან გასვლას" და ბლოკირებას.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('სესია აღარ არის აქტიური');
    }
    if (session.user.status !== UserStatus.ACTIVE || session.user.deletedAt) {
      throw new UnauthorizedException('ანგარიში არ არის აქტიური');
    }

    return { id: session.user.id, role: session.user.role, sessionId: session.id };
  }
}
