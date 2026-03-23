import { useRef } from "react";
import VoiceRecorder from "./VoiceRecorder";
import StickerPicker from "./StickerPicker";
import AttachmentSheet from "./AttachmentSheet";

type MessageComposerProps = {
  composer: string;
  setComposer: (val: string) => void;
  isAdminChat: boolean;
  isRecording: boolean;
  recordingTime: number;
  isCancelHinted: boolean;
  stickerPanelOpen: boolean;
  stickerCategoryIdx: number;
  attachMenuOpen: boolean;
  composerInputRef: React.RefObject<HTMLInputElement | null>;
  recordingStartXRef: React.MutableRefObject<number>;
  onSendMessage: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onStartRecording: () => void;
  onStopRecordingAndSend: () => void;
  onCancelRecording: () => void;
  onSetIsCancelHinted: (v: boolean) => void;
  onSetStickerPanelOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  onSetStickerCategoryIdx: (idx: number) => void;
  onSetAttachMenuOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  onSendSticker: (emoji: string) => void;
  onSendAttachment: (kind: "photo" | "file" | "location") => void;
  onCameraClick: () => void;
};

export default function MessageComposer({
  composer,
  setComposer,
  isAdminChat,
  isRecording,
  recordingTime,
  isCancelHinted,
  stickerPanelOpen,
  stickerCategoryIdx,
  attachMenuOpen,
  composerInputRef,
  recordingStartXRef,
  onSendMessage,
  onKeyDown,
  onStartRecording,
  onStopRecordingAndSend,
  onCancelRecording,
  onSetIsCancelHinted,
  onSetStickerPanelOpen,
  onSetStickerCategoryIdx,
  onSetAttachMenuOpen,
  onSendSticker,
  onSendAttachment,
  onCameraClick,
}: MessageComposerProps) {
  /* Recording state */
  if (isRecording) {
    return (
      <VoiceRecorder
        recordingTime={recordingTime}
        onCancel={onCancelRecording}
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
      <StickerPicker
        open={stickerPanelOpen}
        categoryIdx={stickerCategoryIdx}
        onCategoryChange={onSetStickerCategoryIdx}
        onSendSticker={onSendSticker}
      />
      <div className="composer">
        {/* Pill-shaped input field */}
        <div className="composer__field">
          <button
            className="composer__field-btn"
            type="button"
            aria-label="Прикрепить"
            onClick={() => {
              onSetAttachMenuOpen((v: boolean) => !v);
              onSetStickerPanelOpen(false);
            }}
          >
            {"\u{1F4CE}"}
          </button>
          <input
            ref={composerInputRef}
            value={composer}
            onChange={(e) => {
              setComposer(e.target.value);
              if (e.target.value.length > 0 && stickerPanelOpen) {
                onSetStickerPanelOpen(false);
              }
            }}
            onKeyDown={onKeyDown}
            onFocus={() => {
              onSetAttachMenuOpen(false);
            }}
            placeholder={
              isAdminChat ? "Ответ клиенту..." : "Сообщение..."
            }
          />
          <button
            className={`composer__field-btn ${stickerPanelOpen ? "composer__field-btn--active" : ""}`}
            type="button"
            aria-label="Стикеры"
            onClick={() => {
              onSetStickerPanelOpen((v: boolean) => !v);
              onSetAttachMenuOpen(false);
            }}
          >
            {"\u{1F60A}"}
          </button>
        </div>
        {/* Mic / Send circle button */}
        <button
          className={`composer__action ${hasText ? "composer__action--send" : ""}`}
          type="button"
          aria-label={hasText ? "Отправить" : "Голосовое сообщение"}
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
          {hasText ? "\u27A4" : "\u{1F3A4}"}
        </button>
      </div>
    </>
  );
}
