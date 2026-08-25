import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { RtcRole, RtcTokenBuilder } from 'agora-token';
import {
  PARENT_UID,
  STAFF_UID,
  TOKEN_TTL_SECONDS,
  agoraConfigured,
  type AgoraAccess,
} from './video-visits.config';

/**
 * Agora-ს წვდომის გაცემა.
 *
 * App Certificate სერვერს არასდროს ტოვებს — კლიენტს მხოლოდ ერთ არხზე
 * და ერთ მონაწილეზე გამოშვებული, მოკლევადიანი ტოკენი ხვდება. ვადის
 * გასვლის შემდეგ იმავე ტოკენით ხელახლა შესვლა შეუძლებელია.
 */
@Injectable()
export class AgoraService {
  private readonly logger = new Logger(AgoraService.name);

  get enabled(): boolean {
    return agoraConfigured();
  }

  /** ტოკენი ერთი მხარისთვის, ერთ არხზე. */
  issue(channel: string, side: 'parent' | 'staff'): AgoraAccess {
    const appId = process.env.AGORA_APP_ID;
    const certificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appId || !certificate) {
      this.logger.error('AGORA_APP_ID / AGORA_APP_CERTIFICATE არ არის მითითებული');
      throw new ServiceUnavailableException('ვიდეო ზარი ჯერ არ არის ჩართული');
    }

    const uid = side === 'parent' ? PARENT_UID : STAFF_UID;
    const expiresIn = TOKEN_TTL_SECONDS;
    const privilegeExpire = Math.floor(Date.now() / 1000) + expiresIn;

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      certificate,
      channel,
      uid,
      // ორივე მხარე თანაბარი მონაწილეა — ექიმიც ლაპარაკობს და მშობელიც
      RtcRole.PUBLISHER,
      expiresIn,
      privilegeExpire,
    );

    return {
      appId,
      channel,
      token,
      uid,
      expiresAt: new Date(privilegeExpire * 1000),
    };
  }
}
