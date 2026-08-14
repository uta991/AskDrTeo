export interface AppConfig {
  env: string;
  port: number;
  apiPrefix: string;
  /** გარე მისამართი, რომლითაც კლიენტი ატვირთვებს ხედავს */
  publicUrl: string;
  jwt: {
    accessSecret: string;
    accessTtl: string;
    refreshTtlDays: number;
  };
  otp: {
    length: number;
    ttlMinutes: number;
    maxAttempts: number;
  };
  sms: {
    provider: string;
    senderName: string;
    apiKey?: string;
    apiUrl?: string;
  };
  google: {
    clientIds: string[];
  };
  apple: {
    /** Bundle ID-ები / Services ID-ები, რომლებიც identityToken-ის `aud`-ში დაიშვება */
    clientIds: string[];
  };
}

function csv(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default (): AppConfig => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  publicUrl: process.env.PUBLIC_URL ?? 'http://localhost:3000',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'change-me-access-secret',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtlDays: parseInt(process.env.JWT_REFRESH_TTL_DAYS ?? '30', 10),
  },
  otp: {
    length: parseInt(process.env.OTP_LENGTH ?? '6', 10),
    ttlMinutes: parseInt(process.env.OTP_TTL_MINUTES ?? '5', 10),
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS ?? '5', 10),
  },
  sms: {
    provider: process.env.SMS_PROVIDER ?? 'console',
    senderName: process.env.SMS_SENDER_NAME ?? 'BabyCare',
    apiKey: process.env.SMS_API_KEY,
    apiUrl: process.env.SMS_API_URL,
  },
  google: {
    clientIds: csv(process.env.GOOGLE_CLIENT_IDS),
  },
  apple: {
    clientIds: csv(process.env.APPLE_CLIENT_IDS),
  },
});
