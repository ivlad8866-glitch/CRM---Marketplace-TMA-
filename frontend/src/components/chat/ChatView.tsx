import { useRef, useEffect } from "react";
import type { Message, Ticket } from "../../types";
import { statusLabels } from "../../data/demo-data";
import { useLocale } from "../../lib/i18n";
import MessageBubble from "./MessageBubble";
import MessageComposer from "./MessageComposer";
import { MessageSkeleton } from "../ui/Skeleton";

type ChatViewProps = {
  /* Header */
  role: "client" | "admin";
  isAdminChat: boolean;
  title: string;
  subtitle: string;
  avatarContent: string;
  activeTicket: Ticket | undefined;
  onGoBack: () => void;

  /* Messages */
  messages: Message[];
  messagesLoading: boolean;
  isTyping: boolean;

  /* Playback */
  playingMessageId: string | null;
  playbackTime: number;
  playbackProgress?: number;
  onTogglePlayVoice: (msg: Message) => void;

  /* Chat rating prompt (client only) */
  isClientChat: boolean;
  chatRatingShown: boolean;
  activeChannelId: string;
  onRateChannel: (channelId: string, stars: number) => void;
  onOpenReview: (channelId: string) => void;
  onDismissChatRating: () => void;

  /* Quick replies */
  quickReplies: string[];
  onInsertQuickReply: (text: string) => void;

  /* Templates (admin only) */
  templates?: { id: string; title: string; text: string }[];
  onInsertTemplate?: (text: string) => void;

  /* Composer */
  composer: string;
  setComposer: (val: string) => void;
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

/* Avatar color from string hash */
const AVATAR_COLORS = ["#2AABEE", "#FF9500", "#34c759", "#9b59b6", "#e67e22", "#ff3b30"];
function hashStr(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return Math.abs(h); }

export default function ChatView(props: ChatViewProps) {
  const { t } = useLocale();
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [props.messages, props.isTyping]);

  const avatarColor = AVATAR_COLORS[hashStr(props.title) % AVATAR_COLORS.length];

  return (
    <div className="screen screen--chat">
      {/* ── Telegram-style chat header ── */}
      <div className="chat-header">
        <button
          className="chat-header__back"
          type="button"
          onClick={props.onGoBack}
          aria-label={t("common_back")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: avatarColor, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 600, flexShrink: 0,
        }}>
          {props.avatarContent}
        </div>
        <div className="chat-header__info">
          <div className="chat-header__name">{props.title}</div>
          <div className="chat-header__status">
            {props.isTyping ? (
              <span style={{ color: "var(--primary)" }}>{props.isAdminChat ? t("chat_agent") : t("chat_you")}...</span>
            ) : (
              props.subtitle
            )}
          </div>
        </div>
        {props.isAdminChat && props.activeTicket && (
          <div className="chat-header__actions">
            <span className={`badge badge--${props.activeTicket.status}`}>
              {statusLabels[props.activeTicket.status ?? "new"]}
            </span>
          </div>
        )}
      </div>

      {/* ── Quick replies (scrollable chips) ── */}
      {props.quickReplies.length > 0 && (
        <div className="quick-replies">
          {props.quickReplies.map((reply) => (
            <button
              key={reply}
              className="quick-reply"
              type="button"
              onClick={() => props.onInsertQuickReply(reply)}
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* ── Chat body ── */}
      <div className="chat-body">
        <div className="chat-day">{t("chat_today")}</div>
        {props.messagesLoading && <MessageSkeleton count={5} />}
        {props.messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            role={props.role}
            playingMessageId={props.playingMessageId}
            playbackTime={props.playbackTime}
            playbackProgress={props.playbackProgress}
            onTogglePlayVoice={props.onTogglePlayVoice}
          />
        ))}
        {props.isTyping && (
          <div className="bubble bubble--theirs bubble--typing">
            <span className="typing">
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
        {/* Chat rating prompt for client */}
        {props.isClientChat && props.chatRatingShown && (
          <div className="chat-rating-prompt">
            <span>{t("review_rateChannel")}</span>
            <div className="chat-rating-prompt__stars">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  className="chat-rating-prompt__star"
                  type="button"
                  onClick={() => {
                    props.onRateChannel(props.activeChannelId, s);
                    props.onDismissChatRating();
                  }}
                  aria-label={`${s} ${t("review_stars")}`}
                >
                  &#9733;
                </button>
              ))}
            </div>
            <button
              className="chat-rating-prompt__link"
              type="button"
              onClick={() => {
                props.onOpenReview(props.activeChannelId);
                props.onDismissChatRating();
              }}
            >
              {t("review_leaveReview")}
            </button>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* ── Admin templates quick access ── */}
      {props.isAdminChat && props.templates && props.onInsertTemplate && (
        <div className="template-chips">
          {props.templates.map((tpl) => (
            <button
              key={tpl.id}
              className="chip chip--sm"
              type="button"
              onClick={() => props.onInsertTemplate!(tpl.text)}
            >
              {tpl.title}
            </button>
          ))}
        </div>
      )}

      {/* ── Composer ── */}
      <MessageComposer
        composer={props.composer}
        setComposer={props.setComposer}
        isAdminChat={props.isAdminChat}
        isRecording={props.isRecording}
        recordingTime={props.recordingTime}
        isCancelHinted={props.isCancelHinted}
        attachMenuOpen={props.attachMenuOpen}
        composerInputRef={props.composerInputRef}
        recordingStartXRef={props.recordingStartXRef}
        onSendMessage={props.onSendMessage}
        onKeyDown={props.onKeyDown}
        onStartRecording={props.onStartRecording}
        onStopRecordingAndSend={props.onStopRecordingAndSend}
        onCancelRecording={props.onCancelRecording}
        onSetIsCancelHinted={props.onSetIsCancelHinted}
        onSetAttachMenuOpen={props.onSetAttachMenuOpen}
        onSendAttachment={props.onSendAttachment}
        onCameraClick={props.onCameraClick}
        waveformLevel={props.waveformLevel}
        isLocked={props.isLocked}
        onLockRecording={props.onLockRecording}
      />
    </div>
  );
}
