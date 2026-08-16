import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * `react-native-webview` native მოდულია.
 *
 * თუ ტელეფონზე ბოლო აწყობამდელი ბინარია, import ჩავარდება და მთელი
 * ეკრანი დაიმსხვრეოდა. ამიტომ ჩატვირთვა დაცულია: მოდულის გარეშე
 * ვიდეო არ ჩანს, დანარჩენი კი მუშაობს.
 */
const webview: typeof import('react-native-webview') | null = (() => {
  try {
    return require('react-native-webview') as typeof import('react-native-webview');
  } catch {
    return null;
  }
})();

/**
 * სიახლის ვიდეო — თავისივე შეტყობინების ქვემოთ.
 *
 * Bunny-ს პირდაპირი HLS მისამართი 403-ს აბრუნებს (ბიბლიოთეკაზე
 * პირდაპირი წვდომა დახურულია), ამიტომ იმავე iframe-ს ვიყენებთ, რაც
 * საიტზეა — ასე ორივე პლატფორმა ერთსა და იმავე დამკვრელს კრავს.
 *
 * ავტომატურად არ ირთვება: ლენტში რამდენიმე ვიდეოა და გადაფურცვლისას
 * ხმა მოულოდნელად ჩაირთვებოდა.
 */
export function NewsVideo({ url, label }: { url: string; label: string }) {
  if (!webview) {
    return (
      <View style={styles.notice}>
        <Text style={styles.noticeText}>ვიდეოს სანახავად აპლიკაცია განაახლეთ</Text>
      </View>
    );
  }

  const { WebView } = webview;

  return (
    <View style={styles.wrapper}>
      <View style={styles.video}>
        <WebView
          source={{ uri: url }}
          style={styles.webview}
          allowsFullscreenVideo
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction
          // ლენტი ვერტიკალურად ისქროლება — WebView-მ ჟესტი არ უნდა წაართვას
          scrollEnabled={false}
          nestedScrollEnabled={false}
        />
      </View>

      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: spacing.sm },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  webview: { flex: 1, backgroundColor: '#000' },
  label: { ...typography.small, color: colors.textMuted, marginTop: 4 },
  notice: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  noticeText: { ...typography.small, color: colors.primaryDeep, fontWeight: '600' },
});
