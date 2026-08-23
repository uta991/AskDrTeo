import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { WebView } from 'react-native-webview';
import { SkyBackground } from '@/components/SkyBackground';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AuthCard } from '@/components/AuthCard';
import { Icon } from '@/components/ui/Icon';
import { goBack } from '@/navigation/goBack';
import { colors, radius, spacing, typography } from '@/theme';
import { useVideos, type VideoCard } from '@/features/videos/videos.store';

/** წამები „12:34" ფორმატში. */
function duration(sec: number | null): string | null {
  if (!sec) return null;
  const minutes = Math.floor(sec / 60);
  return `${minutes}:${String(sec % 60).padStart(2, '0')}`;
}

export default function VideosScreen() {
  const { items, loading, error, load } = useVideos();
  const [playing, setPlaying] = useState<VideoCard | null>(null);

  useEffect(() => {
    void load().catch(() => undefined);
  }, [load]);

  if (playing?.embedUrl) {
    return (
      <SkyBackground showDoves={false}>
        <ScreenHeader title={playing.title} onBack={() => setPlaying(null)} />

        <View style={styles.player}>
          <WebView
            source={{ uri: playing.embedUrl }}
            style={styles.webview}
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
          />
        </View>

        {!!playing.description && (
          <ScrollView contentContainerStyle={styles.description}>
            <Text style={styles.descriptionText}>{playing.description}</Text>
          </ScrollView>
        )}
      </SkyBackground>
    );
  }

  const locked = items.filter((video) => !video.unlocked).length;

  return (
    <SkyBackground showDoves={false}>
      <ScreenHeader title="ვიდეო ბიბლიოთეკა" subtitle="დოქტორ თეოს რჩევები" onBack={goBack} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading && !items.length && <ActivityIndicator color={colors.primary} />}
        {!!error && <Text style={styles.error}>{error}</Text>}

        {!loading && !items.length && <Text style={styles.empty}>ბიბლიოთეკა ჯერ ცარიელია.</Text>}

        {items.map((video) => (
          <Pressable
            key={video.id}
            onPress={() => {
              // დახურული ვიდეო სიაში ჩანს — დაჭერაზე პაკეტებს ვთავაზობთ
              if (!video.unlocked) router.push('/plans');
              else if (!video.processing) setPlaying(video);
            }}
          >
            <AuthCard style={styles.card}>
              <View style={styles.thumb}>
                {video.thumbnailUrl ? (
                  <Image source={{ uri: video.thumbnailUrl }} style={styles.thumbImage} />
                ) : (
                  <Icon name="bulb" size={26} color={colors.primaryDeep} strokeWidth={1.8} />
                )}

                {!video.unlocked && (
                  <View style={styles.lockTag}>
                    <Icon name="lock" size={12} color={colors.surface} strokeWidth={2.4} />
                    <Text style={styles.lockText}>პაკეტში არ შედის</Text>
                  </View>
                )}

                {video.processing && <Text style={styles.processing}>მუშავდება</Text>}

                {!!duration(video.durationSec) && (
                  <Text style={styles.duration}>{duration(video.durationSec)}</Text>
                )}
              </View>

              <Text style={styles.title}>{video.title}</Text>
              {!!video.category && <Text style={styles.category}>{video.category.name}</Text>}
            </AuthCard>
          </Pressable>
        ))}

        {locked > 0 && (
          <Pressable onPress={() => router.push('/plans')}>
            <Text style={styles.upgrade}>{locked} ვიდეო ფასიან პაკეტშია — პაკეტების ნახვა</Text>
          </Pressable>
        )}
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.sm, paddingBottom: spacing.xl },
  card: { gap: spacing.xs, padding: spacing.sm },

  thumb: {
    height: 170,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: { width: '100%', height: '100%' },

  lockTag: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(26,26,26,0.82)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  lockText: { ...typography.small, fontSize: 10, color: colors.surface, fontWeight: '600' },
  processing: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: 'rgba(26,26,26,0.82)',
    color: colors.surface,
    fontSize: 10,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  duration: {
    position: 'absolute',
    right: spacing.xs,
    bottom: spacing.xs,
    backgroundColor: 'rgba(26,26,26,0.82)',
    color: colors.surface,
    fontSize: 10,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },

  title: { ...typography.small, color: colors.textPrimary, fontWeight: '600' },
  category: { ...typography.small, fontSize: 11, color: colors.textSecondary },

  player: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000000' },
  webview: { flex: 1, backgroundColor: '#000000' },
  description: { padding: spacing.xl },
  descriptionText: { ...typography.small, color: colors.textSecondary, lineHeight: 20 },

  empty: { ...typography.small, color: colors.textSecondary, textAlign: 'center' },
  error: { ...typography.small, color: colors.danger },
  upgrade: {
    ...typography.small,
    fontSize: 12,
    color: colors.primaryText,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
