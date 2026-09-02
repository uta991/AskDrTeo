import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SkyBackground } from '@/components/SkyBackground';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AuthCard } from '@/components/AuthCard';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { goBack } from '@/navigation/goBack';
import { colors, radius, spacing, typography } from '@/theme';
import { useAuth } from '@/features/auth/auth.store';
import { useEntitlements } from '@/features/entitlements/entitlements.store';
import { useChat, type ChatMessage } from '@/features/chat/chat.store';
import { pickChatFile, uploadChatFile } from '@/features/media/upload';

/**
 * ხშირად დასმული კითხვები.
 *
 * ცარიელი ველი მშობელს აჩერებს — არ იცის, რა ჰკითხოს და როგორ
 * ჩამოაყალიბოს. მზა კითხვა ტექსტში ჩაჯდება, რომ შეასწოროს.
 */
const SUGGESTIONS = [
  'ცხელება აქვს — როდის მივმართო ექიმს?',
  'გამონაყარი გამოუჩნდა, ფოტოს გამოგიგზავნით',
  'რამდენი უნდა ეძინოს ამ ასაკში?',
  'კვებაზე უარს ამბობს — რა ვქნა?',
  'აცრის შემდეგ ცხელება აქვს, ნორმალურია?',
  'რა დოზით მივცე წამალი?',
];

const STAFF_ROLES = ['OPERATOR', 'ADMIN', 'SUPER_ADMIN'];

/** ახალი შეტყობინებების მოტანის რიტმი — ღია ეკრანზე. */
const POLL_MS = 12_000;

