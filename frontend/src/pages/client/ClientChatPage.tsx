import type { Message, Channel } from "../../types";
import ChatView from "../../components/chat/ChatView";
import { useLocale } from "../../lib/i18n";

type ClientChatPageProps = {
  activeChannel: Channel | undefined;
  activeChannelId: string;
  activeServiceName: string;
  messages: Message[];
  messagesLoading: boolean;
  isTyping: boolean;
  playingMessageId: string | null;
  playbackTime: number;
  playbackProgress?: number;
  onTogglePlayVoice: (msg: Message) => void;
  chatRatingShown: boolean;
  onRateChannel: (channelId: string, stars: number) => void;
  onOpenReview: (channelId: string) => void;
  onDismissChatRating: () => void;
  onGoBack: () => void;
  quickReplies: string[];
  onInsertQuickReply: (text: string) => void;
  /* Composer props */
  role: "client" | "admin";
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
};

export default function ClientChatPage(props: ClientChatPageProps) {
  const { t } = useLocale();
  const title = props.activeServiceName || t("clientChat_title");
  const subtitle = `${props.activeChannel?.name ?? t("servicesPage_channel")} -- ${t("clientChat_online")}`;

  return (
    <ChatView
      role={props.role}
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
      playbackProgress={props.playbackProgress}
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
    />
  );
}
