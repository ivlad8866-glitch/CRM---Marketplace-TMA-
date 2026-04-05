import { useCallback, useRef, useState } from "react";
import type { Message } from "../types";
import { t } from "../lib/i18n";

type UseVoicePlaybackOptions = {
  showToast: (msg: string) => void;
  errorMessage?: string;
};

export function useVoicePlayback({ showToast, errorMessage }: UseVoicePlaybackOptions) {
  const errMsg = errorMessage ?? t("chat_playbackError");
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const simulationStartRef = useRef<number>(0);

  /** Stop the rAF-based progress loop */
  const stopProgressLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  /** Start smooth rAF progress tracking for real audio */
  const startRealProgressLoop = useCallback(() => {
    stopProgressLoop();

    const tick = () => {
      const audio = audioRef.current;
      if (!audio || audio.paused) return;

      const duration = audio.duration;
      if (duration && isFinite(duration) && duration > 0) {
        const progress = Math.min(audio.currentTime / duration, 1);
        setPlaybackProgress(progress);
        setPlaybackTime(Math.floor(audio.currentTime));
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [stopProgressLoop]);

  /** Start smooth simulated progress for demo voice messages (no voiceUrl) */
  const startSimulatedProgressLoop = useCallback(
    (duration: number, onComplete: () => void) => {
      stopProgressLoop();
      simulationStartRef.current = performance.now();

      const tick = () => {
        const elapsed = (performance.now() - simulationStartRef.current) / 1000;
        const progress = Math.min(elapsed / duration, 1);
        setPlaybackProgress(progress);
        setPlaybackTime(Math.floor(elapsed));

        if (progress >= 1) {
          onComplete();
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    },
    [stopProgressLoop]
  );

  const resetPlaybackState = useCallback(() => {
    setPlayingMessageId(null);
    setPlaybackTime(0);
    setPlaybackProgress(0);
    stopProgressLoop();
    if (playbackTimerRef.current) {
      window.clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
  }, [stopProgressLoop]);

  const togglePlayVoice = useCallback(
    (msg: Message) => {
      // Toggle off if already playing this message
      if (playingMessageId === msg.id) {
        audioRef.current?.pause();
        resetPlaybackState();
        return;
      }

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      stopProgressLoop();
      if (playbackTimerRef.current) {
        window.clearInterval(playbackTimerRef.current);
        playbackTimerRef.current = null;
      }

      // Demo mode: simulate playback when no voiceUrl exists
      if (!msg.voiceUrl) {
        setPlayingMessageId(msg.id);
        setPlaybackTime(0);
        setPlaybackProgress(0);
        const dur = msg.voiceDuration ?? 5;

        startSimulatedProgressLoop(dur, () => {
          resetPlaybackState();
        });
        return;
      }

      // Real audio playback
      const audio = new Audio(msg.voiceUrl);
      audioRef.current = audio;
      setPlayingMessageId(msg.id);
      setPlaybackTime(0);
      setPlaybackProgress(0);

      audio.onended = () => {
        resetPlaybackState();
      };

      audio.onerror = () => {
        showToast(errMsg);
        resetPlaybackState();
      };

      audio.oncanplaythrough = () => {
        // Audio is loaded and ready — start playback progress tracking
        startRealProgressLoop();
      };

      audio.play().catch(() => {
        showToast(errMsg);
        resetPlaybackState();
      });

      // Start progress loop immediately (oncanplaythrough may have already fired for cached audio)
      startRealProgressLoop();
    },
    [
      playingMessageId,
      showToast,
      resetPlaybackState,
      stopProgressLoop,
      startRealProgressLoop,
      startSimulatedProgressLoop,
    ]
  );

  const cleanupPlayback = useCallback(() => {
    if (playbackTimerRef.current) window.clearInterval(playbackTimerRef.current);
    stopProgressLoop();
    audioRef.current?.pause();
  }, [stopProgressLoop]);

  return {
    playingMessageId,
    playbackTime,
    playbackProgress,
    togglePlayVoice,
    cleanupPlayback,
  };
}