function fromStaff(message: ChatMessage): boolean {
  return !!message.sender && STAFF_ROLES.includes(message.sender.role);
}

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen() {
  const role = useAuth((state) => state.user?.role);
  const isStaff = !!role && role !== 'PARENT';
  const allowed = useEntitlements((state) => state.can('chat_with_operator')) || isStaff;

  const { conversations, thread, loading, sending, error, loadConversations, openThread, start, send } =
    useChat();

  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<{ id: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    if (allowed) void loadConversations().catch(() => undefined);
  }, [allowed, loadConversations]);

  // ღია ძაფი თავად ახლდება — ოპერატორის პასუხს ლოდინი არ სჭირდება
  useEffect(() => {
    if (!thread?.id) return;

    const timer = setInterval(() => {
      void openThread(thread.id).catch(() => undefined);
    }, POLL_MS);

    return () => clearInterval(timer);
  }, [thread?.id, openThread]);

  if (!allowed) {
    return (
      <SkyBackground showDoves={false}>
        <ScreenHeader title="ჩატი კონსულტანტთან" onBack={goBack} />

        <View style={styles.locked}>
          <View style={styles.lockIcon}>
            <Icon name="lock" size={22} color={colors.primaryDeep} strokeWidth={2} />
          </View>

          <Text style={styles.lockedTitle}>ეს ფუნქცია ფასიან პაკეტშია</Text>
          <Text style={styles.lockedText}>
            შეკითხვას სამუშაო საათებში ცოცხალი კონსულტანტი პასუხობს.
          </Text>

          <Button title="პაკეტების ნახვა" onPress={() => router.push('/plans')} />
        </View>
      </SkyBackground>
    );
  }

  const attach = async () => {
    setLocalError(null);
    try {
      const file = await pickChatFile();
      if (!file) return;

      setUploading(true);
      const id = await uploadChatFile(file);
      setAttachments((prev) => [...prev, { id, name: file.fileName }]);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'ატვირთვა ვერ მოხერხდა');
    } finally {
      setUploading(false);
    }
  };

  const submit = () => {
    const text = input;
    const ids = attachments.map((item) => item.id);

    setInput('');
    setAttachments([]);
    void send(text, ids);
  };

  const closed = thread?.status === 'CLOSED';
  const history = conversations.filter((row) => row.id !== thread?.id);

  return (
    <SkyBackground showDoves={false}>
      <ScreenHeader title="ჩატი კონსულტანტთან" onBack={goBack} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        >
          {loading && !thread && <ActivityIndicator color={colors.primary} />}

          {/* ცარიელ ჩატში ჯერ ღილაკია — ცარიელი ველი მშობელს აბნევს */}
          {!thread && !loading && (
            <AuthCard style={styles.startCard}>
              <Text style={styles.startText}>
                შეკითხვა გაქვთ ბავშვის ჯანმრთელობაზე? კონსულტანტი სამუშაო საათებში
                გიპასუხებთ.
              </Text>

              <Button title="ჩატის დაწყება" onPress={() => void start()} loading={sending} />

              <View style={styles.suggestions}>
                {SUGGESTIONS.map((suggestion) => (
                  <Pressable
                    key={suggestion}
                    style={styles.suggestion}
                    onPress={() => setInput(suggestion)}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </Pressable>
                ))}
              </View>
            </AuthCard>
          )}

          {thread?.messages.map((message) => {
            if (message.type === 'SYSTEM') {
              return (
                <Text key={message.id} style={styles.system}>
                  {message.body}
                </Text>
              );
            }

            const mine = !fromStaff(message);

            return (
              <View key={message.id} style={mine ? styles.bubbleMine : styles.bubbleTheirs}>
                {!mine && !!message.sender && (
                  <Text style={styles.author}>{message.sender.firstName}</Text>
                )}

                {!!message.body && <Text style={styles.body}>{message.body}</Text>}

                {message.attachments?.map((file) =>
                  file.url && file.type === 'IMAGE' ? (
                    <Image key={file.id} source={{ uri: file.url }} style={styles.photo} />
                  ) : (
                    <Text key={file.id} style={styles.filePending}>
                      {file.type === 'VIDEO'
                        ? file.processing
                          ? 'ვიდეო მუშავდება…'
                          : 'ვიდეო — გახსენით საიტზე'
                        : 'ფაილი'}
                    </Text>
                  ),
                )}

                <Text style={styles.time}>{time(message.createdAt)}</Text>
              </View>
            );
          })}

          {(!!error || !!localError) && <Text style={styles.error}>{error ?? localError}</Text>}

          {closed && (
            <Text style={styles.closedNote}>
              საუბარი დახურულია. ახალი შეკითხვა ქვემოთ დაწერეთ — ცალკე საუბრად შეინახება.
            </Text>
          )}

          {history.length > 0 && (
            <View style={styles.history}>
              <Text style={styles.historyTitle}>წინა საუბრები</Text>

              {history.map((row) => (
                <Pressable
                  key={row.id}
                  style={styles.historyRow}
                  onPress={() => void openThread(row.id)}
                >
                  <View style={styles.historyMain}>
                    <Text style={styles.historyDate}>
                      {(row.closedAt ?? row.lastMessageAt ?? row.createdAt).slice(0, 10)}
                    </Text>
                    <Text style={styles.historyPreview} numberOfLines={1}>
                      {row.lastMessage ?? row.subject}
                    </Text>
                  </View>

                  {row.operators.length > 0 && (
                    <Text style={styles.historyMeta}>{row.operators[0]}</Text>
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

        {attachments.length > 0 && (
          <View style={styles.pendingRow}>
            {attachments.map((file) => (
              <Pressable
                key={file.id}
                style={styles.pendingFile}
                onPress={() => setAttachments((prev) => prev.filter((f) => f.id !== file.id))}
              >
                <Text style={styles.pendingName} numberOfLines={1}>
                  {file.name}
                </Text>
                <Text style={styles.pendingRemove}>×</Text>
              </Pressable>
            ))}
          </View>
        )}

        {(!closed || true) && (
          <View style={styles.composer}>
            {/* ფოტო ან ვიდეო — გალერეიდან ან ადგილზე გადაღებული */}
            <Pressable style={styles.attach} onPress={() => void attach()} disabled={uploading}>
              {uploading ? (
                <ActivityIndicator color={colors.primaryDeep} size="small" />
              ) : (
                <Text style={styles.attachIcon}>+</Text>
              )}
            </Pressable>

            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="დაწერეთ შეკითხვა…"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              multiline
              maxLength={4000}
            />

            <Pressable
              style={[
                styles.sendButton,
                (sending || (!input.trim() && !attachments.length)) && styles.sendButtonOff,
              ]}
              disabled={sending || (!input.trim() && !attachments.length)}
              onPress={submit}
            >
              <Icon name="chevron-right" size={20} color={colors.textOnPrimary} strokeWidth={2.4} />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.sm },

  locked: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, gap: spacing.sm },
  lockIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedTitle: { ...typography.h2, color: colors.textPrimary },
  lockedText: { ...typography.small, color: colors.textSecondary, lineHeight: 19 },

  suggestions: { gap: spacing.xs, marginTop: spacing.sm },
  suggestion: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 9,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  suggestionText: { ...typography.small, fontSize: 13, color: colors.textPrimary },

  startCard: { gap: spacing.md, alignItems: 'center' },
  startText: {
    ...typography.small,
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
  },

  bubbleMine: {
    alignSelf: 'flex-end',
    maxWidth: '86%',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  bubbleTheirs: {
    alignSelf: 'flex-start',
    maxWidth: '88%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  author: { ...typography.small, fontSize: 11, fontWeight: '700', color: colors.primaryText },
  body: { ...typography.small, color: colors.textPrimary, lineHeight: 20 },
  photo: { width: 200, height: 200, borderRadius: radius.md, marginTop: spacing.xs },
  filePending: { ...typography.small, fontSize: 11, color: colors.textSecondary },
  time: { ...typography.small, fontSize: 10, color: colors.textSecondary, alignSelf: 'flex-end' },
  system: {
    ...typography.small,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    alignSelf: 'center',
  },
  error: { ...typography.small, color: colors.danger },
  closedNote: { ...typography.small, color: colors.textSecondary, textAlign: 'center' },

  history: { marginTop: spacing.lg, gap: spacing.xs },
  historyTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  historyMain: { flex: 1, minWidth: 0 },
  historyDate: { ...typography.small, fontSize: 11, color: colors.textSecondary },
  historyPreview: { ...typography.small, color: colors.textPrimary },
  historyMeta: { ...typography.small, fontSize: 11, color: colors.primaryText },

  pendingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xs,
  },
  pendingFile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 180,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  pendingName: { ...typography.small, fontSize: 11, color: colors.textPrimary, flexShrink: 1 },
  pendingRemove: { color: colors.danger, fontSize: 14, lineHeight: 14 },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  attach: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  attachIcon: { fontSize: 22, color: colors.primaryDeep, lineHeight: 24 },
  input: {
    flex: 1,
    maxHeight: 110,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.small,
    color: colors.textPrimary,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  sendButtonOff: { backgroundColor: colors.surfaceMuted },
});
