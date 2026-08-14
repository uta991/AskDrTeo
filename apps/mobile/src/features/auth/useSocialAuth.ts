import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from './auth.store';

// OAuth-ის შემდეგ ბრაუზერის სესია უნდა დაიხუროს — Expo-ს მოთხოვნაა
WebBrowser.maybeCompleteAuthSession();

interface GoogleClientIds {
  ios?: string;
  android?: string;
  web?: string;
}

const googleIds = (Constants.expoConfig?.extra?.googleClientIds ?? {}) as GoogleClientIds;

/** Google-ის კონფიგურაცია ჯერ არ არის შევსებული → ღილაკს ვმალავთ. */
export const isGoogleConfigured = !!(googleIds.ios || googleIds.android || googleIds.web);

export type SocialProvider = 'google' | 'apple';

export function useSocialAuth() {
  const { loginWithGoogle, loginWithApple } = useAuth();

  const [pending, setPending] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  // Apple Sign-In მხოლოდ iOS 13+-ზეა; ხელმისაწვდომობა runtime-ზე მოწმდება
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    // Expo Go-ში false-ს აბრუნებს — entitlement მხოლოდ development build-ს აქვს
    void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  const [, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest({
    iosClientId: googleIds.ios,
    androidClientId: googleIds.android,
    webClientId: googleIds.web,
  });

  // Google პასუხს asynchronously აბრუნებს — შედეგს effect-ში ვიჭერთ
  useEffect(() => {
    if (!googleResponse) return;

    if (googleResponse.type === 'success') {
      const idToken = googleResponse.params.id_token;
      if (!idToken) {
        setError('Google-მა ტოკენი არ დააბრუნა');
        setPending(null);
        return;
      }
      loginWithGoogle(idToken)
        .catch((e: unknown) => setError(e instanceof Error ? e.message : 'შესვლა ვერ მოხერხდა'))
        .finally(() => setPending(null));
      return;
    }

    // dismiss / cancel — მომხმარებელმა თავად გააუქმა, შეცდომა არ არის
    setPending(null);
    if (googleResponse.type === 'error') {
      setError('Google-ით შესვლა ვერ მოხერხდა');
    }
  }, [googleResponse, loginWithGoogle]);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    if (!isGoogleConfigured) {
      setError('Google ავტორიზაცია ჯერ არ არის კონფიგურირებული');
      return;
    }
    setPending('google');
    await promptGoogle();
  }, [promptGoogle]);

  const signInWithApple = useCallback(async () => {
    setError(null);

    // Expo Go-ს Sign in with Apple-ის entitlement არ აქვს — ღილაკი ჩანს,
    // მაგრამ მიზეზი მომხმარებელს გასაგებად უნდა ეთქვას
    if (!appleAvailable) {
      setError('Apple-ით შესვლა development build-ზეა ხელმისაწვდომი');
      return;
    }

    setPending('apple');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        setError('Apple-მა ტოკენი არ დააბრუნა');
        return;
      }

      await loginWithApple({
        identityToken: credential.identityToken,
        // სახელი მხოლოდ პირველ ავტორიზაციაზე მოდის — შემდეგ null-ია
        firstName: credential.fullName?.givenName ?? undefined,
        lastName: credential.fullName?.familyName ?? undefined,
      });
    } catch (e) {
      // მომხმარებლის მიერ გაუქმება შეცდომად არ ჩაითვლება
      if (isCanceled(e)) return;
      setError(e instanceof Error ? e.message : 'Apple-ით შესვლა ვერ მოხერხდა');
    } finally {
      setPending(null);
    }
  }, [loginWithApple, appleAvailable]);

  return {
    appleAvailable,
    isGoogleConfigured,
    pending,
    error,
    clearError: () => setError(null),
    signInWithGoogle,
    signInWithApple,
  };
}

function isCanceled(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === 'ERR_REQUEST_CANCELED'
  );
}
