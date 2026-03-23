import { useCallback, useRef, useState } from "react";
import type { Message } from "../types";

type UseVoicePlaybackOptions = {
  showToast: (msg: string) => void;
};

export function useVoicePlayback({ showToast }: UseVoicePlaybackOptions) {
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [playbackTime, setPlaybackTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackTimerRef = useRef<number | null>(null);

  const togglePlayVoice = useCallback(
    (msg: Message) => {
      if (playingMessageId === msg.id) {
        audioRef.current?.pause();
        setPlayingMessageId(null);
        if (playbackTimerRef.current) {
          window.clearInterval(playbackTimerRef.current);
          playbackTimerRef.current = null;
        }
        return;
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (playbackTimerRef.current) {
        window.clearInterval(playbackTimerRef.current);
        playbackTimerRef.current = null;
      }

      if (!msg.voiceUrl) {
        setPlayingMessageId(msg.id);
        setPlaybackTime(0);
        const dur = msg.voiceDuration ?? 5;
        playbackTimerRef.current = window.setInterval(() => {
          setPlaybackTime((t) => {
            if (t + 1 >= dur) {
              window.clearInterval(playbackTimerRef.current!);
              playbackTimerRef.current = null;
              setPlayingMessageId(null);
              return 0;
            }
            return t + 1;
          });
        }, 1000);
        return;
      }

      const audio = new Audio(msg.voiceUrl);
      audioRef.current = audio;
      setPlayingMessageId(msg.id);
      setPlaybackTime(0);

      playbackTimerRef.current = window.setInterval(() => {
        setPlaybackTime((t) => t + 1);
      }, 1000);

      audio.onended = () => {
        setPlayingMessageId(null);
        setPlaybackTime(0);
        if (playbackTimerRef.current) {
          window.clearInterval(playbackTimerRef.current);
          playbackTimerRef.current = null;
        }
      };

      audio.play().catch(() => {
        setPlayingMessageId(null);
        showToast("Ошибка воспроизведения");
      });
    },
    [playingMessageId, showToast]
  );

  const cleanupPlayback = useCallback(() => {
    if (playbackTimerRef.current) window.clearInterval(playbackTimerRef.current);
    audioRef.current?.pause();
  }, []);

  return {
    playingMessageId,
    playbackTime,
    togglePlayVoice,
    cleanupPlayback,
  };
}
