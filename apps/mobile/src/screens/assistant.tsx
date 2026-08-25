import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
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
import { useActiveChild } from '@/features/children/children.store';
import { useAi } from '@/features/ai/ai.store';

const SUGGESTIONS = [
  'რამდენი უნდა ეძინოს ჩემი ასაკის ბავშვს?',
  'როგორ დავიწყო დამატებითი კვება?',
  'ცხელება აქვს — როდის მივმართო ექიმს?',
];

export default function AssistantScreen() {
  const role = useAuth((state) => state.user?.role);
  const isStaff = !!role && role !== 'PARENT';
  const allowed = useEntitlements((state) => state.can('ai_assistant')) || isStaff;

  const activeChild = useActiveChild();
  const { messages, sending, error, ask, reset } = useAi();

  const [input, setInput] = React.useState('');
  const scroll = useRef<ScrollView>(null);

  useEffect(() => reset, [reset]);

  if (!allowed) {
    return (
      <SkyBackground showDoves={false}>
        <ScreenHeader title="AI ასისტენტი" onBack={goBack} />

        <View style={styles.locked}>
          <View style={styles.lockIcon}>
            <Icon name="lock" size={22} color={colors.primaryDeep} strokeWidth={2} />
          </View>

          <Text style={styles.lockedTitle}>ეს ფუნქცია პრემიუმ პაკეტშია</Text>
          <Text style={styles.lockedText}>
            ასისტენტი პედიატრიის დარგში დასმულ შეკითხვას წამებში პასუხობს —
            კვება, ძილი, აცრები, ასაკობრივი განვითარება.
          </Text>

          <Button title="პაკეტების ნახვა" onPress={() => router.push('/plans')} />
        </View>
      </SkyBackground>
    );
  }

  const send = (text: string) => {
    setInput('');
    void ask(text, activeChild?.id);
  };

  return (
    <SkyBackground showDoves={false}>
      <ScreenHeader title="AI ასისტენტი" subtitle="პედიატრიის დარგში" onBack={goBack} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scroll}
          contentContainerStyle={styles.thread}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && (
            <AuthCard style={styles.intro}>
              <Text style={styles.introText}>
                დასვით შეკითხვა ბავშვის ჯანმრთელობაზე, კვებაზე, ძილსა თუ განვითარებაზე.
              </Text>

              {SUGGESTIONS.map((suggestion) => (
                <Pressable
                  key={suggestion}
                  style={styles.suggestion}
                  onPress={() => send(suggestion)}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </Pressable>
              ))}
            </AuthCard>
          )}

          {messages.map((message, index) => (
            <View
              key={index}
              style={message.role === 'USER' ? styles.bubbleUser : styles.bubbleAssistant}
            >
              <Text style={styles.bubbleText}>{message.content}</Text>
            </View>
          ))}

          {sending && <ActivityIndicator style={styles.typing} color={colors.primary} />}
          {!!error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="დაწერეთ შეკითხვა…"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
            maxLength={2000}
          />

          <Pressable
            style={[styles.sendButton, (!input.trim() || sending) && styles.sendButtonOff]}
            disabled={!input.trim() || sending}
            onPress={() => send(input)}
          >
            <Icon name="chevron-right" size={20} color={colors.textOnPrimary} strokeWidth={2.4} />
          </Pressable>
        </View>

        <Text style={styles.disclaimer}>
          ასისტენტი დიაგნოზს არ სვამს და წამლის დოზას არ ასახელებს.
        </Text>
      </KeyboardAvoidingView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  locked: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, gap: spacing.sm },
  lockIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedTitle: { ...typography.h2, color: colors.textPrimary },
  lockedText: { ...typography.small, color: colors.textSecondary, lineHeight: 19 },

  thread: { padding: spacing.xl, gap: spacing.sm },
  intro: { gap: spacing.sm },
  introText: { ...typography.small, color: colors.textSecondary, lineHeight: 19 },
  suggestion: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  suggestionText: { ...typography.small, color: colors.textPrimary },

  bubbleUser: {
    alignSelf: 'flex-end',
    maxWidth: '86%',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleAssistant: {
    alignSelf: 'flex-start',
    maxWidth: '90%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleText: { ...typography.small, color: colors.textPrimary, lineHeight: 20 },
  typing: { alignSelf: 'flex-start', marginLeft: spacing.sm },
  error: { ...typography.small, color: colors.danger },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
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
  disclaimer: {
    ...typography.small,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
});
