import type { Message, Channel } from "../../types";
import ChatView from "../../components/chat/ChatView";

type ClientChatPageProps = {
  activeChannel: Channel | undefined;
  activeChannelId: string;
  activeServiceName: string;
  messages: Message[];
  messagesLoading: boolean;
  isTyping: boolean;
  playingMessageId: string | null;
  playbackTime: number;
  onTogglePlayVoice: (msg: Message) => void;
  chatRatingShown: boolean;
  onRateChannel: (channelId: string, stars: number) => void;
  onOpenReview: (channelId: string) => void;
  onDismissChatRating: () => void;
  onGoBack: () => void;
  quickReplies: string[];
  onInsertQuickReply: (text: string) => void;
  /* Composer props */
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

export default function ClientChatPage(props: ClientChatPageProps) {
  const title = props.activeServiceName || "Чат поддержки";
  const subtitle = `${props.activeChannel?.name ?? "Канал"} -- online`;

  return (
    <ChatView
      isAdminChat={false}
      isClientChat={true}
      title={title}
      subtitle={subtitle}
      avatarContent="S"
      activeTicket={undefined}
      onGoBack={props.onGoBack}
      messages={props.messages}
      messagesLoading={props.messagesLoading}
      isTyping={props.isTyping}
      playingMessageId={props.playingMessageId}
      playbackTime={props.playbackTime}
      onTogglePlayVoice={props.onTogglePlayVoice}
      chatRatingShown={props.chatRatingShown}
      activeChannelId={props.activeChannelId}
      onRateChannel={props.onRateChannel}
      onOpenReview={props.onOpenReview}
      onDismissChatRating={props.onDismissChatRating}
      quickReplies={props.quickReplies}
      onInsertQuickReply={props.onInsertQuickReply}
      composer={props.composer}
      setComposer={props.setComposer}
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
  );
}
