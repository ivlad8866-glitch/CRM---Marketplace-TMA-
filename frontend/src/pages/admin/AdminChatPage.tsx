import type { Message, Ticket } from "../../types";
import { demoTemplates } from "../../data/demo-data";
import ChatView from "../../components/chat/ChatView";
import { useLocale } from "../../lib/i18n";

type AdminChatPageProps = {
  activeTicket: Ticket | undefined;
  messages: Message[];
  messagesLoading: boolean;
  isTyping: boolean;
  playingMessageId: string | null;
  playbackTime: number;
  playbackProgress?: number;
  onTogglePlayVoice: (msg: Message) => void;
  onGoBack: () => void;
  quickReplies: string[];
  onInsertQuickReply: (text: string) => void;
  onInsertTemplate: (text: string) => void;
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

export default function AdminChatPage(props: AdminChatPageProps) {
  const { t } = useLocale();
  const title = props.activeTicket?.title ?? t("adminChat_title");
  const subtitle = `${props.activeTicket?.clientNumber} -- SLA ${props.activeTicket?.slaMinutes} ${t("common_min")}`;
  const avatarContent = (props.activeTicket?.clientNumber ?? "C").replace("C-", "").slice(0, 2);

  return (
    <ChatView
      role={props.role}
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
      playbackProgress={props.playbackProgress}
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
