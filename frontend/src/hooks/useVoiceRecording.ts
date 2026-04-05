import { useCallback, useEffect, useRef, useState } from "react";
import type { Message } from "../types";
import { getTelegram } from "../lib/adapters";
import { t } from "../lib/i18n";

type UseVoiceRecordingOptions = {
  role: "client" | "admin";
  showToast: (msg: string) => void;
  addMessage: (msg: Message) => void;
  scheduleAutoReply: (isAdmin: boolean) => void;
};

export function useVoiceRecording({
  role,
  showToast,
  addMessage,
  scheduleAutoReply,
}: UseVoiceRecordingOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isCancelHinted, setIsCancelHinted] = useState(false);
  const [waveformLevel, setWaveformLevel] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingStartXRef = useRef(0);

  // Web Audio API refs for waveform analysis
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const waveformIntervalRef = useRef<number | null>(null);

  // Track whether tab is visible for timer display
  const tabHiddenAtRef = useRef<number | null>(null);
  const pausedTimeRef = useRef(0);

  const stopWaveformPolling = useCallback(() => {
    if (waveformIntervalRef.current) {
      window.clearInterval(waveformIntervalRef.current);
      waveformIntervalRef.current = null;
    }
    setWaveformLevel(0);
  }, []);

  const stopRecordingCleanup = useCallback(() => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    stopWaveformPolling();

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
      analyserRef.current = null;
    }

    setIsRecording(false);
    setRecordingTime(0);
    setIsCancelHinted(false);
    setIsLocked(false);
    tabHiddenAtRef.current = null;
    pausedTimeRef.current = 0;
  }, [stopWaveformPolling]);

  const startRecording = useCallback(async () => {
    if (typeof MediaRecorder === "undefined") {
      showToast(t("toast_browserNoRecording"));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      audioChunksRef.current = [];

      // Set up Web Audio API analyser for waveform visualization
      try {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.7;
        source.connect(analyser);
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        // Poll analyser for amplitude data every 100ms
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        waveformIntervalRef.current = window.setInterval(() => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          // Compute average amplitude, normalize to 0-1
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length / 255;
          setWaveformLevel(avg);
        }, 100);
      } catch {
        // If Web Audio API fails, recording still works — just no waveform
      }

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
          ? "audio/ogg;codecs=opus"
          : "";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {};

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      setIsLocked(false);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (err: unknown) {
      // Provide specific error messages for common failure modes
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          showToast(t("toast_micPermissionDenied"));
        } else if (err.name === "NotFoundError") {
          showToast(t("toast_micNotFound"));
        } else if (err.name === "NotReadableError") {
          showToast(t("toast_micBusy"));
        } else {
          showToast(t("toast_noMicAccess"));
        }
      } else {
        showToast(t("toast_noMicAccess"));
      }
    }
  }, [showToast, stopWaveformPolling]);

  const lockRecording = useCallback(() => {
    if (isRecording) {
      setIsLocked(true);
      const tg = getTelegram();
      tg?.HapticFeedback?.impactOccurred("light");
    }
  }, [isRecording]);

  const stopRecordingAndSend = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    const duration = recordingTime;
    if (!recorder || recorder.state === "inactive") {
      stopRecordingCleanup();
      return;
    }

    // Request any remaining data before stopping
    if (recorder.state === "recording") {
      recorder.requestData();
    }

    recorder.onstop = () => {
      recordingStreamRef.current?.getTracks().forEach((t) => t.stop());
      recordingStreamRef.current = null;

      if (audioChunksRef.current.length === 0) {
        // No audio data collected — don't send empty message
        return;
      }

      const blob = new Blob(audioChunksRef.current, {
        type: recorder.mimeType || "audio/webm",
      });
      const url = URL.createObjectURL(blob);
      const isAdmin = role === "admin";
      const msg: Message = {
        id: `m-${Date.now()}`,
        author: isAdmin ? "agent" : "customer",
        text: "",
        time: t("toast_justNow"),
        type: "voice",
        voiceDuration: Math.max(duration, 1),
        voiceUrl: url,
      };
      addMessage(msg);
      const tg = getTelegram();
      tg?.HapticFeedback?.impactOccurred("light");
      scheduleAutoReply(isAdmin);
    };

    recorder.stop();
    mediaRecorderRef.current = null;
    stopRecordingCleanup();
  }, [recordingTime, role, stopRecordingCleanup, scheduleAutoReply, addMessage]);

  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    recordingStreamRef.current?.getTracks().forEach((t) => t.stop());
    recordingStreamRef.current = null;
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    stopRecordingCleanup();
  }, [stopRecordingCleanup]);

  /* Handle tab visibility changes: keep recording but note the hidden period */
  useEffect(() => {
    if (!isRecording) return;

    const handleVisibility = () => {
      if (document.hidden) {
        tabHiddenAtRef.current = Date.now();
      } else {
        tabHiddenAtRef.current = null;
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isRecording]);

  /* Cleanup on unmount */
  const cleanupRecording = useCallback(() => {
    if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
    if (waveformIntervalRef.current) window.clearInterval(waveformIntervalRef.current);
    recordingStreamRef.current?.getTracks().forEach((t) => t.stop());
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }
  }, []);

  return {
    isRecording,
    recordingTime,
    isCancelHinted,
    setIsCancelHinted,
    recordingStartXRef,
    startRecording,
    stopRecordingAndSend,
    cancelRecording,
    cleanupRecording,
    // New: waveform & lock
    waveformLevel,
    isLocked,
    lockRecording,
  };
}
