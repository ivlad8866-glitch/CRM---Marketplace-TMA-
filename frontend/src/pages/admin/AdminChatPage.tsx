import type { Message, Ticket } from "../../types";
import { demoTemplates } from "../../data/demo-data";
import ChatView from "../../components/chat/ChatView";

type AdminChatPageProps = {
  activeTicket: Ticket | undefined;
  messages: Message[];
  messagesLoading: boolean;
  isTyping: boolean;
  playingMessageId: string | null;
  playbackTime: number;
  onTogglePlayVoice: (msg: Message) => void;
  onGoBack: () => void;
  quickReplies: string[];
  onInsertQuickReply: (text: string) => void;
  onInsertTemplate: (text: string) => void;
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

export default function AdminChatPage(props: AdminChatPageProps) {
  const title = props.activeTicket?.title ?? "Чат";
  const subtitle = `${props.activeTicket?.clientNumber} -- SLA ${props.activeTicket?.slaMinutes} мин`;
  const avatarContent = (props.activeTicket?.clientNumber ?? "C").replace("C-", "").slice(0, 2);

  return (
    <ChatView
      isAdminChat={true}
      isClientChat={false}
      title={title}
      subtitle={subtitle}
      avatarContent={avatarContent}
      activeTicket={props.activeTicket}
      onGoBack={props.onGoBack}
      messages={props.messages}
      messagesLoading={props.messagesLoading}
      isTyping={props.isTyping}
      playingMessageId={props.playingMessageId}
      playbackTime={props.playbackTime}
      onTogglePlayVoice={props.onTogglePlayVoice}
      chatRatingShown={false}
      activeChannelId=""
      onRateChannel={() => {}}
      onOpenReview={() => {}}
      onDismissChatRating={() => {}}
      quickReplies={props.quickReplies}
      onInsertQuickReply={props.onInsertQuickReply}
      templates={demoTemplates}
      onInsertTemplate={props.onInsertTemplate}
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
