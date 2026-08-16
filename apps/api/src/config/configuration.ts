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
    /** ნომერი → ფიქსირებული კოდი. ამ ნომრებზე SMS არ იგზავნება. */
    testNumbers: Record<string, string>;
  };
  sms: {
    provider: string;
    senderName: string;
    apiKey?: string;
    accountSid?: string;
    apiUrl?: string;
  };
  google: {
    clientIds: string[];
  };
  apple: {
    /** Bundle ID-ები / Services ID-ები, რომლებიც identityToken-ის `aud`-ში დაიშვება */
    clientIds: string[];
  };
  storage: {
    /** "local" | "r2" */
    fileDriver: string;
    /** "local" | "bunny" */
    videoDriver: string;
    r2: {
      accountId?: string;
      bucket?: string;
      accessKeyId?: string;
      secretAccessKey?: string;
      /** bucket-ის საჯარო დომენი */
      publicUrl?: string;
    };
    bunny: {
      libraryId?: string;
      apiKey?: string;
      cdnHost?: string;
      /** token authentication-ის გასაღები — ხელმოწერილი ბმულებისთვის */
      tokenKey?: string;
      /** webhook-ის საიდუმლო — ჩვენ ვქმნით და Bunny-ს მისამართში ვაწვდით */
      webhookSecret?: string;
    };
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
    testNumbers: parseTestNumbers(process.env.OTP_TEST_NUMBERS),
  },
  sms: {
    provider: process.env.SMS_PROVIDER ?? 'console',
    senderName: process.env.SMS_SENDER_NAME ?? 'BabyCare',
    apiKey: process.env.SMS_API_KEY,
    accountSid: process.env.SMS_ACCOUNT_SID,
    apiUrl: process.env.SMS_API_URL,
  },
  google: {
    clientIds: csv(process.env.GOOGLE_CLIENT_IDS),
  },
  apple: {
    clientIds: csv(process.env.APPLE_CLIENT_IDS),
  },
  storage: {
    fileDriver: process.env.FILE_STORAGE_DRIVER ?? 'local',
    videoDriver: process.env.VIDEO_STORAGE_DRIVER ?? 'local',
    r2: {
      accountId: process.env.R2_ACCOUNT_ID,
      bucket: process.env.R2_BUCKET,
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      publicUrl: process.env.R2_PUBLIC_URL,
    },
    bunny: {
      libraryId: process.env.BUNNY_LIBRARY_ID,
      apiKey: process.env.BUNNY_API_KEY,
      cdnHost: process.env.BUNNY_CDN_HOST,
      tokenKey: process.env.BUNNY_TOKEN_KEY,
      webhookSecret: process.env.BUNNY_WEBHOOK_SECRET,
    },
  },
});

/**
 * `OTP_TEST_NUMBERS`-ის გარჩევა: `+995599000000:123456,+995577111111:000000`.
 *
 * ასეთ ნომრებზე კოდი ყოველთვის ერთი და იგივეა და SMS არსად მიდის —
 * გამოსადეგია, სანამ რეალური provider ჩართული არ არის.
 */
function parseTestNumbers(raw?: string): Record<string, string> {
  if (!raw?.trim()) return {};

  return raw.split(',').reduce<Record<string, string>>((acc, pair) => {
    const [phone, code] = pair.split(':').map((part) => part.trim());
    if (phone && code) acc[phone] = code;
    return acc;
  }, {});
}
