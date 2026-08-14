import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_JWKS_URL = new URL('https://appleid.apple.com/auth/keys');

export interface AppleIdentity {
  /** Apple-ის სტაბილური მომხმარებლის ID — არასდროს იცვლება ამ აპისთვის */
  providerUserId: string;
  email?: string;
  emailVerified: boolean;
  /** true, თუ მომხმარებელმა „Hide My Email" აირჩია (@privaterelay.appleid.com) */
  isPrivateEmail: boolean;
}

@Injectable()
export class AppleService {
  /**
   * JWKS ქეშირდება ბიბლიოთეკის შიგნით — Apple-ს ყოველ შესვლაზე არ ვაწუხებთ.
   * გასაღების როტაციისას ავტომატურად ხელახლა ჩამოიტვირთება.
   */
  private readonly jwks = createRemoteJWKSet(APPLE_JWKS_URL);

  constructor(private readonly config: ConfigService) {}

  /**
   * ამოწმებს Apple-ის identityToken-ს: ხელმოწერას JWKS-ით, გამომცემელს და
   * audience-ს. კლიენტისგან მოსული ნებისმიერი სხვა ველი (email, სახელი)
   * არასანდოა — ვენდობით მხოლოდ ტოკენში ხელმოწერილს.
   */
  async verify(identityToken: string): Promise<AppleIdentity> {
    const clientIds = this.config.get<string[]>('apple.clientIds', []);
    if (!clientIds.length) {
      throw new BadRequestException('Apple ავტორიზაცია არ არის კონფიგურირებული');
    }

    const { payload } = await jwtVerify(identityToken, this.jwks, {
      issuer: APPLE_ISSUER,
      audience: clientIds,
    }).catch(() => {
      throw new UnauthorizedException('Apple-ის ტოკენი არასწორია');
    });

    if (!payload.sub) {
      throw new UnauthorizedException('Apple-მა მომხმარებლის ID არ დააბრუნა');
    }

    const email = typeof payload.email === 'string' ? payload.email : undefined;

    // Apple-ს email_verified ხან string-ად, ხან boolean-ად აბრუნებს
    const rawVerified = payload.email_verified;
    const emailVerified = rawVerified === true || rawVerified === 'true';

    return {
      providerUserId: payload.sub,
      email,
      emailVerified,
      isPrivateEmail: !!email?.endsWith('@privaterelay.appleid.com'),
    };
  }
}
