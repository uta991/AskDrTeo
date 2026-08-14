import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkyBackground } from '@/components/SkyBackground';
import { AuthCard } from '@/components/AuthCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { colors, radius, spacing, typography } from '@/theme';
import { useT } from '@/i18n';
import { useAuth } from '@/features/auth/auth.store';
import { useAdmin } from '@/features/admin/admin.store';
import { pickVideo, uploadVideo, type PickedVideo } from '@/features/media/upload';

export function AdminNewsTab() {
  const insets = useSafeAreaInsets();
  const t = useT();

  const role = useAuth((s) => s.user?.role);
  const { news, loadNews, createNews } = useAdmin();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [video, setVideo] = useState<PickedVideo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ოპერატორს ვიდეოს მიმაგრება არ შეუძლია — ღილაკიც არ უნდა ჩანდეს
  const canAttachVideo = role === 'ADMIN' || role === 'SUPER_ADMIN';

  useEffect(() => {
    void loadNews().catch(() => undefined);
  }, [loadNews]);

  const handlePublish = async () => {
    setError(null);
    if (!title.trim() || !body.trim()) return;

    setBusy(true);
    try {
      // ვიდეო ჯერ იტვირთება — ჩავარდნისას პოსტი არ უნდა შეიქმნას
      const videoId = video ? await uploadVideo(video, title.trim()) : undefined;

      await createNews({ title: title.trim(), body: body.trim(), videoId, publishNow: true });
      setTitle('');
      setBody('');
      setVideo(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common', 'error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SkyBackground showDoves={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + spacing.md, paddingBottom: spacing.xl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>{t('admin', 'news')}</Text>

          <AuthCard style={styles.form}>
            <Input
              placeholder={t('admin', 'newsTitle')}
              value={title}
              onChangeText={setTitle}
              maxLength={150}
            />

            <TextInput
              placeholder={t('admin', 'newsBody')}
              placeholderTextColor={colors.textMuted}
              value={body}
              onChangeText={setBody}
              multiline
              maxLength={5000}
              style={styles.textarea}
            />

            {canAttachVideo && (
              <Pressable
                style={[styles.videoButton, !!video && styles.videoButtonFilled]}
                onPress={async () => {
                  setError(null);
                  try {
                    const picked = await pickVideo();
                    if (picked) setVideo(picked);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : t('common', 'error'));
                  }
                }}
              >
                <Icon
                  name={video ? 'check' : 'chevron-right'}
                  size={16}
                  color={video ? colors.success : colors.primaryDeep}
                  strokeWidth={2.4}
                />
                <Text style={styles.videoButtonText}>
                  {video ? t('admin', 'videoAttached') : t('admin', 'attachVideo')}
                </Text>
              </Pressable>
            )}

            {!!error && <Text style={styles.error}>{error}</Text>}

            <Button
              title={t('admin', 'publishNow')}
              onPress={handlePublish}
              loading={busy}
              disabled={!title.trim() || !body.trim()}
              style={styles.submit}
            />
          </AuthCard>

          {news.map((post) => (
            <AuthCard key={post.id} style={styles.postCard}>
              <View style={styles.postHeader}>
                <Text style={styles.postTitle}>{post.title}</Text>
                <View
                  style={[
                    styles.statusPill,
                    post.status === 'PUBLISHED' && styles.statusPublished,
                  ]}
                >
                  <Text style={styles.statusText}>
                    {post.status === 'PUBLISHED' ? t('admin', 'published') : t('admin', 'draft')}
                  </Text>
                </View>
              </View>

              <Text style={styles.postBody} numberOfLines={3}>
                {post.body}
              </Text>

              <View style={styles.postMeta}>
                {post.notifiedCount > 0 && (
                  <Text style={styles.metaText}>
                    {t('admin', 'sentTo', { count: post.notifiedCount })}
                  </Text>
                )}
                {!!post.video && (
                  <View style={styles.videoTag}>
                    <Icon name="chevron-right" size={11} color={colors.primaryDeep} />
                    <Text style={styles.videoTagText}>{post.video.title}</Text>
                  </View>
                )}
              </View>
            </AuthCard>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: spacing.xl },
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.md },
  form: { marginBottom: spacing.lg },
  textarea: {
    minHeight: 110,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.lg,
    textAlignVertical: 'top',
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  videoButtonFilled: { borderStyle: 'solid', borderColor: colors.success },
  videoButtonText: { ...typography.caption, color: colors.textSecondary },
  error: { ...typography.small, color: colors.danger, marginBottom: spacing.sm },
  submit: { marginTop: spacing.xs },
  postCard: { marginBottom: spacing.sm },
  postHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  postTitle: { ...typography.bodyMedium, color: colors.textPrimary, flex: 1 },
  statusPill: {
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  statusPublished: { backgroundColor: colors.success },
  statusText: { ...typography.small, fontSize: 10, color: colors.surface, fontWeight: '700' },
  postBody: { ...typography.small, color: colors.textSecondary, marginTop: spacing.xs },
  postMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  metaText: { ...typography.small, color: colors.textMuted },
  videoTag: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  videoTagText: { ...typography.small, color: colors.primaryDeep },
});
