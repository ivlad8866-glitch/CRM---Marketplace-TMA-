import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "./src/stores/auth.store";

/* Types */
import type {
  ClientTab, AdminTab, AdminMoreScreen, ServiceSubTab,
  TicketStatus, Message, Service,
} from "./src/types";

/* Data */
import { demoChannels, demoAds, quickReplies } from "./src/data/demo-data";

/* Adapters & helpers */
import { getTelegram } from "./src/lib/adapters";

/* Hooks */
import { useToast } from "./src/hooks/useToast";
import { useApiData } from "./src/hooks/useApiData";
import { useAutoReply } from "./src/hooks/useAutoReply";
import { useVoiceRecording } from "./src/hooks/useVoiceRecording";
import { useVoicePlayback } from "./src/hooks/useVoicePlayback";

/* Layout */
import AppShell from "./src/components/layout/AppShell";
import TopBar from "./src/components/layout/TopBar";
import BottomNav from "./src/components/layout/BottomNav";

/* UI */
import ReviewOverlay from "./src/components/ui/ReviewOverlay";

/* Pages */
import AuthScreen from "./src/pages/auth/AuthScreen";
import CatalogPage from "./src/pages/client/CatalogPage";
import ServicesPage from "./src/pages/client/ServicesPage";
import ChatListPage from "./src/pages/client/ChatListPage";
import ClientChatPage from "./src/pages/client/ClientChatPage";
import ProfilePage from "./src/pages/client/ProfilePage";
import DashboardPage from "./src/pages/admin/DashboardPage";
import TicketsPage from "./src/pages/admin/TicketsPage";
import AdminChatListPage from "./src/pages/admin/AdminChatListPage";
import AdminChatPage from "./src/pages/admin/AdminChatPage";
import MorePage from "./src/pages/admin/MorePage";

