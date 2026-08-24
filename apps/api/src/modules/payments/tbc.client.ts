import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * TBC Checkout (tpay) — თხელი კლიენტი ბანკის API-სთვის.
 *
 * ბანკთან საუბარი მხოლოდ აქედან ხდება: client secret და apikey
 * სერვერს არსად ტოვებს. ბრაუზერი მხოლოდ ბანკის გვერდზე გადადის.
 *
 * ავტორიზაცია ორსაფეხურიანია — access token იღება client_id/secret-ით,
 * ხოლო ყოველ მოთხოვნას დამატებით `apikey` header სჭირდება.
 */

const REQUEST_TIMEOUT_MS = 15_000;

/** ტოკენი დღეს მოქმედებს; წუთის მარაგით ვცვლით, რომ ზღვარზე არ დავიჭიროთ. */
const TOKEN_SAFETY_MS = 60_000;

interface TbcSettings {
  clientId?: string;
  clientSecret?: string;
  apiKey?: string;
  apiUrl: string;
  returnUrl: string;
}

export interface TbcCreateInput {
  amountMinor: number;
  currency: string;
  /** ჩვენი Payment.id — ბანკის ამონაწერში ასე ვცნობთ */
  merchantPaymentId: string;
  description: string;
  returnUrl: string;
  callbackUrl?: string;
}

export interface TbcPayment {
  payId: string;
  status: string;
  /** ლარებში — ბანკი მთელ ერთეულებში აბრუნებს */
  amount: number;
  currency: string;
  transactionId: string | null;
  /** გადახდის გვერდის მისამართი — მხოლოდ შექმნისას */
  checkoutUrl: string | null;
}

interface TbcLink {
  uri: string;
  method: string;
  rel: string;
}

interface TbcPaymentResponse {
  payId: string;
  status: string;
  amount: number | { total?: number };
  currency: string;
  transactionId?: string | null;
  links?: TbcLink[];
  developerMessage?: string | null;
  userMessage?: string | null;
}

@Injectable()
export class TbcClient {
  private readonly logger = new Logger(TbcClient.name);

  private token: string | null = null;
  private tokenExpiresAt = 0;

  constructor(private readonly config: ConfigService) {}

  /** ჩართულია თუ არა — გასაღებების გარეშე ღილაკს საერთოდ არ ვაჩვენებთ. */
  get enabled(): boolean {
    const tbc = this.settings;
    return Boolean(tbc.clientId && tbc.clientSecret && tbc.apiKey);
  }

  async createPayment(input: TbcCreateInput): Promise<TbcPayment> {
    const body = {
      amount: {
        currency: input.currency,
        total: Number((input.amountMinor / 100).toFixed(2)),
      },
      returnurl: input.returnUrl,
      ...(input.callbackUrl ? { callbackUrl: input.callbackUrl } : {}),
      merchantPaymentId: input.merchantPaymentId,
      // ბანკის ველი 30 სიმბოლოზეა შეზღუდული
      description: input.description.slice(0, 30),
      language: 'KA',
      expirationMinutes: 30,
    };

    const payment = await this.request<TbcPaymentResponse>('POST', '/v1/tpay/payments', body);
    return this.normalize(payment);
  }

  /** ერთადერთი ჭეშმარიტების წყარო — გადახდის რეალური სტატუსი ბანკში. */
  async getPayment(payId: string): Promise<TbcPayment> {
    const payment = await this.request<TbcPaymentResponse>(
      'GET',
      `/v1/tpay/payments/${encodeURIComponent(payId)}`,
    );
    return this.normalize(payment);
  }

  // ─── შიდა ────────────────────────────────────────────────────────────

  private get settings(): TbcSettings {
    return this.config.get<TbcSettings>('payments.tbc')!;
  }

  private normalize(payment: TbcPaymentResponse): TbcPayment {
    // შექმნისას `amount` რიცხვია, ზოგ პასუხში კი ობიექტი — ორივეს ვიღებთ
    const amount =
      typeof payment.amount === 'number' ? payment.amount : (payment.amount?.total ?? 0);

    const approval =
      payment.links?.find((link) => link.rel?.toLowerCase() === 'approval_url') ??
      payment.links?.find((link) => link.method?.toUpperCase() === 'REDIRECT');

    return {
      payId: payment.payId,
      status: payment.status,
      amount,
      currency: payment.currency,
      transactionId: payment.transactionId ?? null,
      checkoutUrl: approval?.uri ?? null,
    };
  }

  /**
   * ვადაგასული ტოკენი ერთხელ ახლდება და მოთხოვნა მეორდება — თორემ
   * დღეში ერთხელ ყველა გადახდა 401-ით ჩავარდებოდა.
   */
  private async request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const first = await this.send(method, path, await this.accessToken(), body);
    if (first.status !== 401) return this.parse<T>(first, path);

    this.token = null;
    const retry = await this.send(method, path, await this.accessToken(), body);
    return this.parse<T>(retry, path);
  }

  private async send(
    method: 'GET' | 'POST',
    path: string,
    token: string,
    body?: unknown,
  ): Promise<Response> {
    const { apiUrl, apiKey } = this.settings;

    try {
      return await fetch(`${apiUrl}${path}`, {
        method,
        headers: {
          apikey: apiKey!,
          Authorization: `Bearer ${token}`,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.error(`TBC ${method} ${path} — კავშირი ვერ დამყარდა`, error as Error);
      throw new ServiceUnavailableException('ბანკთან კავშირი ვერ დამყარდა — სცადეთ ცოტა ხანში');
    }
  }

  private async parse<T>(res: Response, path: string): Promise<T> {
    const payload = (await res.json().catch(() => null)) as
      | (T & { developerMessage?: string; userMessage?: string })
      | null;

    if (!res.ok || !payload) {
      // developerMessage ბანკის დიაგნოსტიკაა — მომხმარებელს არ ვაჩვენებთ
      this.logger.error(
        `TBC ${path} → ${res.status}: ${payload?.developerMessage ?? '(პასუხი ცარიელია)'}`,
      );
      throw new ServiceUnavailableException('გადახდის სისტემა დროებით მიუწვდომელია');
    }

    return payload;
  }

  private async accessToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiresAt) return this.token;

    const { apiUrl, apiKey, clientId, clientSecret } = this.settings;
    if (!clientId || !clientSecret || !apiKey) {
      throw new ServiceUnavailableException('გადახდის სისტემა ჯერ არ არის ჩართული');
    }

    let res: Response;
    try {
      res = await fetch(`${apiUrl}/v1/tpay/access-token`, {
        method: 'POST',
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.error('TBC access-token — კავშირი ვერ დამყარდა', error as Error);
      throw new ServiceUnavailableException('ბანკთან კავშირი ვერ დამყარდა — სცადეთ ცოტა ხანში');
    }

    if (!res.ok) {
      this.logger.error(`TBC access-token → ${res.status} (client_id/secret ან apikey არასწორია)`);
      throw new ServiceUnavailableException('გადახდის სისტემა დროებით მიუწვდომელია');
    }

    const data = (await res.json()) as { access_token: string; expires_in: number };

    this.token = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in ?? 3600) * 1000 - TOKEN_SAFETY_MS;

    return this.token;
  }
}
