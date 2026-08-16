import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsStatus } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface SendSmsInput {
  phone: string;
  body: string;
  userId?: string;
  templateKey?: string;
}

const SEND_TIMEOUT_MS = 10_000;

interface SmsProviderResult {
  providerRef?: string;
  costMinor?: number;
}

/**
 * SMS-ის გაგზავნა provider-ისგან დამოუკიდებლად.
 * ყველა გაგზავნილი შეტყობინება ლოგდება `sms_messages` ცხრილში.
 *
 * ახალი provider-ის დასამატებლად საკმარისია ერთი მეთოდის დაწერა და
 * `dispatch`-ში ერთი ხაზის დამატება — გამომძახებელი კოდი არ იცვლება.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** აბრუნებს `true`-ს, თუ provider-მა შეტყობინება მიიღო. */
  async send(input: SendSmsInput): Promise<boolean> {
    const record = await this.prisma.smsMessage.create({
      data: {
        userId: input.userId,
        phone: input.phone,
        body: input.body,
        templateKey: input.templateKey,
        provider: this.config.get<string>('sms.provider'),
        status: SmsStatus.QUEUED,
      },
    });

    try {
      const result = await this.dispatch(input.phone, input.body);
      await this.prisma.smsMessage.update({
        where: { id: record.id },
        data: {
          status: SmsStatus.SENT,
          providerRef: result.providerRef,
          costMinor: result.costMinor,
          sentAt: new Date(),
        },
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`SMS ვერ გაიგზავნა ${input.phone}: ${message}`);
      await this.prisma.smsMessage.update({
        where: { id: record.id },
        data: { status: SmsStatus.FAILED, error: message },
      });
      return false;
    }
  }

  private async dispatch(phone: string, body: string): Promise<SmsProviderResult> {
    const provider = this.config.get<string>('sms.provider');

    switch (provider) {
      case 'console':
        this.logger.warn(`[SMS → ${phone}] ${body}`);
        return {};
      case 'smsoffice':
        return this.sendViaSmsOffice(phone, body);
      case 'twilio':
        return this.sendViaTwilio(phone, body);
      case 'smsgate':
        return this.sendViaSmsGate(phone, body);
      default:
        throw new Error(`SMS provider "${provider}" არ არის იმპლემენტირებული`);
    }
  }

  /**
   * SMSOffice.ge — ქართული provider.
   *
   * ნომერს ლოკალურ ფორმატში ითხოვს (`599123456`), ამიტომ `+995` ეჭრება.
   * პასუხი JSON-ია; წარმატებას `Success: true` აღნიშნავს, შეცდომას კი
   * `ErrorCode` — HTTP სტატუსი ორივე შემთხვევაში 200-ია, ამიტომ მარტო
   * მას ვერ დავეყრდნობით.
   */
  private async sendViaSmsOffice(phone: string, body: string): Promise<SmsProviderResult> {
    const key = this.requireCredential('sms.apiKey', 'SMS_API_KEY');
    const sender = this.config.get<string>('sms.senderName');
    const baseUrl = this.config.get<string>('sms.apiUrl') || 'https://smsoffice.ge/api/v2/send/';

    const url = new URL(baseUrl);
    url.searchParams.set('key', key);
    url.searchParams.set('destination', phone.replace(/^\+?995/, ''));
    url.searchParams.set('sender', sender ?? '');
    url.searchParams.set('content', body);

    const response = await this.fetchWithTimeout(url.toString());
    const text = await response.text();

    if (!response.ok) {
      throw new Error(`SMSOffice HTTP ${response.status}: ${text.slice(0, 200)}`);
    }

    let payload: { Success?: boolean; Message?: string; ErrorCode?: number; Output?: string };
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(`SMSOffice-ის პასუხი გაურკვეველია: ${text.slice(0, 200)}`);
    }

    if (payload.Success === false || (payload.ErrorCode && payload.ErrorCode !== 0)) {
      throw new Error(`SMSOffice [${payload.ErrorCode}]: ${payload.Message ?? 'უცნობი შეცდომა'}`);
    }

    return { providerRef: payload.Output };
  }

  /** Twilio — საერთაშორისო სათადარიგო არხი. */
  private async sendViaTwilio(phone: string, body: string): Promise<SmsProviderResult> {
    const accountSid = this.requireCredential('sms.accountSid', 'SMS_ACCOUNT_SID');
    const authToken = this.requireCredential('sms.apiKey', 'SMS_API_KEY');
    const from = this.requireCredential('sms.senderName', 'SMS_SENDER_NAME');

    const response = await this.fetchWithTimeout(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: phone, From: from, Body: body }).toString(),
      },
    );

    const payload = (await response.json()) as { sid?: string; message?: string; code?: number };

    if (!response.ok) {
      throw new Error(`Twilio [${payload.code}]: ${payload.message ?? response.status}`);
    }

    return { providerRef: payload.sid };
  }

  /**
   * SMS Gateway (sms-gate.app) — Android ტელეფონი რეალური SIM-ით.
   *
   * შეტყობინება იმავე ნომრიდან მიდის, რომლითაც ტელეფონია აღჭურვილი,
   * ანუ sender ID-ის რეგისტრაცია საჭირო არ არის. `deviceId` მაშინაა
   * აუცილებელი, როცა ანგარიშზე ერთზე მეტი მოწყობილობაა მიბმული.
   */
  private async sendViaSmsGate(phone: string, body: string): Promise<SmsProviderResult> {
    const gate = this.config.get<SmsGateConfig>('sms.gate')!;

    if (!gate.user || !gate.password) {
      throw new Error('SMS_GATE_USER / SMS_GATE_PASSWORD არ არის მითითებული');
    }

    // ტელეფონი უკვე E.164-შია შენახული; შემოწმება იმისთვისაა, რომ
    // არასწორი ჩანაწერი gateway-მდე არ მივიდეს.
    if (!/^\+995\d{9}$/.test(phone)) {
      throw new Error(`ნომრის ფორმატი არასწორია: ${phone}`);
    }

    const payload: Record<string, unknown> = {
      phoneNumbers: [phone],
      textMessage: { text: body },
    };
    if (gate.deviceId) payload.deviceId = gate.deviceId;

    const url = new URL(gate.url);
    // GSM კონტროლერების SIM-ებს libphonenumber ვერ ცნობს, ფორმატს კი
    // თავად ვამოწმებთ — gateway-ის ვალიდაცია ზედმეტია.
    url.searchParams.set('skipPhoneValidation', 'true');

    const response = await this.fetchWithTimeout(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${gate.user}:${gate.password}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(`SMS Gateway HTTP ${response.status}: ${text.slice(0, 200)}`);
    }

    const result = JSON.parse(text) as { id?: string; state?: string };
    this.logger.log(`SMS Gateway: ${phone} → ${result.state ?? 'queued'} (${result.id})`);

    return { providerRef: result.id };
  }

  /** კონფიგის სავალდებულო ველი — ცარიელზე გასაგები შეცდომა, არა 401 provider-იდან. */
  private requireCredential(path: string, envName: string): string {
    const value = this.config.get<string>(path);
    if (!value) throw new Error(`${envName} არ არის მითითებული`);
    return value;
  }

  /** provider-ის ჩამოკიდება რეგისტრაციას არ უნდა გაუყინოს. */
  private async fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`provider-მა ${SEND_TIMEOUT_MS / 1000} წამში არ უპასუხა`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

interface SmsGateConfig {
  user?: string;
  password?: string;
  deviceId?: string;
  url: string;
}
