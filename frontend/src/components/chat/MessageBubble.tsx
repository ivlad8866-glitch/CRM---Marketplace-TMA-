import type { Message } from "../../types";
import { formatVoiceTime } from "../../lib/adapters";
import { useLocale } from "../../lib/i18n";

type MessageBubbleProps = {
  msg: Message;
  role: "client" | "admin";
  playingMessageId: string | null;
  playbackTime: number;
  playbackProgress?: number;
  onTogglePlayVoice: (msg: Message) => void;
};

/* ── Helpers ─────────────────────────────────────────────────── */

const URL_REGEX = /(https?:\/\/[^\s<]+)/g;

const EMOJI_ONLY_REGEX = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic}){1,3}$/u;

function isEmojiOnly(text: string): boolean {
  return EMOJI_ONLY_REGEX.test(text.trim());
}

/** Render text with newlines preserved and URLs turned into clickable links */
function renderTextContent(text: string) {
  const lines = text.split("\n");
  return lines.map((line, lineIdx) => {
    const parts = line.split(URL_REGEX);
    const rendered = parts.map((part, partIdx) => {
      if (URL_REGEX.test(part)) {
        // Reset regex lastIndex since it's global
        URL_REGEX.lastIndex = 0;
        return (
          <a
            key={`${lineIdx}-${partIdx}`}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--primary)", textDecoration: "none" }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.textDecoration = "underline"; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.textDecoration = "none"; }}
          >
            {part}
          </a>
        );
      }
      // Reset regex lastIndex
      URL_REGEX.lastIndex = 0;
      return <span key={`${lineIdx}-${partIdx}`}>{part}</span>;
    });

    return (
      <span key={lineIdx}>
        {rendered}
        {lineIdx < lines.length - 1 && <br />}
      </span>
    );
  });
}

