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
  auth: {
    /**
     * SMS არხის გარეშე რეგისტრაციის დაშვება.
     *
     * მხოლოდ ლოკალური მუშაობისთვისაა: ჩართული რომ იყოს, პროდაქშენში
     * გატეხილი SMS-ის დროს ყველა დაუდასტურებლად შემოვიდოდა.
     */
    allowUnverifiedSignup: boolean;
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
    gate: {
      user?: string;
      password?: string;
      deviceId?: string;
      url: string;
    };
    apiUrl?: string;
  };
  google: {
    clientIds: string[];
  };
  apple: {
    /** Bundle ID-ები / Services ID-ები, რომლებიც identityToken-ის `aud`-ში დაიშვება */
    clientIds: string[];
  };
  /** საიტის საჯარო მისამართი — SMS-ში ბმულისთვის */
  webUrl: string;
  ai: {
    /** ცარიელი გასაღები = ასისტენტი გამორთულია და ამას ღიად ვამბობთ */
    apiKey?: string;
    model: string;
    maxTokens: number;
    /**
     * დღიური ლიმიტი ერთ მშობელზე. 0 = შეზღუდვის გარეშე.
     *
     * სატესტო ეტაპზე გამორთულია; გაშვებამდე 10-ზე უნდა დაბრუნდეს —
     * ერთი პასუხი ≈ 4 თეთრია და 40-ლარიან პაკეტს გაუთვლელი მოხმარება
     * მარჟას შეუჭამს.
     */
    dailyLimit: number;
    /** ანგარიშები ლიმიტის გარეშე — ტესტირებისთვის */
    unlimitedEmails: string[];
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
  auth: {
    allowUnverifiedSignup: process.env.ALLOW_UNVERIFIED_SIGNUP === 'true',
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
    gate: {
      user: process.env.SMS_GATE_USER,
      password: process.env.SMS_GATE_PASSWORD,
      deviceId: process.env.SMS_GATE_DEVICE_ID,
      url: process.env.SMS_GATE_URL ?? 'https://api.sms-gate.app/3rdparty/v1/messages',
    },
    apiUrl: process.env.SMS_API_URL,
  },
  google: {
    clientIds: csv(process.env.GOOGLE_CLIENT_IDS),
  },
  apple: {
    clientIds: csv(process.env.APPLE_CLIENT_IDS),
  },
  webUrl: process.env.WEB_URL ?? 'https://askdrteo.com',
  ai: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.AI_MODEL ?? 'claude-sonnet-5',
    maxTokens: Number(process.env.AI_MAX_TOKENS ?? 2000),
    dailyLimit: Number(process.env.AI_DAILY_LIMIT ?? 0),
    unlimitedEmails: csv(process.env.AI_UNLIMITED_EMAILS).map((email) => email.toLowerCase()),
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
