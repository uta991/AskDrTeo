import { NativeModules } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

/**
 * API-ის მისამართი.
 *
 * ფიზიკურ ტელეფონზე `localhost` თავად ტელეფონს ნიშნავს, არა კომპიუტერს —
 * ამიტომ დეველოპმენტში Metro-ს მისამართიდან ვიღებთ კომპიუტერის IP-ს.
 * ასე ერთი და იგივე კოდი მუშაობს სიმულატორზეც და ტელეფონზეც, IP-ის
 * ხელით ჩაწერის გარეშე (Wi-Fi ქსელი საერთო უნდა იყოს).
 */
const PRODUCTION_API = 'https://api.askdrteo.com/api/v1';

function resolveApiUrl(): string {
  const configured = Constants.expoConfig?.extra?.apiUrl as string | undefined;

  // Release ბილდში Metro არ არსებობს და კომპიუტერის IP-ს ვერსაიდან ვიგებთ —
  // მისამართი მხოლოდ კონფიგიდან მოდის. `__DEV__` ერთადერთი საიმედო
  // განმასხვავებელია: მისამართის ტექსტზე დაყრდნობა იმას ნიშნავდა, რომ
  // პროდაქშენის მისამართის ჩაწერისთანავე ლოკალური მუშაობაც გატყდებოდა.
  if (!__DEV__) return configured ?? PRODUCTION_API;

  const host = devServerHost();
  if (host) return `http://${host}:3000/api/v1`;

  return 'http://localhost:3000/api/v1';
}

/**
 * დეველოპმენტ-სერვერის (Metro) ჰოსტი.
 *
 * `scriptURL` ყოველთვის სახეზეა debug ბილდში — სწორედ იქიდან ჩამოიტვირთა
 * JS. `expoConfig.hostUri` კი მხოლოდ Expo Go-შია, ნატიურ ბილდში ცარიელია
 * და მისამართი localhost-ზე ვარდებოდა.
 */
function devServerHost(): string | null {
  const scriptURL = NativeModules.SourceCode?.getConstants?.().scriptURL as string | undefined;

  const fromScript = scriptURL?.match(/^https?:\/\/([^/:]+)/)?.[1];
  if (fromScript && fromScript !== 'localhost' && fromScript !== '127.0.0.1') {
    return fromScript;
  }

  return Constants.expoConfig?.hostUri?.split(':')[0] ?? null;
}

const API_URL = resolveApiUrl();

const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const tokenStore = {
  get: (key: string) => SecureStore.getItemAsync(key),
  async save(accessToken: string, refreshToken: string) {
    await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
  },
  async clear() {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  },
  access: () => SecureStore.getItemAsync(ACCESS_KEY),
  refresh: () => SecureStore.getItemAsync(REFRESH_KEY),
};

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

/**
 * ერთდროული 401-ების დროს refresh მხოლოდ ერთხელ უნდა შესრულდეს —
 * დანარჩენი მოთხოვნები იმავე promise-ს ელოდებიან.
 */
let refreshPromise: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  const refreshToken = await tokenStore.refresh();
  if (!refreshToken) return false;

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    await tokenStore.clear();
    return false;
  }

  const data = (await res.json()) as { accessToken: string; refreshToken: string };
  await tokenStore.save(data.accessToken, data.refreshToken);
  return true;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  const send = async (): Promise<Response> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth) {
      const token = await tokenStore.access();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    return fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  let res = await send();

  if (res.status === 401 && auth) {
    refreshPromise ??= refreshTokens().finally(() => {
      refreshPromise = null;
    });
    if (await refreshPromise) {
      res = await send();
    }
  }

  if (!res.ok) {
    throw await toApiError(res);
  }

  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

/** NestJS ValidationPipe აბრუნებს message-ს მასივად — ერთ ტექსტად ვაქცევთ. */
async function toApiError(res: Response): Promise<ApiError> {
  let payload: { message?: string | string[] } = {};
  try {
    payload = await res.json();
  } catch {
    // JSON არ დაბრუნდა — ვრჩებით ზოგად შეტყობინებაზე
  }

  const raw = payload.message;
  const message = Array.isArray(raw) ? raw[0] : (raw ?? 'დაფიქსირდა შეცდომა, სცადეთ თავიდან');

  return new ApiError(message, res.status);
}

export { API_URL };
