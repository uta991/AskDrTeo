import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import {
  ChannelProfileType,
  ClientRoleType,
  RtcSurfaceView,
  createAgoraRtcEngine,
  type IRtcEngine,
} from 'react-native-agora';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui/Icon';
import { colors, radius, spacing, typography } from '@/theme';
import { useAuth } from '@/features/auth/auth.store';
import { pickChatFile, uploadChatFile } from '@/features/media/upload';
import {
  sendVisitMessage,
  useVideoVisits,
  visitMessages,
  visitPresence,
  type CallAccess,
  type VisitMessage,
} from '@/features/video-visits/video-visits.store';

/** ჩატი და ყოფნის ნიშანი — ზარის დროს ხშირი განახლება არ სჭირდება. */
const CHAT_POLL_MS = 3000;
const PRESENCE_POLL_MS = 5000;

/**
 * ვიზიტის ზარი.
 *
 * ინტერფეისი მთლიანად ჩვენია — მშობელი ვერსად ხედავს, რომ ქვეშ Agora
 * მუშაობს. ექიმის გამოსახულება მთელ ეკრანზეა, საკუთარი — კუთხეში.
 */
export default function VideoCallScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const me = useAuth((state) => state.user);
  const join = useVideoVisits((state) => state.join);

  const [access, setAccess] = useState<CallAccess | null>(null);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doctorIn, setDoctorIn] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<VisitMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const engineRef = useRef<IRtcEngine | null>(null);
  const feedRef = useRef<ScrollView>(null);

  // ─── ზარის დაწყება ───────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    let alive = true;

    const start = async () => {
      const granted = await join(id);
      if (!alive || !granted) {
        if (alive) setError('ჩართვა ვერ მოხერხდა');
        return;
      }

      setAccess(granted);

      try {
        const engine = createAgoraRtcEngine();
        engineRef.current = engine;

        engine.initialize({ appId: granted.appId });
        engine.registerEventHandler({
          onUserJoined: (_connection, uid) => setRemoteUid(uid),
          onUserOffline: () => setRemoteUid(null),
          onError: () => setError('ზარში პრობლემაა — შეამოწმეთ ინტერნეტი'),
        });

        engine.enableVideo();
        engine.startPreview();

        engine.joinChannel(granted.token, granted.channel, granted.uid, {
          channelProfile: ChannelProfileType.ChannelProfileCommunication,
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
          publishMicrophoneTrack: true,
          publishCameraTrack: true,
          autoSubscribeAudio: true,
          autoSubscribeVideo: true,
        });
      } catch {
        if (alive) setError('კამერასა და მიკროფონზე წვდომა ვერ მივიღეთ');
      }
    };

    void start();

    return () => {
      alive = false;
      const engine = engineRef.current;
      if (!engine) return;

      engine.leaveChannel();
      engine.unregisterEventHandler({});
      engine.release();
      engineRef.current = null;
    };
  }, [id, join]);

  // ─── ჩატი ────────────────────────────────────────────────────────
  const loadChat = useCallback(async () => {
    if (!id) return;
    const thread = await visitMessages(id).catch(() => null);
    if (thread) setMessages(thread.messages);
  }, [id]);

  useEffect(() => {
    if (!access) return;

    void loadChat();
    const timer = setInterval(() => void loadChat(), CHAT_POLL_MS);
    return () => clearInterval(timer);
  }, [access, loadChat]);

  // ─── ყოფნის ნიშანი ───────────────────────────────────────────────
  useEffect(() => {
    if (!id || !access) return;

    const ping = async () => {
      const presence = await visitPresence(id).catch(() => null);
      if (presence) setDoctorIn(presence.staffPresent);
    };

    void ping();
    const timer = setInterval(() => void ping(), PRESENCE_POLL_MS);
    return () => clearInterval(timer);
  }, [id, access]);

  const toggleMic = () => {
    engineRef.current?.muteLocalAudioStream(micOn);
    setMicOn(!micOn);
  };

  const toggleCam = () => {
    engineRef.current?.muteLocalVideoStream(camOn);
    setCamOn(!camOn);
  };

  const send = async (body: string, assetIds: string[] = []) => {
    if (!id || (!body.trim() && !assetIds.length)) return;

    setSending(true);
    try {
      await sendVisitMessage(id, body, assetIds);
      setDraft('');
      await loadChat();
    } catch {
      setError('შეტყობინება ვერ გაიგზავნა');
    } finally {
      setSending(false);
    }
  };

  const attach = async () => {
    const file = await pickChatFile().catch(() => null);
    if (!file || !id) return;

    setSending(true);
    try {
      const assetId = await uploadChatFile(file);
      await send('', [assetId]);
    } catch {
      setError('ფაილი ვერ აიტვირთა');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.screen}>
      {/* ექიმის გამოსახულება — მთელ ეკრანზე */}
      {access && remoteUid !== null ? (
        <RtcSurfaceView style={styles.remote} canvas={{ uid: remoteUid }} />
      ) : (
        <View style={[styles.remote, styles.waiting]}>
          {!error && <ActivityIndicator color="#ffffff" />}
          <Text style={styles.waitingText}>
            {error ?? (doctorIn ? 'ექიმი ერთვება…' : 'ველოდებით ექიმს…')}
          </Text>
        </View>
      )}

      {/* საკუთარი გამოსახულება */}
      {!!access && camOn && (
        <View style={[styles.local, { top: insets.top + spacing.md }]}>
          <RtcSurfaceView style={styles.localVideo} canvas={{ uid: 0 }} />
        </View>
      )}

      <Pressable
        style={[styles.close, { top: insets.top + spacing.md }]}
        onPress={() => router.back()}
      >
        <Icon name="chevron-left" size={22} color="#ffffff" strokeWidth={2} />
      </Pressable>

      {/* ─── ჩატი ─────────────────────────────────────────────── */}
      {chatOpen && (
        <KeyboardAvoidingView
          style={styles.chat}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.chatHead}>
            <Text style={styles.chatTitle}>ჩატი</Text>
            <Pressable onPress={() => setChatOpen(false)}>
              <Text style={styles.chatClose}>დახურვა</Text>
            </Pressable>
          </View>

          <ScrollView
            ref={feedRef}
            style={styles.feed}
            contentContainerStyle={styles.feedContent}
            onContentSizeChange={() => feedRef.current?.scrollToEnd({ animated: true })}
          >
            {!messages.length && (
              <Text style={styles.chatEmpty}>
                აქ შეგიძლიათ ტექსტისა და ფოტოს გაგზავნა საუბრის პარალელურად.
              </Text>
            )}

            {messages.map((message) => {
              const mine = message.senderId === me?.id;

              return (
                <View
                  key={message.id}
                  style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}
                >
                  {!!message.body && <Text style={styles.bubbleText}>{message.body}</Text>}

                  {message.attachments.map((attachment) =>
                    attachment.url ? (
                      <Image
                        key={attachment.id}
                        source={{ uri: attachment.url }}
                        style={styles.bubbleImage}
                      />
                    ) : (
                      <Text key={attachment.id} style={styles.bubbleMeta}>
                        ფაილი მუშავდება…
                      </Text>
                    ),
                  )}
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.composer}>
            <Pressable style={styles.attach} disabled={sending} onPress={() => void attach()}>
              <Text style={styles.attachIcon}>📎</Text>
            </Pressable>

            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="შეტყობინება"
              placeholderTextColor={colors.textSecondary}
              maxLength={4000}
            />

            <Pressable
              style={styles.send}
              disabled={sending || !draft.trim()}
              onPress={() => void send(draft)}
            >
              <Icon name="arrow-right" size={18} color="#ffffff" strokeWidth={2} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* ─── მართვა ───────────────────────────────────────────── */}
      {!chatOpen && (
        <View style={[styles.controls, { paddingBottom: insets.bottom + spacing.md }]}>
          <Pressable
            style={[styles.control, !micOn && styles.controlOff]}
            onPress={toggleMic}
          >
            <Text style={styles.controlIcon}>{micOn ? '🎙' : '🔇'}</Text>
          </Pressable>

          <Pressable
            style={[styles.control, !camOn && styles.controlOff]}
            onPress={toggleCam}
          >
            <Text style={styles.controlIcon}>{camOn ? '📹' : '🚫'}</Text>
          </Pressable>

          <Pressable style={styles.control} onPress={() => setChatOpen(true)}>
            <Icon name="chat" size={22} color="#ffffff" strokeWidth={1.9} />
            {messages.length > 0 && <View style={styles.chatDot} />}
          </Pressable>

          <Pressable style={[styles.control, styles.hangUp]} onPress={() => router.back()}>
            <Text style={styles.controlIcon}>✕</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#101014' },
  remote: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  waiting: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  waitingText: {
    ...typography.small,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },

  local: {
    position: 'absolute',
    right: spacing.md,
    width: 104,
    height: 148,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#1c1c22',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  localVideo: { flex: 1 },

  close: {
    position: 'absolute',
    left: spacing.md,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },

  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  control: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  controlOff: { backgroundColor: 'rgba(255,255,255,0.34)' },
  controlIcon: { fontSize: 21 },
  hangUp: { backgroundColor: '#E5484D' },
  chatDot: {
    position: 'absolute',
    top: 12,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#45D67F',
  },

  chat: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '62%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: spacing.md,
  },
  chatHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chatTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  chatClose: { ...typography.small, color: colors.skyBlueDeep, fontWeight: '600' },

  feed: { flexGrow: 0 },
  feedContent: { padding: spacing.md, gap: spacing.xs },
  chatEmpty: { ...typography.small, color: colors.textSecondary, lineHeight: 19 },

  bubble: { maxWidth: '85%', borderRadius: radius.lg, padding: spacing.sm, gap: 4 },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: colors.skyBlueSoft },
  bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: colors.surfaceMuted },
  bubbleText: { ...typography.small, color: colors.textPrimary, lineHeight: 19 },
  bubbleMeta: { ...typography.small, fontSize: 11, color: colors.textSecondary },
  bubbleImage: { width: 190, height: 190, borderRadius: radius.md },

  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  attach: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  attachIcon: { fontSize: 16 },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    ...typography.small,
    color: colors.textPrimary,
  },
  send: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.skyBlueDeep,
  },
});