/* ================================================================ */
export default function App() {
  const authState = useAuthStore();

  /* --- Role & navigation --- */
  const [role, setRole] = useState<"client" | "admin">("client");
  const [isAuthScreen, setIsAuthScreen] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [clientTab, setClientTab] = useState<ClientTab>("catalog");
  const [adminTab, setAdminTab] = useState<AdminTab>("dashboard");
  const [adminMoreScreen, setAdminMoreScreen] = useState<AdminMoreScreen>("menu");
  const [clientHistory, setClientHistory] = useState<ClientTab[]>([]);
  const [adminHistory, setAdminHistory] = useState<AdminTab[]>([]);

  /* --- Chat UI state --- */
  const [composer, setComposer] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const composerInputRef = useRef<HTMLInputElement | null>(null);
  const [stickerPanelOpen, setStickerPanelOpen] = useState(false);
  const [stickerCategoryIdx, setStickerCategoryIdx] = useState(0);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [chatRatingShown, setChatRatingShown] = useState(false);
  const chatRatingTimerRef = useRef<number | null>(null);

  /* --- Selection --- */
  const [activeChannelId, setActiveChannelId] = useState(demoChannels[0]?.id ?? "");
  const [activeServiceName, setActiveServiceName] = useState("");
  const [activeTicketId, setActiveTicketId] = useState("T-2026-000142");
  const [serviceSubTab, setServiceSubTab] = useState<ServiceSubTab>("services");

  /* --- Ratings --- */
  const [channelRatings, setChannelRatings] = useState<Record<string, { rating: number; count: number }>>(() => {
    const init: Record<string, { rating: number; count: number }> = {};
    for (const ch of demoChannels) init[ch.id] = { rating: ch.rating, count: ch.reviewCount };
    return init;
  });
  const [reviewingChannelId, setReviewingChannelId] = useState<string | null>(null);
  const [reviewStars, setReviewStars] = useState(0);
  const [reviewComment, setReviewComment] = useState("");

  /* --- Filters --- */
  const [ticketQuery, setTicketQuery] = useState("");
  const [ticketSort, setTicketSort] = useState<"sla" | "status">("sla");
  const [ticketFilter, setTicketFilter] = useState<TicketStatus | "all" | "overdue">("all");
  const [channelFilter, setChannelFilter] = useState("Все");
  const [historyFilter, setHistoryFilter] = useState("Все");
  const [chatListQuery, setChatListQuery] = useState("");

  /* --- Theme --- */
  const [themeMode, setThemeMode] = useState<"day" | "night">("night");
  const [accentColor, setAccentColor] = useState("#6ab3f3");

  /* --- Custom hooks --- */
  const { toast, showToast, cleanupToast } = useToast();
  const { tickets, messages, setMessages, messagesLoading, loadTickets, loadMessages, sendMessageToApi } = useApiData();
  const { scheduleAutoReply } = useAutoReply({ setMessages, setIsTyping });
  const addMessage = useCallback((msg: Message) => setMessages((prev) => [...prev, msg]), [setMessages]);
  const voiceRec = useVoiceRecording({ role, showToast, addMessage, scheduleAutoReply });
  const voicePlay = useVoicePlayback({ showToast });

  /* --- Derived --- */
  const isClientChat = role === "client" && clientTab === "chat";
  const isAdminChat = role === "admin" && adminTab === "chat";
  const isChat = isClientChat || isAdminChat;

  const activeChannel = useMemo(() => demoChannels.find((ch) => ch.id === activeChannelId) ?? demoChannels[0], [activeChannelId]);
  const activeServices = activeChannel?.services ?? [];
  const activeTicket = useMemo(() => tickets.find((t) => t.id === activeTicketId) ?? tickets[0], [activeTicketId, tickets]);
  const filteredChannels = useMemo(() => channelFilter === "Все" ? demoChannels : demoChannels.filter((ch) => ch.type === channelFilter), [channelFilter]);

  const filteredTickets = useMemo(() => {
    const norm = ticketQuery.trim().toLowerCase();
    const byFilter = ticketFilter === "all" ? tickets
      : ticketFilter === "overdue" ? tickets.filter((t) => t.slaMinutes <= 3)
      : tickets.filter((t) => t.status === ticketFilter);
    const byQuery = norm ? byFilter.filter((t) => t.title.toLowerCase().includes(norm) || t.id.toLowerCase().includes(norm) || t.clientNumber.toLowerCase().includes(norm)) : byFilter;
    return ticketSort === "status" ? [...byQuery].sort((a, b) => a.status.localeCompare(b.status)) : [...byQuery].sort((a, b) => a.slaMinutes - b.slaMinutes);
  }, [ticketQuery, ticketFilter, ticketSort, tickets]);

  const filteredHistory = useMemo(() => {
    if (historyFilter === "Все") return tickets;
    if (historyFilter === "Активные") return tickets.filter((t) => t.status === "new" || t.status === "in_progress");
    return tickets.filter((t) => t.status === "resolved" || t.status === "closed");
  }, [historyFilter, tickets]);

  const channelAdsForActive = useMemo(() => demoAds.filter((ad) => ad.channelId === activeChannelId), [activeChannelId]);
  const reviewingChannel = useMemo(() => reviewingChannelId ? demoChannels.find((ch) => ch.id === reviewingChannelId) ?? null : null, [reviewingChannelId]);

  /* --- Rating --- */
  const rateChannel = useCallback((channelId: string, stars: number) => {
    setChannelRatings((prev) => {
      const old = prev[channelId] ?? { rating: 0, count: 0 };
      const nc = old.count + 1;
      return { ...prev, [channelId]: { rating: (old.rating * old.count + stars) / nc, count: nc } };
    });
    showToast("Спасибо за оценку!");
  }, [showToast]);

  const submitReview = useCallback(() => {
    if (!reviewingChannelId || reviewStars === 0) return;
    rateChannel(reviewingChannelId, reviewStars);
    setReviewingChannelId(null); setReviewStars(0); setReviewComment("");
  }, [reviewingChannelId, reviewStars, rateChannel]);

  /* --- Navigation --- */
  const navigateClientTab = useCallback((tab: ClientTab) => { setClientHistory((p) => [...p, clientTab]); setClientTab(tab); }, [clientTab]);
  const navigateAdminTab = useCallback((tab: AdminTab) => { setAdminHistory((p) => [...p, adminTab]); setAdminTab(tab); if (tab !== "more") setAdminMoreScreen("menu"); }, [adminTab]);

  const goBack = useCallback(() => {
    if (role === "client") {
      if (clientHistory.length > 0) { setClientTab(clientHistory[clientHistory.length - 1]); setClientHistory((h) => h.slice(0, -1)); }
    } else {
      if (adminMoreScreen !== "menu" && adminTab === "more") { setAdminMoreScreen("menu"); return; }
      if (adminHistory.length > 0) { setAdminTab(adminHistory[adminHistory.length - 1]); setAdminHistory((h) => h.slice(0, -1)); }
    }
  }, [role, clientHistory, adminHistory, adminTab, adminMoreScreen]);

  /* --- Actions --- */
  const openChatFromChatList = (ticketId: string, channelId: string, serviceName: string) => {
    setActiveTicketId(ticketId); setActiveChannelId(channelId); setActiveServiceName(serviceName); setChatRatingShown(false);
    role === "client" ? navigateClientTab("chat") : navigateAdminTab("chat");
    if (authState.isAuthenticated) loadMessages(ticketId);
  };
  const openChannelServices = (channelId: string) => { setActiveChannelId(channelId); setServiceSubTab("services"); navigateClientTab("services"); };
  const openServiceChat = (service: Service) => { setActiveServiceName(service.name); setChatRatingShown(false); navigateClientTab("chat"); };
  const openClientChatFromHistory = (ticketId: string) => {
    setActiveTicketId(ticketId); const t = tickets.find((t) => t.id === ticketId); if (t) setActiveServiceName(t.title); setChatRatingShown(false); navigateClientTab("chat");
  };
  const openAdminChat = (ticketId: string) => { setActiveTicketId(ticketId); navigateAdminTab("chat"); if (authState.isAuthenticated) loadMessages(ticketId); };
  const openReview = (channelId: string) => { setReviewingChannelId(channelId); setReviewStars(0); setReviewComment(""); };
  const openAdFromChat = (channelId: string, title: string) => { setActiveChannelId(channelId); setActiveServiceName(title); setChatRatingShown(false); navigateClientTab("chat"); };

  /* --- Messaging --- */
  const sendMessage = useCallback(() => {
    const trimmed = composer.trim(); if (!trimmed) return;
    const isAdmin = role === "admin";
    addMessage({ id: `m-${Date.now()}`, author: isAdmin ? "agent" : "customer", text: trimmed, time: "сейчас", type: "text" });
    setComposer(""); setStickerPanelOpen(false); setAttachMenuOpen(false);
    getTelegram()?.HapticFeedback?.impactOccurred("light");
    if (authState.isAuthenticated && activeTicketId) sendMessageToApi(activeTicketId, trimmed); else scheduleAutoReply(isAdmin);
    if (!isAdmin && !chatRatingShown) {
      if (chatRatingTimerRef.current) window.clearTimeout(chatRatingTimerRef.current);
      chatRatingTimerRef.current = window.setTimeout(() => setChatRatingShown(true), 3000);
    }
  }, [composer, role, chatRatingShown, scheduleAutoReply, authState.isAuthenticated, activeTicketId, sendMessageToApi, addMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") { e.preventDefault(); sendMessage(); } };
  const insertQuickReply = (text: string) => { setComposer(text); composerInputRef.current?.focus(); };
  const insertTemplate = (text: string) => { setComposer(text); };

  const sendSticker = useCallback((emoji: string) => {
    const isAdmin = role === "admin";
    addMessage({ id: `m-${Date.now()}`, author: isAdmin ? "agent" : "customer", text: "", time: "сейчас", type: "sticker", sticker: emoji });
    setStickerPanelOpen(false); getTelegram()?.HapticFeedback?.impactOccurred("light"); scheduleAutoReply(isAdmin);
  }, [role, scheduleAutoReply, addMessage]);

  const sendAttachment = useCallback((kind: "photo" | "file" | "location") => {
    const isAdmin = role === "admin";
    const base = { id: `m-${Date.now()}`, author: (isAdmin ? "agent" : "customer") as "agent" | "customer", time: "сейчас" };
    const msg: Message = kind === "photo" ? { ...base, text: "", type: "image", imageUrl: "", imageName: "photo.jpg" }
      : kind === "file" ? { ...base, text: "", type: "file", fileName: "document.pdf", fileSize: "2.4 MB" }
      : { ...base, text: "Геолокация: 55.751244, 37.618423", type: "text" };
    addMessage(msg); setAttachMenuOpen(false); getTelegram()?.HapticFeedback?.impactOccurred("light"); scheduleAutoReply(isAdmin);
  }, [role, scheduleAutoReply, addMessage]);

  const handleCameraClick = useCallback(() => { showToast("Камера недоступна в демо"); setAttachMenuOpen(false); }, [showToast]);

  /* --- Auth --- */
  const handleDevLogin = useCallback(async (telegramId: number) => {
    setAuthError(null);
    try { await authState.devLogin(telegramId); setRole(useAuthStore.getState().role === "CUSTOMER" ? "client" : "admin"); setIsAuthScreen(false); }
    catch { setAuthError("Не удалось войти. Проверьте, что бэкенд запущен."); }
  }, [authState]);

  /* --- Effects --- */
  useEffect(() => { if (authState.isAuthenticated && authState.activeWorkspaceId && !isAuthScreen) loadTickets(); }, [authState.isAuthenticated, authState.activeWorkspaceId, isAuthScreen, loadTickets]);

  useEffect(() => { const tg = getTelegram(); if (!tg) return; tg.ready(); tg.expand(); tg.setHeaderColor?.("#0e1621"); tg.setBackgroundColor?.("#0e1621"); }, []);

  useEffect(() => {
    const tg = getTelegram(); if (!tg) return;
    const needsBack = (role === "client" && clientTab !== "catalog" && clientTab !== "chats") || (role === "admin" && (adminTab !== "dashboard" && adminTab !== "chats" || adminMoreScreen !== "menu"));
    if (needsBack) { tg.BackButton.show(); const h = () => goBack(); tg.BackButton.onClick(h); return () => tg.BackButton.offClick(h); }
    tg.BackButton.hide();
  }, [role, clientTab, adminTab, adminMoreScreen, goBack]);

  useEffect(() => { document.documentElement.setAttribute("data-theme", themeMode); }, [themeMode]);
  useEffect(() => { document.documentElement.style.setProperty("--accent-override", accentColor); }, [accentColor]);
  useEffect(() => { return () => { cleanupToast(); if (chatRatingTimerRef.current) window.clearTimeout(chatRatingTimerRef.current); voiceRec.cleanupRecording(); voicePlay.cleanupPlayback(); }; }, []);
  useEffect(() => { if (!isChat) { setStickerPanelOpen(false); setAttachMenuOpen(false); if (voiceRec.isRecording) voiceRec.cancelRecording(); } }, [isChat, voiceRec.isRecording, voiceRec.cancelRecording]);

  /* --- Shared composer props --- */
  const chatComposerProps = {
    composer, setComposer,
    isRecording: voiceRec.isRecording, recordingTime: voiceRec.recordingTime, isCancelHinted: voiceRec.isCancelHinted,
    stickerPanelOpen, stickerCategoryIdx, attachMenuOpen, composerInputRef, recordingStartXRef: voiceRec.recordingStartXRef,
    onSendMessage: sendMessage, onKeyDown: handleKeyDown,
    onStartRecording: voiceRec.startRecording, onStopRecordingAndSend: voiceRec.stopRecordingAndSend, onCancelRecording: voiceRec.cancelRecording,
    onSetIsCancelHinted: voiceRec.setIsCancelHinted,
    onSetStickerPanelOpen: setStickerPanelOpen as (v: boolean | ((prev: boolean) => boolean)) => void,
    onSetStickerCategoryIdx: setStickerCategoryIdx,
    onSetAttachMenuOpen: setAttachMenuOpen as (v: boolean | ((prev: boolean) => boolean)) => void,
    onSendSticker: sendSticker, onSendAttachment: sendAttachment, onCameraClick: handleCameraClick,
  };

  /* --- Render content --- */
  const renderContent = () => {
    if (role === "client") {
      switch (clientTab) {
        case "catalog": return <CatalogPage channels={filteredChannels} channelFilter={channelFilter} channelRatings={channelRatings} onFilterChange={setChannelFilter} onOpenChannelServices={openChannelServices} onOpenReview={openReview} />;
        case "services": return <ServicesPage activeChannel={activeChannel} activeChannelId={activeChannelId} activeServices={activeServices} channelAdsForActive={channelAdsForActive} serviceSubTab={serviceSubTab} channelRatings={channelRatings} onGoBack={goBack} onSetServiceSubTab={setServiceSubTab} onOpenServiceChat={openServiceChat} onOpenReview={openReview} onOpenAdFromChat={openAdFromChat} />;
        case "chats": return <ChatListPage tickets={tickets} chatListQuery={chatListQuery} onQueryChange={setChatListQuery} onOpenChat={openChatFromChatList} />;
        case "chat": return <ClientChatPage activeChannel={activeChannel} activeChannelId={activeChannelId} activeServiceName={activeServiceName} messages={messages} messagesLoading={messagesLoading} isTyping={isTyping} playingMessageId={voicePlay.playingMessageId} playbackTime={voicePlay.playbackTime} onTogglePlayVoice={voicePlay.togglePlayVoice} chatRatingShown={chatRatingShown} onRateChannel={rateChannel} onOpenReview={openReview} onDismissChatRating={() => setChatRatingShown(false)} onGoBack={goBack} quickReplies={quickReplies} onInsertQuickReply={insertQuickReply} {...chatComposerProps} />;
        case "profile": return <ProfilePage tickets={tickets} filteredHistory={filteredHistory} historyFilter={historyFilter} activeChannelId={activeChannelId} onHistoryFilterChange={setHistoryFilter} onOpenChatFromHistory={openClientChatFromHistory} onOpenReview={openReview} showToast={showToast} />;
      }
    } else {
      switch (adminTab) {
        case "dashboard": return <DashboardPage tickets={tickets} onOpenAdminChat={openAdminChat} />;
        case "tickets": return <TicketsPage filteredTickets={filteredTickets} activeTicketId={activeTicketId} ticketQuery={ticketQuery} ticketFilter={ticketFilter} ticketSort={ticketSort} onQueryChange={setTicketQuery} onFilterChange={setTicketFilter} onSortChange={setTicketSort} onOpenAdminChat={openAdminChat} />;
        case "chats": return <AdminChatListPage tickets={tickets} chatListQuery={chatListQuery} onQueryChange={setChatListQuery} onOpenChat={openChatFromChatList} />;
        case "chat": return <AdminChatPage activeTicket={activeTicket} messages={messages} messagesLoading={messagesLoading} isTyping={isTyping} playingMessageId={voicePlay.playingMessageId} playbackTime={voicePlay.playbackTime} onTogglePlayVoice={voicePlay.togglePlayVoice} onGoBack={goBack} quickReplies={quickReplies} onInsertQuickReply={insertQuickReply} onInsertTemplate={insertTemplate} {...chatComposerProps} />;
        case "more": return <MorePage adminMoreScreen={adminMoreScreen} themeMode={themeMode} accentColor={accentColor} onSetAdminMoreScreen={setAdminMoreScreen} onSetThemeMode={setThemeMode} onSetAccentColor={setAccentColor} showToast={showToast} />;
      }
    }
  };

  if (isAuthScreen) {
    return <AuthScreen isLoading={authState.isLoading} authError={authError} onDevLogin={handleDevLogin} onSkip={() => setIsAuthScreen(false)} />;
  }

  return (
    <AppShell isChat={isChat} toast={toast}>
      <ReviewOverlay channel={reviewingChannel} reviewStars={reviewStars} reviewComment={reviewComment} onSetReviewStars={setReviewStars} onSetReviewComment={setReviewComment} onSubmit={submitReview} onClose={() => { setReviewingChannelId(null); setReviewStars(0); setReviewComment(""); }} />
      {!isChat && <TopBar isAuthenticated={authState.isAuthenticated} firstName={authState.user?.firstName} role={role} onRoleChange={setRole} onLogout={() => { authState.logout(); setIsAuthScreen(true); }} />}
      <main className={`main ${isChat ? "main--chat" : ""}`}>{renderContent()}</main>
      {!isChat && <BottomNav role={role} clientTab={clientTab} adminTab={adminTab} adminMoreScreen={adminMoreScreen} onClientTabChange={(tab) => { if (tab === clientTab) return; setClientHistory([]); setClientTab(tab); }} onAdminTabChange={(tab) => { if (tab === adminTab && adminMoreScreen === "menu") return; setAdminHistory([]); setAdminTab(tab); setAdminMoreScreen("menu"); }} />}
    </AppShell>
  );
}
