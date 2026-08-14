import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/auth.store';
import { useLanguage } from '@/i18n';

export default function RootLayout() {
  const restore = useAuth((s) => s.restore);
  const restoreLanguage = useLanguage((s) => s.restore);

  useEffect(() => {
    void restore();
    void restoreLanguage();
  }, [restore, restoreLanguage]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F7FBFF' },
          animation: 'slide_from_right',
        }}
      />
    </SafeAreaProvider>
  );
}
