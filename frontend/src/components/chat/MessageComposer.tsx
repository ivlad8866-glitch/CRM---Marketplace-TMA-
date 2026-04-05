import { useRef } from "react";
import VoiceRecorder from "./VoiceRecorder";
import AttachmentSheet from "./AttachmentSheet";
import { useLocale } from "../../lib/i18n";

type MessageComposerProps = {
  composer: string;
  setComposer: (val: string) => void;
  isAdminChat: boolean;
  isRecording: boolean;
  recordingTime: number;
  isCancelHinted: boolean;
  attachMenuOpen: boolean;
  composerInputRef: React.RefObject<HTMLInputElement>;
  recordingStartXRef: React.MutableRefObject<number>;
  onSendMessage: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onStartRecording: () => void;
  onStopRecordingAndSend: () => void;
  onCancelRecording: () => void;
  onSetIsCancelHinted: (v: boolean) => void;
  onSetAttachMenuOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  onSendAttachment: (kind: "photo" | "file" | "location", meta?: { url?: string; name?: string; size?: string }) => void;
  onCameraClick: () => void;
  /* Voice recording enhancements */
  waveformLevel?: number;
  isLocked?: boolean;
  onLockRecording?: () => void;
};

/* ── SVG Icon Components ─────────────────────────────────────── */

function PaperclipIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

/* ── Component ───────────────────────────────────────────────── */

export default function MessageComposer({
  composer,
  setComposer,
  isAdminChat,
  isRecording,
  recordingTime,
  isCancelHinted,
  attachMenuOpen,
  composerInputRef,
  recordingStartXRef,
  onSendMessage,
  onKeyDown,
  onStartRecording,
  onStopRecordingAndSend,
  onCancelRecording,
  onSetIsCancelHinted,
  onSetAttachMenuOpen,
  onSendAttachment,
  onCameraClick,
  waveformLevel = 0,
  isLocked = false,
  onLockRecording,
}: MessageComposerProps) {
  const { t } = useLocale();
  /* Recording state */
  if (isRecording) {
    return (
      <VoiceRecorder
        recordingTime={recordingTime}
        waveformLevel={waveformLevel}
        isLocked={isLocked}
        isCancelHinted={isCancelHinted}
        onCancel={onCancelRecording}
        onSend={onStopRecordingAndSend}
        onLock={onLockRecording ?? (() => {})}
      />
    );
  }

  const hasText = composer.trim().length > 0;

  return (
    <>
      <AttachmentSheet
        open={attachMenuOpen}
        onClose={() => onSetAttachMenuOpen(false)}
        onSendAttachment={onSendAttachment}
        onCameraClick={onCameraClick}
      />
      <div className="composer">
        {/* Pill-shaped input field */}
        <div className="composer__field">
          <input
            ref={composerInputRef}
            value={composer}
            onChange={(e) => setComposer(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => onSetAttachMenuOpen(false)}
            placeholder={
              isAdminChat ? t("chat_replyToClient") : t("chat_message")
            }
          />
          <button
            className="composer__field-btn"
            type="button"
            aria-label={t("chat_attach")}
            onClick={() => {
              onSetAttachMenuOpen((v: boolean) => !v);
            }}
          >
            <PaperclipIcon />
          </button>
        </div>
        {/* Mic / Send circle button */}
        <button
          className={`composer__action ${hasText ? "composer__action--send" : ""}`}
          type="button"
          aria-label={hasText ? t("chat_send") : t("chat_voiceMessage")}
          onClick={hasText ? onSendMessage : undefined}
          onPointerDown={!hasText ? (e) => {
            recordingStartXRef.current = e.clientX;
            onStartRecording();
          } : undefined}
          onPointerUp={!hasText ? () => {
            if (isRecording && !isCancelHinted) {
              onStopRecordingAndSend();
            } else if (isCancelHinted) {
              onCancelRecording();
            }
          } : undefined}
          onPointerMove={!hasText ? (e) => {
            if (isRecording) {
              const dx = recordingStartXRef.current - e.clientX;
              onSetIsCancelHinted(dx > 60);
            }
          } : undefined}
          onPointerLeave={!hasText ? () => {
            if (isRecording && !isCancelHinted) {
              onStopRecordingAndSend();
            } else if (isRecording && isCancelHinted) {
              onCancelRecording();
            }
          } : undefined}
        >
          {hasText ? <SendIcon /> : <MicIcon />}
        </button>
      </div>
    </>
  );
}