/** Inline time badge (floats right inside the bubble text) */
function TimeBadge({ time, isMine }: { time: string; isMine: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        float: "right",
        marginTop: 4,
        marginLeft: 8,
        fontSize: 11,
        lineHeight: 1.8,
        color: "inherit",
        gap: 2,
        whiteSpace: "nowrap",
      }}
    >
      {time}
      {isMine && (
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none" style={{ marginLeft: 1, opacity: 0.7 }}>
          <path d="M1 5.5L4.5 9L11 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 5.5L8.5 9L15 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

/* ── SVG Icons ───────────────────────────────────────────────── */

function CameraIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

/* ── Component ───────────────────────────────────────────────── */

export default function MessageBubble({
  msg,
  role,
  playingMessageId,
  playbackTime,
  playbackProgress = 0,
  onTogglePlayVoice,
}: MessageBubbleProps) {
  const { t } = useLocale();
  const isSystem = msg.author === "system";
  /* "mine" = message sent by the current user (customer in client view, agent in admin view) */
  const isMine = role === "client" ? msg.author === "customer" : msg.author === "agent";

  const side = isSystem ? "system" : isMine ? "mine" : "theirs";

  /* ── Sticker message ── */
  if (msg.type === "sticker" && msg.sticker) {
    return (
      <div className={`bubble-sticker bubble-sticker--${side}`}>
        <span className="bubble-sticker__emoji">{msg.sticker}</span>
        <span style={{ fontSize: 11, color: "var(--text-hint)", display: "inline-flex", alignItems: "center", gap: 2 }}>
          {msg.time}
          {isMine && (
            <svg width="16" height="11" viewBox="0 0 16 11" fill="none" style={{ marginLeft: 1, opacity: 0.7 }}>
              <path d="M1 5.5L4.5 9L11 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 5.5L8.5 9L15 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      </div>
    );
  }

  /* ── Voice message ── */
  if (msg.type === "voice") {
    const isPlaying = playingMessageId === msg.id;
    const dur = msg.voiceDuration ?? 0;
    const elapsed = isPlaying ? playbackTime : 0;
    // Use smooth playbackProgress (0-1) when playing, fall back to time-based calculation
    const barCount = 16;
    const progress = isPlaying
      ? (playbackProgress > 0 ? playbackProgress : elapsed / Math.max(dur, 1))
      : 0;
    const activeBarIdx = Math.floor(progress * barCount);

    return (
      <div className={`bubble bubble--${side} bubble--voice`}>
        <div className="voice-bubble">
          <button
            className="voice-bubble__play"
            type="button"
            onClick={() => onTogglePlayVoice(msg)}
            aria-label={isPlaying ? t("chat_pause") : t("chat_play")}
          >
            {isPlaying ? "\u23F8" : "\u25B6"}
          </button>
          <div className="voice-bubble__waveform">
            {Array.from({ length: barCount }).map((_, i) => (
              <span
                key={i}
                className={`voice-bubble__bar ${isPlaying && i <= activeBarIdx ? "voice-bubble__bar--active" : ""}`}
                style={{
                  height: `${20 + Math.sin(i * 0.8) * 12 + (i % 3) * 5}%`,
                }}
              />
            ))}
          </div>
          <span className="voice-bubble__time">
            {isPlaying ? formatVoiceTime(elapsed) : formatVoiceTime(dur)}
          </span>
        </div>
        <TimeBadge time={msg.time} isMine={isMine} />
      </div>
    );
  }

  /* ── Image message ── */
  if (msg.type === "image") {
    const hasRealImage = msg.imageUrl && msg.imageUrl.length > 0;
    return (
      <div className={`bubble bubble--${side} bubble--image`}>
        {hasRealImage ? (
          <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer" style={{ display: "block" }}>
            <img
              src={msg.imageUrl}
              alt={msg.imageName ?? "photo"}
              style={{
                width: 200,
                maxHeight: 260,
                objectFit: "cover",
                borderRadius: "calc(var(--radius-xl) - 2px)",
                display: "block",
              }}
            />
          </a>
        ) : (
          <div className="image-placeholder">
            <CameraIcon />
          </div>
        )}
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          float: "right",
          marginTop: 4,
          marginRight: 4,
          marginLeft: 8,
          fontSize: 11,
          color: hasRealImage ? "rgba(255,255,255,0.9)" : "var(--text-hint)",
          gap: 2,
          whiteSpace: "nowrap",
          ...(hasRealImage ? {
            position: "relative",
            bottom: 6,
            textShadow: "0 1px 3px rgba(0,0,0,0.5)",
          } : {}),
        }}>
          {msg.time}
          {isMine && (
            <svg width="16" height="11" viewBox="0 0 16 11" fill="none" style={{ marginLeft: 1, opacity: 0.7 }}>
              <path d="M1 5.5L4.5 9L11 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 5.5L8.5 9L15 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      </div>
    );
  }

  /* ── File message ── */
  if (msg.type === "file") {
    const fileContent = (
      <div className="file-bubble">
        <span className="file-bubble__icon">
          <DocumentIcon />
        </span>
        <div className="file-bubble__info">
          <span className="file-bubble__name">
            {msg.fileName ?? "file"}
          </span>
          <span className="file-bubble__size">
            {msg.fileSize ?? ""}
          </span>
        </div>
      </div>
    );
    return (
      <div className={`bubble bubble--${side} bubble--file`}>
        {msg.fileUrl ? (
          <a
            href={msg.fileUrl}
            download={msg.fileName ?? "file"}
            target="_blank"
            rel="noopener noreferrer"
            className="file-bubble__link"
          >
            {fileContent}
          </a>
        ) : fileContent}
        <TimeBadge time={msg.time} isMine={isMine} />
      </div>
    );
  }

  /* ── Text message (default) ── */

  /* Emoji-only messages: large emoji, no bubble background */
  if (!isSystem && msg.text && isEmojiOnly(msg.text)) {
    return (
      <div
        style={{
          alignSelf: isMine ? "flex-end" : "flex-start",
          padding: "4px 4px 0",
          display: "flex",
          flexDirection: "column",
          alignItems: isMine ? "flex-end" : "flex-start",
        }}
      >
        <span style={{ fontSize: 48, lineHeight: 1.15 }}>{msg.text}</span>
        <span style={{
          fontSize: 11,
          color: "var(--text-hint)",
          display: "inline-flex",
          alignItems: "center",
          gap: 2,
          marginTop: 2,
        }}>
          {msg.time}
          {isMine && (
            <svg width="16" height="11" viewBox="0 0 16 11" fill="none" style={{ marginLeft: 1, opacity: 0.7 }}>
              <path d="M1 5.5L4.5 9L11 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 5.5L8.5 9L15 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      </div>
    );
  }

  return (
    <div className={`bubble bubble--${side}`}>
      {renderTextContent(msg.text)}
      <TimeBadge time={msg.time} isMine={isMine} />
    </div>
  );
}
