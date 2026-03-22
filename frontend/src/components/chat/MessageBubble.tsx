import type { Message } from "../../types";
import { formatVoiceTime } from "../../lib/adapters";

type MessageBubbleProps = {
  msg: Message;
  playingMessageId: string | null;
  playbackTime: number;
  onTogglePlayVoice: (msg: Message) => void;
};

export default function MessageBubble({
  msg,
  playingMessageId,
  playbackTime,
  onTogglePlayVoice,
}: MessageBubbleProps) {
  /* Sticker message */
  if (msg.type === "sticker" && msg.sticker) {
    return (
      <div className={`bubble-sticker bubble-sticker--${msg.author}`}>
        <span className="bubble-sticker__emoji">{msg.sticker}</span>
        <small>{msg.time}</small>
      </div>
    );
  }

  /* Voice message */
  if (msg.type === "voice") {
    const isPlaying = playingMessageId === msg.id;
    const dur = msg.voiceDuration ?? 0;
    const elapsed = isPlaying ? playbackTime : 0;
    return (
      <div className={`bubble bubble--${msg.author} bubble--voice`}>
        <div className="voice-bubble">
          <button
            className="voice-bubble__play"
            type="button"
            onClick={() => onTogglePlayVoice(msg)}
            aria-label={isPlaying ? "Пауза" : "Воспроизвести"}
          >
            {isPlaying ? "\u23F8" : "\u25B6"}
          </button>
          <div className="voice-bubble__waveform">
            {Array.from({ length: 16 }).map((_, i) => (
              <span
                key={i}
                className={`voice-bubble__bar ${isPlaying && i <= Math.floor((elapsed / Math.max(dur, 1)) * 16) ? "voice-bubble__bar--active" : ""}`}
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
        <small>{msg.time}</small>
      </div>
    );
  }

  /* Image message */
  if (msg.type === "image") {
    return (
      <div className={`bubble bubble--${msg.author} bubble--image`}>
        <div className="image-placeholder">
          <span className="image-placeholder__icon">
            {"\u{1F4F7}"} {msg.imageName ?? "photo.jpg"}
          </span>
        </div>
        <small>{msg.time}</small>
      </div>
    );
  }

  /* File message */
  if (msg.type === "file") {
    return (
      <div className={`bubble bubble--${msg.author} bubble--file`}>
        <div className="file-bubble">
          <span className="file-bubble__icon">{"\u{1F4C4}"}</span>
          <div className="file-bubble__info">
            <span className="file-bubble__name">
              {msg.fileName ?? "file"}
            </span>
            <span className="file-bubble__size">
              {msg.fileSize ?? ""}
            </span>
          </div>
        </div>
        <small>{msg.time}</small>
      </div>
    );
  }

  /* Default text / system message */
  return (
    <div className={`bubble bubble--${msg.author}`}>
      <span>{msg.text}</span>
      <small>{msg.time}</small>
    </div>
  );
}
