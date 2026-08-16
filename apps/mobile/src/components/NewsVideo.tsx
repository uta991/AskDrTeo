import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * სიახლის ვიდეო.
 *
 * ცალკე ეკრანზე არ გადადის — დამკვრელი თავისივე შეტყობინების ქვემოთ
 * დგას, რომ ნათელი იყოს, რომელ სიახლეს ეკუთვნის. ავტომატურად არ
 * ირთვება: ლენტის გადაფურცვლისას ხმა მოულოდნელად ჩაირთვებოდა.
 */
export function NewsVideo({ url, label }: { url: string; label: string }) {
  const player = useVideoPlayer(url, (instance) => {
    instance.loop = false;
  });

  return (
    <View style={styles.wrapper}>
      <VideoView
        player={player}
        style={styles.video}
        nativeControls
        fullscreenOptions={{ enable: true }}
        allowsPictureInPicture
        contentFit="contain"
      />
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
    backgroundColor: '#000',
  },
  label: { ...typography.small, color: colors.textMuted, marginTop: 4 },
});
