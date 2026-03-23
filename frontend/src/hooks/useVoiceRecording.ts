import { useCallback, useRef, useState } from "react";
import type { Message } from "../types";
import { getTelegram } from "../lib/adapters";

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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingStartXRef = useRef(0);

  const stopRecordingCleanup = useCallback(() => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
    setRecordingTime(0);
    setIsCancelHinted(false);
  }, []);

  const startRecording = useCallback(async () => {
    if (typeof MediaRecorder === "undefined") {
      showToast("Браузер не поддерживает запись");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      audioChunksRef.current = [];

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

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch {
      showToast("Нет доступа к микрофону");
    }
  }, [showToast]);

  const stopRecordingAndSend = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    const duration = recordingTime;
    if (!recorder || recorder.state === "inactive") {
      stopRecordingCleanup();
      return;
    }

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      recordingStreamRef.current?.getTracks().forEach((t) => t.stop());
      recordingStreamRef.current = null;

      const blob = new Blob(audioChunksRef.current, {
        type: recorder.mimeType || "audio/webm",
      });
      const url = URL.createObjectURL(blob);
      const isAdmin = role === "admin";
      const msg: Message = {
        id: `m-${Date.now()}`,
        author: isAdmin ? "agent" : "customer",
        text: "",
        time: "сейчас",
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

  /* Cleanup on unmount */
  const cleanupRecording = useCallback(() => {
    if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
    recordingStreamRef.current?.getTracks().forEach((t) => t.stop());
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
  };
}
