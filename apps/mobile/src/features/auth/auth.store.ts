import { create } from 'zustand';
import { api, tokenStore } from '@/api/client';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  avatarUrl: string | null;
  phoneVerified: boolean;
  emailVerified: boolean;
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

/** როცა `verificationRequired` false-ია, ტოკენები უკვე პასუხშია. */
interface RegisterResult {
  destination: string;
  message: string;
  verificationRequired: boolean;
  user?: User;
  tokens?: AuthResult['tokens'];
}

/** სწორი პაროლი ტოკენს ავტომატურად აღარ ნიშნავს — შეიძლება კოდი მოითხოვოს. */
export interface LoginChallenge {
  twoFactorRequired: true;
  challengeId: string;
  maskedPhone: string;
}

interface AuthResult {
  user: User;
  tokens: Tokens;
}

interface AuthState {
  user: User | null;
  /** true სანამ SecureStore-იდან სესიის აღდგენა მიმდინარეობს */
  initializing: boolean;
  restore: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<LoginChallenge | null>;
  verifyLoginCode: (
    challengeId: string,
    code: string,
    rememberDevice: boolean,
  ) => Promise<void>;
  resendLoginCode: (challengeId: string) => Promise<{ message: string }>;
  register: (input: RegisterInput) => Promise<RegisterResult>;
  verifyOtp: (destination: string, code: string, purpose: OtpPurpose) => Promise<void>;
  resendOtp: (destination: string, purpose: OtpPurpose) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithApple: (input: AppleLoginInput) => Promise<void>;
  forgotPassword: (identifier: string) => Promise<{ destination: string }>;
  logout: () => Promise<void>;
}

export type OtpPurpose = 'PHONE_VERIFICATION' | 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' | 'LOGIN';

export interface AppleLoginInput {
  identityToken: string;
  /** Apple სახელს მხოლოდ პირველ ავტორიზაციაზე გვაძლევს */
  firstName?: string;
  lastName?: string;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  acceptedTerms: boolean;
}

export const useAuth = create<AuthState>((set) => {
  const applySession = async (result: AuthResult) => {
    await tokenStore.save(result.tokens.accessToken, result.tokens.refreshToken);
    set({ user: result.user });
  };

  return {
    user: null,
    initializing: true,

    async restore() {
      try {
        const token = await tokenStore.access();
        if (!token) return;
        set({ user: await api<User>('/auth/me') });
      } catch {
        await tokenStore.clear();
      } finally {
        set({ initializing: false });
      }
    },

    async login(identifier, password) {
      // ნაცნობი მოწყობილობა კოდს არ ითხოვს — ტოკენს ვურთავთ მოთხოვნას
      const deviceToken = await tokenStore.device();

      const result = await api<AuthResult | LoginChallenge>('/auth/login', {
        method: 'POST',
        auth: false,
        body: { identifier, password, deviceToken },
      });

      if ('twoFactorRequired' in result && result.twoFactorRequired) return result;

      await applySession(result as AuthResult);
      return null;
    },

    async verifyLoginCode(challengeId, code, rememberDevice) {
      const result = await api<AuthResult & { deviceToken?: string }>('/auth/login/verify', {
        method: 'POST',
        auth: false,
        body: { challengeId, code, rememberDevice },
      });

      if (result.deviceToken) await tokenStore.setDevice(result.deviceToken);
      await applySession(result);
    },

    resendLoginCode(challengeId) {
      return api<{ message: string }>('/auth/login/resend', {
        method: 'POST',
        auth: false,
        body: { challengeId },
      });
    },

    async register(input) {
      const result = await api<RegisterResult>('/auth/register', {
        method: 'POST',
        auth: false,
        body: input,
      });

      // SMS არხის გარეშე სერვერი ანგარიშს მაშინვე ხსნის — კოდის ეკრანი აღარ სჭირდება.
      if (result.tokens && result.user) {
        await applySession({ user: result.user, tokens: result.tokens });
      }
      return result;
    },

    async verifyOtp(destination, code, purpose) {
      const result = await api<AuthResult>('/auth/verify-otp', {
        method: 'POST',
        auth: false,
        body: { destination, code, purpose },
      });
      await applySession(result);
    },

    async resendOtp(destination, purpose) {
      await api('/auth/resend-otp', {
        method: 'POST',
        auth: false,
        body: { destination, purpose },
      });
    },

    async loginWithGoogle(idToken) {
      const result = await api<AuthResult>('/auth/google', {
        method: 'POST',
        auth: false,
        body: { idToken },
      });
      await applySession(result);
    },

    async loginWithApple(input) {
      const result = await api<AuthResult>('/auth/apple', {
        method: 'POST',
        auth: false,
        body: input,
      });
      await applySession(result);
    },

    forgotPassword(identifier) {
      return api<{ destination: string }>('/auth/forgot-password', {
        method: 'POST',
        auth: false,
        body: { identifier },
      });
    },

    async logout() {
      // სერვერზე სესიის გაუქმება სასურველია, მაგრამ ლოკალურ გასვლას არ უნდა შეაფერხოს
      await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
      await tokenStore.clear();
      set({ user: null });
    },
  };
});
