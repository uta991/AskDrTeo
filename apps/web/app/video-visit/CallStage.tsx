'use client';

import { useEffect, useRef, useState } from 'react';
import type {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';
import { renewCallToken } from './actions';
import styles from './visit.module.css';

/**
 * ზარის ეკრანი.
 *
 * ინტერფეისი ჩვენია — Agora მხოლოდ არხს იძლევა და მისი სახელი
 * მშობელს არსად უჩანს. SDK ბრაუზერშივე იტვირთება (dynamic import),
 * რადგან ის `window`-ს ეყრდნობა და სერვერზე ჩავარდებოდა.
 */
export function CallStage({
  visitId,
  admin,
  appId,
  channel,
  token,
  uid,
  onLeave,
}: {
  visitId: string;
  admin: boolean;
  appId: string;
  channel: string;
  token: string;
  uid: number;
  onLeave: () => void;
}) {
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [remoteIn, setRemoteIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const localRef = useRef<HTMLDivElement>(null);
  const remoteRef = useRef<HTMLDivElement>(null);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const micRef = useRef<IMicrophoneAudioTrack | null>(null);
  const camRef = useRef<ICameraVideoTrack | null>(null);

  useEffect(() => {
    let alive = true;

    const start = async () => {
      const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
      if (!alive) return;

      // ბრაუზერის შიდა ლოგები კონსოლს ავსებს — მხოლოდ შეცდომები დაგვრჩეს
      AgoraRTC.setLogLevel(3);

      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      clientRef.current = client;

      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType);

        if (mediaType === 'video' && remoteRef.current) {
          user.videoTrack?.play(remoteRef.current);
          setRemoteIn(true);
        }
        if (mediaType === 'audio') user.audioTrack?.play();
      });

      client.on('user-unpublished', (_user, mediaType) => {
        if (mediaType === 'video') setRemoteIn(false);
      });

      client.on('user-left', () => setRemoteIn(false));

      // ტოკენს ვადა გრძელი ზარისას შეიძლება ამოეწუროს — ბანკის მსგავსად
      // აქაც ვადის ამოწურვამდე ვახლებთ, რომ საუბარი არ გაწყდეს
      client.on('token-privilege-will-expire', async () => {
        const renewed = await renewCallToken(visitId, admin);
        if (renewed?.token) await client.renewToken(renewed.token);
      });

      try {
        await client.join(appId, channel, token, uid);

        const [mic, cam] = await AgoraRTC.createMicrophoneAndCameraTracks();
        if (!alive) {
          mic.close();
          cam.close();
          return;
        }

        micRef.current = mic;
        camRef.current = cam;

        if (localRef.current) cam.play(localRef.current);
        await client.publish([mic, cam]);

        setReady(true);
      } catch (cause) {
        // კამერაზე უარი ყველაზე ხშირი მიზეზია — ეს ცალკე უნდა ითქვას
        const message =
          cause instanceof Error && /permission|NotAllowed/i.test(cause.message)
            ? 'კამერასა და მიკროფონზე წვდომა არ დაიშვა — ნება დართეთ ბრაუზერში'
            : 'ზარის დაწყება ვერ მოხერხდა';

        if (alive) setError(message);
      }
    };

    void start();

    return () => {
      alive = false;
      micRef.current?.close();
      camRef.current?.close();
      void clientRef.current?.leave();
    };
  }, [appId, channel, token, uid, visitId, admin]);

  const toggleMic = async () => {
    if (!micRef.current) return;
    await micRef.current.setEnabled(!micOn);
    setMicOn(!micOn);
  };

  const toggleCam = async () => {
    if (!camRef.current) return;
    await camRef.current.setEnabled(!camOn);
    setCamOn(!camOn);
  };

  const leave = async () => {
    micRef.current?.close();
    camRef.current?.close();
    await clientRef.current?.leave();
    onLeave();
  };

  return (
    <div className={styles.stage}>
      <div ref={remoteRef} className={styles.remote} />

      {!remoteIn && (
        <p className={styles.stageNote}>
          {error ?? (ready ? 'ველოდებით მეორე მხარეს…' : 'კამერა ირთვება…')}
        </p>
      )}

      <div ref={localRef} className={styles.local} />

      <div className={styles.controls}>
        <button
          type="button"
          onClick={() => void toggleMic()}
          className={`${styles.control} ${micOn ? '' : styles.controlOff}`}
          aria-label={micOn ? 'მიკროფონის გამორთვა' : 'მიკროფონის ჩართვა'}
        >
          {micOn ? '🎙' : '🔇'}
        </button>

        <button
          type="button"
          onClick={() => void toggleCam()}
          className={`${styles.control} ${camOn ? '' : styles.controlOff}`}
          aria-label={camOn ? 'კამერის გამორთვა' : 'კამერის ჩართვა'}
        >
          {camOn ? '📹' : '🚫'}
        </button>

        <button
          type="button"
          onClick={() => void leave()}
          className={`${styles.control} ${styles.controlEnd}`}
          aria-label="ზარის დასრულება"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
