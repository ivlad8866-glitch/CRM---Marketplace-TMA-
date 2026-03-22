import { useRef, useEffect } from "react";
import type { Message, Ticket } from "../../types";
import { statusLabels } from "../../data/demo-data";
import MessageBubble from "./MessageBubble";
import MessageComposer from "./MessageComposer";

type ChatViewProps = {
  /* Header */
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

export default function ChatView(props: ChatViewProps) {
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [props.messages, props.isTyping]);

  return (
    <div className="screen screen--chat">
      {/* Chat header */}
      <div className="chat-header">
        <button
          className="chat-header__back"
          type="button"
          onClick={props.onGoBack}
          aria-label="Назад"
        >
          &#8592;
        </button>
        <div className="avatar">{props.avatarContent}</div>
        <div className="chat-header__info">
          <div className="chat-header__name">{props.title}</div>
          <div className="chat-header__status">{props.subtitle}</div>
        </div>
        {props.isAdminChat && props.activeTicket && (
          <div className="chat-header__actions">
            <span className={`badge badge--${props.activeTicket.status}`}>
              {statusLabels[props.activeTicket.status ?? "new"]}
            </span>
          </div>
        )}
      </div>

      {/* Quick replies */}
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

      {/* Chat body */}
      <div className="chat-body">
        <div className="chat-day">Сегодня</div>
        {props.messagesLoading && (
          <div className="empty-state">Загрузка сообщений...</div>
        )}
        {props.messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            playingMessageId={props.playingMessageId}
            playbackTime={props.playbackTime}
            onTogglePlayVoice={props.onTogglePlayVoice}
          />
        ))}
        {props.isTyping && (
          <div className="bubble bubble--agent bubble--typing">
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
            <span>Оцените канал</span>
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
                  aria-label={`${s} звезд`}
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
              Оставить отзыв
            </button>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Admin templates quick access */}
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

      {/* Composer */}
      <MessageComposer
        composer={props.composer}
        setComposer={props.setComposer}
        isAdminChat={props.isAdminChat}
        isRecording={props.isRecording}
        recordingTime={props.recordingTime}
        isCancelHinted={props.isCancelHinted}
        stickerPanelOpen={props.stickerPanelOpen}
        stickerCategoryIdx={props.stickerCategoryIdx}
        attachMenuOpen={props.attachMenuOpen}
        composerInputRef={props.composerInputRef}
        recordingStartXRef={props.recordingStartXRef}
        onSendMessage={props.onSendMessage}
        onKeyDown={props.onKeyDown}
        onStartRecording={props.onStartRecording}
        onStopRecordingAndSend={props.onStopRecordingAndSend}
        onCancelRecording={props.onCancelRecording}
        onSetIsCancelHinted={props.onSetIsCancelHinted}
        onSetStickerPanelOpen={props.onSetStickerPanelOpen}
        onSetStickerCategoryIdx={props.onSetStickerCategoryIdx}
        onSetAttachMenuOpen={props.onSetAttachMenuOpen}
        onSendSticker={props.onSendSticker}
        onSendAttachment={props.onSendAttachment}
        onCameraClick={props.onCameraClick}
      />
    </div>
  );
}
