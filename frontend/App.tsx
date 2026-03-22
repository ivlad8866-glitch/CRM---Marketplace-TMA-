import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ================================================================
   Dev-mode detection: no Telegram SDK = running in browser for demo
   ================================================================ */
const IS_DEV = !window.Telegram?.WebApp?.initData;

/* ================================================================
   Types
   ================================================================ */
type ClientTab = "catalog" | "services" | "chats" | "chat" | "profile";
type AdminTab = "dashboard" | "tickets" | "chats" | "chat" | "more";
type AdminMoreScreen =
  | "menu"
  | "services"
  | "templates"
  | "team"
  | "settings";

type ServiceSubTab = "services" | "ads";

type TicketStatus =
  | "new"
  | "in_progress"
  | "waiting_customer"
  | "resolved"
  | "closed"
  | "spam"
  | "duplicate";

type Ticket = {
  id: string;
  clientNumber: string;
  title: string;
  status: TicketStatus;
  lastMessage: string;
  updatedAt: string;
  slaMinutes: number;
  service: string;
};

type MessageType = "text" | "voice" | "sticker" | "image" | "file";

type Message = {
  id: string;
  author: "customer" | "agent" | "system";
  text: string;
  time: string;
  type: MessageType;
  voiceDuration?: number;
  voiceUrl?: string;
  sticker?: string;
  imageUrl?: string;
  imageName?: string;
  fileName?: string;
  fileSize?: string;
};

type Service = {
  id: string;
  name: string;
  description: string;
  sla: number;
  agents: number;
  price?: number | null;
  currency?: string;
};

type Channel = {
  id: string;
  name: string;
  type: "Mini App" | "Bot" | "Канал" | "Провайдер";
  description: string;
  owner: string;
  icon: string;
  color: string;
  services: Service[];
  rating: number;
  reviewCount: number;
};

type Ad = {
  id: string;
  channelId: string;
  channelName: string;
  channelIcon: string;
  channelColor: string;
  title: string;
  description: string;
  image: string;
  price: number | null;
  currency: string;
  link: string;
};

type StickerCategory = {
  icon: string;
  label: string;
  stickers: string[];
};

/* ================================================================
   Sticker data
   ================================================================ */
const stickerCategories: StickerCategory[] = [
  {
    icon: "\u{1F60A}",
    label: "Смайлы",
    stickers: [
      "\u{1F600}", "\u{1F602}", "\u{1F979}", "\u{1F60D}", "\u{1F914}", "\u{1F60E}", "\u{1F973}", "\u{1F622}",
      "\u{1F621}", "\u{1F92F}", "\u{1FAE1}", "\u{1F634}", "\u{1F911}", "\u{1F631}", "\u{1F47B}", "\u{1F480}",
      "\u{1F916}", "\u{1F47D}", "\u{1F383}", "\u2764\uFE0F", "\u{1F525}", "\u2B50", "\u{1F4AF}", "\u2728",
    ],
  },
  {
    icon: "\u{1F44B}",
    label: "Жесты",
    stickers: [
      "\u{1F44D}", "\u{1F44E}", "\u{1F91D}", "\u270C\uFE0F", "\u{1F91E}", "\u{1FAF6}", "\u{1F44F}", "\u{1F64F}",
      "\u{1F4AA}", "\u{1F44A}", "\u{1F919}", "\u{1F590}\uFE0F", "\u270B", "\u{1FAF0}", "\u{1F90C}", "\u{1F90F}",
      "\u{1F448}", "\u{1F449}", "\u{1F446}", "\u{1F447}", "\u261D\uFE0F", "\u{1FAF5}",
    ],
  },
  {
    icon: "\u{1F431}",
    label: "Животные",
    stickers: [
      "\u{1F436}", "\u{1F431}", "\u{1F42D}", "\u{1F439}", "\u{1F430}", "\u{1F98A}", "\u{1F43B}", "\u{1F43C}",
      "\u{1F428}", "\u{1F42F}", "\u{1F981}", "\u{1F42E}", "\u{1F437}", "\u{1F438}", "\u{1F435}", "\u{1F414}",
      "\u{1F427}", "\u{1F426}", "\u{1F98B}", "\u{1F41D}",
    ],
  },
  {
    icon: "\u{1F355}",
    label: "Еда",
    stickers: [
      "\u{1F355}", "\u{1F354}", "\u{1F35F}", "\u{1F32D}", "\u{1F37F}", "\u{1F9C1}", "\u{1F370}", "\u{1F369}",
      "\u{1F36A}", "\u2615", "\u{1F37A}", "\u{1F964}", "\u{1F34E}", "\u{1F34A}", "\u{1F34B}", "\u{1F347}",
      "\u{1F349}", "\u{1F951}", "\u{1F32E}", "\u{1F363}",
    ],
  },
];

/* ================================================================
   Demo data
   ================================================================ */
const demoTickets: Ticket[] = [
  {
    id: "T-2026-000142",
    clientNumber: "C-000042",
    title: "Консультация по заказу",
    status: "new",
    lastMessage: "Можно уточнить сроки доставки?",
    updatedAt: "2 мин назад",
    slaMinutes: 4,
    service: "Консультация",
  },
  {
    id: "T-2026-000141",
    clientNumber: "C-000018",
    title: "Возврат платежа",
    status: "waiting_customer",
    lastMessage: "Нужен чек или можно по номеру?",
    updatedAt: "7 мин назад",
    slaMinutes: 12,
    service: "Возвраты",
  },
  {
    id: "T-2026-000139",
    clientNumber: "C-000005",
    title: "Запись на услугу",
    status: "in_progress",
    lastMessage: "Подскажите удобное время",
    updatedAt: "24 мин назад",
    slaMinutes: 1,
    service: "Запись",
  },
];

const demoMessages: Message[] = [
  {
    id: "m-1",
    author: "system",
    text: "Оператор Маруся подключилась",
    time: "09:41",
    type: "text",
  },
  {
    id: "m-2",
    author: "customer",
    text: "Привет! Нужна помощь по заказу.",
    time: "09:42",
    type: "text",
  },
  {
    id: "m-3",
    author: "agent",
    text: "Здравствуйте! Сейчас всё проверю, оставайтесь на связи.",
    time: "09:43",
    type: "text",
  },
  {
    id: "m-4",
    author: "customer",
    text: "",
    time: "09:44",
    type: "voice",
    voiceDuration: 12,
    voiceUrl: "",
  },
  {
    id: "m-5",
    author: "agent",
    text: "",
    time: "09:45",
    type: "sticker",
    sticker: "\u{1F44D}",
  },
];

const quickReplies = [
  "Проверяю детали по заказу",
  "Отправьте номер бронирования",
  "Сейчас подключу специалиста",
  "Могу предложить два варианта решения",
];

const systemNotes = [
  "Клиент из VIP сегмента",
  "Последний контакт: 2 дня назад",
  "Важная тема: платеж",
];

const demoServices = [
  { name: "Консультация", startParam: "consult_42", shortName: "support" },
  { name: "Возвраты", startParam: "refund_18", shortName: "refund" },
];

const demoTemplates = [
  {
    id: "macro-01",
    title: "Первичный ответ",
    text: "Здравствуйте! Я уточню детали и вернусь в течение 5 минут.",
  },
  {
    id: "macro-02",
    title: "Запрос данных",
    text: "Пожалуйста, пришлите номер заказа или чек, чтобы я проверил статус.",
  },
  {
    id: "macro-03",
    title: "Закрытие тикета",
    text: "Вопрос решен. Если понадобится помощь, напишите нам в любой момент.",
  },
];

const demoChannels: Channel[] = [
  {
    id: "ch-01",
    name: "OptiCore Support",
    type: "Mini App",
    description: "Консультации по заказам и логистике.",
    owner: "@opticore",
    icon: "O",
    color: "#5288c1",
    rating: 0,
    reviewCount: 0,
    services: [
      {
        id: "srv-01",
        name: "Консультация",
        description: "Вопросы по заказу, доставке, статусу.",
        sla: 4,
        agents: 3,
        price: null,
        currency: "RUB",
      },
      {
        id: "srv-02",
        name: "Возвраты",
        description: "Проверка платежей и возврат средств.",
        sla: 6,
        agents: 2,
        price: null,
        currency: "RUB",
      },
      {
        id: "srv-03",
        name: "Экспресс-разбор",
        description: "Срочный анализ проблемы с приоритетом.",
        sla: 2,
        agents: 1,
        price: 490,
        currency: "RUB",
      },
    ],
  },
  {
    id: "ch-02",
    name: "Unicorn Studio",
    type: "Bot",
    description: "Быстрая помощь по цифровым услугам.",
    owner: "@unicornstudio",
    icon: "U",
    color: "#9b59b6",
    rating: 0,
    reviewCount: 0,
    services: [
      {
        id: "srv-04",
        name: "Запись на услугу",
        description: "Подбор времени и бронирование.",
        sla: 5,
        agents: 4,
        price: null,
        currency: "RUB",
      },
      {
        id: "srv-05",
        name: "Техподдержка",
        description: "Проблемы с доступом или оплатой.",
        sla: 3,
        agents: 5,
        price: null,
        currency: "RUB",
      },
      {
        id: "srv-06",
        name: "Персональный дизайн",
        description: "Индивидуальная разработка макета.",
        sla: 10,
        agents: 2,
        price: 2500,
        currency: "RUB",
      },
    ],
  },
  {
    id: "ch-03",
    name: "Nebula Care",
    type: "Провайдер",
    description: "Премиальная поддержка и VIP-каналы.",
    owner: "@nebulacare",
    icon: "N",
    color: "#e67e22",
    rating: 0,
    reviewCount: 0,
    services: [
      {
        id: "srv-07",
        name: "VIP линия",
        description: "Срочный контакт с агентом.",
        sla: 2,
        agents: 6,
        price: 1200,
        currency: "RUB",
      },
      {
        id: "srv-08",
        name: "Базовая поддержка",
        description: "Стандартная консультация.",
        sla: 8,
        agents: 3,
        price: null,
        currency: "RUB",
      },
    ],
  },
];

const demoAds: Ad[] = [
  {
    id: "ad-01",
    channelId: "ch-01",
    channelName: "OptiCore Support",
    channelIcon: "O",
    channelColor: "#5288c1",
    title: "Экспресс-разбор проблемы за 490 \u20BD",
    description:
      "Не можете разобраться с заказом? Наши специалисты проведут срочный анализ вашей проблемы с максимальным приоритетом. Ответ гарантирован в течение 2 минут. Оплата через Telegram Stars или банковскую карту. Подходит для срочных вопросов по доставке, возвратам и статусу заказов.",
    image: "",
    price: 490,
    currency: "RUB",
    link: "consult_42",
  },
  {
    id: "ad-02",
    channelId: "ch-01",
    channelName: "OptiCore Support",
    channelIcon: "O",
    channelColor: "#5288c1",
    title: "Пакет \"Всё включено\" -- 1 990 \u20BD/мес",
    description:
      "Безлимитные консультации по всем вопросам логистики и заказов. Персональный менеджер, приоритетная очередь, ежемесячный отчёт по обращениям. Первый месяц со скидкой 30% для новых клиентов.",
    image: "",
    price: 1990,
    currency: "RUB",
    link: "all_inclusive",
  },
  {
    id: "ad-03",
    channelId: "ch-02",
    channelName: "Unicorn Studio",
    channelIcon: "U",
    channelColor: "#9b59b6",
    title: "Персональный дизайн от 2 500 \u20BD",
    description:
      "Закажите индивидуальную разработку макета с двумя раундами правок. Результат за 24 часа. Работаем с Figma, Sketch, Adobe XD. Портфолио из 500+ проектов. Идеально для лендингов, презентаций и социальных сетей.",
    image: "",
    price: 2500,
    currency: "RUB",
    link: "design_custom",
  },
  {
    id: "ad-04",
    channelId: "ch-02",
    channelName: "Unicorn Studio",
    channelIcon: "U",
    channelColor: "#9b59b6",
    title: "Аудит UI/UX -- 3 900 \u20BD",
    description:
      "Полный разбор интерфейса вашего приложения или сайта. Подробный отчёт с рекомендациями по улучшению конверсии, юзабилити и визуальной иерархии. Включает анализ мобильной версии и 30-минутный созвон по итогам.",
    image: "",
    price: 3900,
    currency: "RUB",
    link: "uiux_audit",
  },
  {
    id: "ad-05",
    channelId: "ch-03",
    channelName: "Nebula Care",
    channelIcon: "N",
    channelColor: "#e67e22",
    title: "VIP-поддержка \u2014 1 200 \u20BD/мес",
    description:
      "Персональный агент на связи 24/7 с гарантированным SLA 2 минуты. Приоритетная очередь, подробные отчёты по каждому обращению, прямая линия без ожидания. Ежемесячная аналитика активности и рекомендации по оптимизации процессов.",
    image: "",
    price: 1200,
    currency: "RUB",
    link: "vip_line",
  },
];

const statusLabels: Record<string, string> = {
  new: "Новый",
  in_progress: "В работе",
  waiting_customer: "Ждем клиента",
  resolved: "Решен",
  closed: "Закрыт",
  spam: "Спам",
  duplicate: "Дубль",
};

/* Auto-reply text variants */
const agentTextReplies = [
  "Принято, уже проверяю детали по тикету.",
  "Одну секунду, уточню информацию.",
  "Хорошо, передал вопрос специалисту.",
  "Спасибо за обращение, работаем над решением.",
];

const customerTextReplies = [
  "Хорошо, спасибо за ответ!",
  "Понял, жду информацию.",
  "Ок, буду на связи.",
];

const replyStickers = ["\u{1F44D}", "\u{1F44F}", "\u{1F64F}", "\u2764\uFE0F", "\u{1F525}", "\u2728", "\u{1F60A}"];

/* ================================================================
   Telegram helpers
   ================================================================ */
const getTelegram = () => window.Telegram?.WebApp;

/* ================================================================
   Star rating display helper
   ================================================================ */
const formatRating = (r: number, count: number) =>
  `\u2605 ${r.toFixed(1)} (${count})`;

/* ================================================================
   Voice duration formatting helper
   ================================================================ */
const formatVoiceTime = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

/* ================================================================
   App component
   ================================================================ */
export default function App() {
  /* ---------- role & navigation ---------- */
  const [role, setRole] = useState<"client" | "admin">("client");
  const [clientTab, setClientTab] = useState<ClientTab>("catalog");
  const [adminTab, setAdminTab] = useState<AdminTab>("dashboard");
  const [adminMoreScreen, setAdminMoreScreen] =
    useState<AdminMoreScreen>("menu");

  /* ---------- navigation history for back ---------- */
  const [clientHistory, setClientHistory] = useState<ClientTab[]>([]);
  const [adminHistory, setAdminHistory] = useState<AdminTab[]>([]);

  /* ---------- chat state ---------- */
  const [messages, setMessages] = useState<Message[]>(demoMessages);
  const [composer, setComposer] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const composerInputRef = useRef<HTMLInputElement | null>(null);

  /* ---------- voice recording state ---------- */
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isCancelHinted, setIsCancelHinted] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingStartXRef = useRef(0);

  /* ---------- voice playback state ---------- */
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [playbackTime, setPlaybackTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackTimerRef = useRef<number | null>(null);

  /* ---------- sticker panel state ---------- */
  const [stickerPanelOpen, setStickerPanelOpen] = useState(false);
  const [stickerCategoryIdx, setStickerCategoryIdx] = useState(0);

  /* ---------- attachment menu state ---------- */
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);

  /* ---------- selection state ---------- */
  const [activeChannelId, setActiveChannelId] = useState(
    demoChannels[0]?.id ?? ""
  );
  const [activeServiceName, setActiveServiceName] = useState("");
  const [activeTicketId, setActiveTicketId] = useState(
    demoTickets[0]?.id ?? ""
  );

  /* ---------- service sub-tab ---------- */
  const [serviceSubTab, setServiceSubTab] = useState<ServiceSubTab>("services");

  /* ---------- channel ratings ---------- */
  const [channelRatings, setChannelRatings] = useState<
    Record<string, { rating: number; count: number }>
  >(() => {
    const init: Record<string, { rating: number; count: number }> = {};
    for (const ch of demoChannels) {
      init[ch.id] = { rating: ch.rating, count: ch.reviewCount };
    }
    return init;
  });

  /* ---------- review modal ---------- */
  const [reviewingChannelId, setReviewingChannelId] = useState<string | null>(
    null
  );
  const [reviewStars, setReviewStars] = useState(0);
  const [reviewComment, setReviewComment] = useState("");

  /* ---------- chat rating prompt ---------- */
  const [chatRatingShown, setChatRatingShown] = useState(false);
  const chatRatingTimerRef = useRef<number | null>(null);

  /* ---------- profile rating ---------- */
  const [rating, setRating] = useState(4);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  /* ---------- toast ---------- */
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2000);
  }, []);

  /* ---------- ticket queue ---------- */
  const [ticketQuery, setTicketQuery] = useState("");
  const [ticketSort, setTicketSort] = useState<"sla" | "status">("sla");
  const [ticketFilter, setTicketFilter] = useState<
    TicketStatus | "all" | "overdue"
  >("all");

  /* ---------- admin services ---------- */
  const [serviceDraft, setServiceDraft] = useState({
    name: "Консультация",
    startParam: "consult_42",
    shortName: "support",
  });
  const [copied, setCopied] = useState<string | null>(null);

  /* ---------- admin templates ---------- */
  const [macroDraft, setMacroDraft] = useState(demoTemplates[0]);

  /* ---------- channel filter ---------- */
  const [channelFilter, setChannelFilter] = useState<string>("Все");

  /* ---------- history filter ---------- */
  const [historyFilter, setHistoryFilter] = useState<string>("Все");

  /* ---------- theme ---------- */
  const [themeMode, setThemeMode] = useState<"day" | "night">("night");
  const [accentColor, setAccentColor] = useState<string>("#6ab3f3");

  /* ================================================================
     Computed values
     ================================================================ */
  const activeChannel = useMemo(
    () =>
      demoChannels.find((ch) => ch.id === activeChannelId) ?? demoChannels[0],
    [activeChannelId]
  );
  const activeServices = activeChannel?.services ?? [];

  const activeTicket = useMemo(
    () => demoTickets.find((t) => t.id === activeTicketId) ?? demoTickets[0],
    [activeTicketId]
  );

  const filteredChannels = useMemo(() => {
    if (channelFilter === "Все") return demoChannels;
    return demoChannels.filter((ch) => ch.type === channelFilter);
  }, [channelFilter]);

  const filteredTickets = useMemo(() => {
    const normalized = ticketQuery.trim().toLowerCase();
    const byFilter =
      ticketFilter === "all"
        ? demoTickets
        : ticketFilter === "overdue"
          ? demoTickets.filter((t) => t.slaMinutes <= 3)
          : demoTickets.filter((t) => t.status === ticketFilter);
    const byQuery = normalized
      ? byFilter.filter(
          (t) =>
            t.title.toLowerCase().includes(normalized) ||
            t.id.toLowerCase().includes(normalized) ||
            t.clientNumber.toLowerCase().includes(normalized)
        )
      : byFilter;
    if (ticketSort === "status") {
      return [...byQuery].sort((a, b) => a.status.localeCompare(b.status));
    }
    return [...byQuery].sort((a, b) => a.slaMinutes - b.slaMinutes);
  }, [ticketQuery, ticketFilter, ticketSort]);

  const filteredHistory = useMemo(() => {
    if (historyFilter === "Все") return demoTickets;
    if (historyFilter === "Активные")
      return demoTickets.filter(
        (t) => t.status === "new" || t.status === "in_progress"
      );
    return demoTickets.filter(
      (t) => t.status === "resolved" || t.status === "closed"
    );
  }, [historyFilter]);

  const channelAdsForActive = useMemo(
    () => demoAds.filter((ad) => ad.channelId === activeChannelId),
    [activeChannelId]
  );

  const reviewingChannel = useMemo(
    () =>
      reviewingChannelId
        ? demoChannels.find((ch) => ch.id === reviewingChannelId) ?? null
        : null,
    [reviewingChannelId]
  );

  /* ================================================================
     Rating helper
     ================================================================ */
  const rateChannel = useCallback(
    (channelId: string, stars: number) => {
      setChannelRatings((prev) => {
        const old = prev[channelId] ?? { rating: 0, count: 0 };
        const newCount = old.count + 1;
        const newRating = (old.rating * old.count + stars) / newCount;
        return {
          ...prev,
          [channelId]: { rating: newRating, count: newCount },
        };
      });
      showToast("Спасибо за оценку!");
    },
    [showToast]
  );

  const submitReview = useCallback(() => {
    if (!reviewingChannelId || reviewStars === 0) return;
    rateChannel(reviewingChannelId, reviewStars);
    setReviewingChannelId(null);
    setReviewStars(0);
    setReviewComment("");
  }, [reviewingChannelId, reviewStars, rateChannel]);

  /* ================================================================
     Navigation helpers
     ================================================================ */
  const navigateClientTab = useCallback(
    (tab: ClientTab) => {
      setClientHistory((prev) => [...prev, clientTab]);
      setClientTab(tab);
    },
    [clientTab]
  );

  const navigateAdminTab = useCallback(
    (tab: AdminTab) => {
      setAdminHistory((prev) => [...prev, adminTab]);
      setAdminTab(tab);
      if (tab !== "more") setAdminMoreScreen("menu");
    },
    [adminTab]
  );

  const goBack = useCallback(() => {
    if (role === "client") {
      if (clientHistory.length > 0) {
        const prev = clientHistory[clientHistory.length - 1];
        setClientHistory((h) => h.slice(0, -1));
        setClientTab(prev);
      }
    } else {
      if (adminMoreScreen !== "menu" && adminTab === "more") {
        setAdminMoreScreen("menu");
        return;
      }
      if (adminHistory.length > 0) {
        const prev = adminHistory[adminHistory.length - 1];
        setAdminHistory((h) => h.slice(0, -1));
        setAdminTab(prev);
      }
    }
  }, [role, clientHistory, adminHistory, adminTab, adminMoreScreen]);

  /* ================================================================
     Actions
     ================================================================ */
  const openChatFromChatList = (ticketId: string, channelId: string, serviceName: string) => {
    setActiveTicketId(ticketId);
    setActiveChannelId(channelId);
    setActiveServiceName(serviceName);
    setChatRatingShown(false);
    if (role === "client") {
      navigateClientTab("chat");
    } else {
      navigateAdminTab("chat");
    }
  };

  const openChannelServices = (channelId: string) => {
    setActiveChannelId(channelId);
    setServiceSubTab("services");
    navigateClientTab("services");
  };

  const openServiceChat = (service: Service) => {
    setActiveServiceName(service.name);
    setChatRatingShown(false);
    navigateClientTab("chat");
  };

  const openClientChatFromHistory = (ticketId: string) => {
    setActiveTicketId(ticketId);
    const ticket = demoTickets.find((t) => t.id === ticketId);
    if (ticket) setActiveServiceName(ticket.title);
    setChatRatingShown(false);
    navigateClientTab("chat");
  };

  const openAdminChat = (ticketId: string) => {
    setActiveTicketId(ticketId);
    navigateAdminTab("chat");
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      showToast("Скопировано");
      window.setTimeout(() => setCopied(null), 1400);
    } catch {
      setCopied("error");
      window.setTimeout(() => setCopied(null), 1400);
    }
  };

  /* ================================================================
     Auto-reply logic (varied: text, voice, sticker)
     ================================================================ */
  const scheduleAutoReply = useCallback(
    (isAdmin: boolean) => {
      setIsTyping(true);
      window.setTimeout(() => {
        const roll = Math.random();
        let replyMsg: Message;
        const replyAuthor = isAdmin ? "customer" : "agent";

        if (roll < 0.55) {
          /* text reply */
          const pool = isAdmin ? customerTextReplies : agentTextReplies;
          replyMsg = {
            id: `m-${Date.now() + 1}`,
            author: replyAuthor,
            text: pool[Math.floor(Math.random() * pool.length)],
            time: "сейчас",
            type: "text",
          };
        } else if (roll < 0.8) {
          /* sticker reply */
          replyMsg = {
            id: `m-${Date.now() + 1}`,
            author: replyAuthor,
            text: "",
            time: "сейчас",
            type: "sticker",
            sticker: replyStickers[Math.floor(Math.random() * replyStickers.length)],
          };
        } else {
          /* voice reply */
          replyMsg = {
            id: `m-${Date.now() + 1}`,
            author: replyAuthor,
            text: "",
            time: "сейчас",
            type: "voice",
            voiceDuration: Math.floor(Math.random() * 25) + 3,
            voiceUrl: "",
          };
        }
        setMessages((prev) => [...prev, replyMsg]);
        setIsTyping(false);
      }, 900);
    },
    []
  );

  const sendMessage = useCallback(() => {
    const trimmed = composer.trim();
    if (!trimmed) return;
    const isAdmin = role === "admin";
    const next: Message = {
      id: `m-${Date.now()}`,
      author: isAdmin ? "agent" : "customer",
      text: trimmed,
      time: "сейчас",
      type: "text",
    };
    setMessages((prev) => [...prev, next]);
    setComposer("");
    setStickerPanelOpen(false);
    setAttachMenuOpen(false);
    const tg = getTelegram();
    tg?.HapticFeedback?.impactOccurred("light");
    scheduleAutoReply(isAdmin);

    /* trigger chat rating prompt for client after a delay */
    if (!isAdmin && !chatRatingShown) {
      if (chatRatingTimerRef.current)
        window.clearTimeout(chatRatingTimerRef.current);
      chatRatingTimerRef.current = window.setTimeout(() => {
        setChatRatingShown(true);
      }, 3000);
    }
  }, [composer, role, chatRatingShown, scheduleAutoReply]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  const insertQuickReply = (text: string) => {
    setComposer(text);
    composerInputRef.current?.focus();
  };

  const insertTemplate = (text: string) => {
    setComposer(text);
  };

  /* ================================================================
     Sticker send
     ================================================================ */
  const sendSticker = useCallback(
    (emoji: string) => {
      const isAdmin = role === "admin";
      const msg: Message = {
        id: `m-${Date.now()}`,
        author: isAdmin ? "agent" : "customer",
        text: "",
        time: "сейчас",
        type: "sticker",
        sticker: emoji,
      };
      setMessages((prev) => [...prev, msg]);
      setStickerPanelOpen(false);
      const tg = getTelegram();
      tg?.HapticFeedback?.impactOccurred("light");
      scheduleAutoReply(isAdmin);
    },
    [role, scheduleAutoReply]
  );

  /* ================================================================
     Attachment send (simulated)
     ================================================================ */
  const sendAttachment = useCallback(
    (kind: "photo" | "file" | "location") => {
      const isAdmin = role === "admin";
      let msg: Message;
      if (kind === "photo") {
        msg = {
          id: `m-${Date.now()}`,
          author: isAdmin ? "agent" : "customer",
          text: "",
          time: "сейчас",
          type: "image",
          imageUrl: "",
          imageName: "photo.jpg",
        };
      } else if (kind === "file") {
        msg = {
          id: `m-${Date.now()}`,
          author: isAdmin ? "agent" : "customer",
          text: "",
          time: "сейчас",
          type: "file",
          fileName: "document.pdf",
          fileSize: "2.4 MB",
        };
      } else {
        msg = {
          id: `m-${Date.now()}`,
          author: isAdmin ? "agent" : "customer",
          text: "Геолокация: 55.751244, 37.618423",
          time: "сейчас",
          type: "text",
        };
      }
      setMessages((prev) => [...prev, msg]);
      setAttachMenuOpen(false);
      const tg = getTelegram();
      tg?.HapticFeedback?.impactOccurred("light");
      scheduleAutoReply(isAdmin);
    },
    [role, scheduleAutoReply]
  );

  /* ================================================================
     Voice recording
     ================================================================ */
  const stopRecordingCleanup = useCallback(() => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
    setRecordingTime(0);
    setIsCancelHinted(false);
  }, []);

  const startRecording = useCallback(async () => {
    /* Check for MediaRecorder support */
    if (typeof MediaRecorder === "undefined") {
      showToast("Браузер не поддерживает запись");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
          ? "audio/ogg;codecs=opus"
          : "";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        /* stream tracks will be stopped by the caller */
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch {
      showToast("Нет доступа к микрофону");
    }
  }, [showToast]);

  const stopRecordingAndSend = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    const duration = recordingTime;
    if (!recorder || recorder.state === "inactive") {
      stopRecordingCleanup();
      return;
    }

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      /* Stop mic tracks */
      recordingStreamRef.current?.getTracks().forEach((t) => t.stop());
      recordingStreamRef.current = null;

      const blob = new Blob(audioChunksRef.current, {
        type: recorder.mimeType || "audio/webm",
      });
      const url = URL.createObjectURL(blob);
      const isAdmin = role === "admin";
      const msg: Message = {
        id: `m-${Date.now()}`,
        author: isAdmin ? "agent" : "customer",
        text: "",
        time: "сейчас",
        type: "voice",
        voiceDuration: Math.max(duration, 1),
        voiceUrl: url,
      };
      setMessages((prev) => [...prev, msg]);
      const tg = getTelegram();
      tg?.HapticFeedback?.impactOccurred("light");
      scheduleAutoReply(isAdmin);
    };

    recorder.stop();
    mediaRecorderRef.current = null;
    stopRecordingCleanup();
  }, [recordingTime, role, stopRecordingCleanup, scheduleAutoReply]);

  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    recordingStreamRef.current?.getTracks().forEach((t) => t.stop());
    recordingStreamRef.current = null;
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    stopRecordingCleanup();
  }, [stopRecordingCleanup]);

  /* ================================================================
     Voice playback
     ================================================================ */
  const togglePlayVoice = useCallback(
    (msg: Message) => {
      /* If currently playing this message, pause it */
      if (playingMessageId === msg.id) {
        audioRef.current?.pause();
        setPlayingMessageId(null);
        if (playbackTimerRef.current) {
          window.clearInterval(playbackTimerRef.current);
          playbackTimerRef.current = null;
        }
        return;
      }

      /* Stop any current playback */
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (playbackTimerRef.current) {
        window.clearInterval(playbackTimerRef.current);
        playbackTimerRef.current = null;
      }

      /* If no real audio URL, simulate playback with timer */
      if (!msg.voiceUrl) {
        setPlayingMessageId(msg.id);
        setPlaybackTime(0);
        const dur = msg.voiceDuration ?? 5;
        playbackTimerRef.current = window.setInterval(() => {
          setPlaybackTime((t) => {
            if (t + 1 >= dur) {
              window.clearInterval(playbackTimerRef.current!);
              playbackTimerRef.current = null;
              setPlayingMessageId(null);
              return 0;
            }
            return t + 1;
          });
        }, 1000);
        return;
      }

      const audio = new Audio(msg.voiceUrl);
      audioRef.current = audio;
      setPlayingMessageId(msg.id);
      setPlaybackTime(0);

      playbackTimerRef.current = window.setInterval(() => {
        setPlaybackTime((t) => t + 1);
      }, 1000);

      audio.onended = () => {
        setPlayingMessageId(null);
        setPlaybackTime(0);
        if (playbackTimerRef.current) {
          window.clearInterval(playbackTimerRef.current);
          playbackTimerRef.current = null;
        }
      };

      audio.play().catch(() => {
        setPlayingMessageId(null);
        showToast("Ошибка воспроизведения");
      });
    },
    [playingMessageId, showToast]
  );

  /* ================================================================
     Effects
     ================================================================ */
  /* Telegram SDK init */
  useEffect(() => {
    const tg = getTelegram();
    if (!tg) return;
    tg.ready();
    tg.expand();
    tg.setHeaderColor?.("#0e1621");
    tg.setBackgroundColor?.("#0e1621");
  }, []);

  /* Telegram BackButton */
  useEffect(() => {
    const tg = getTelegram();
    if (!tg) return;

    const needsBack =
      (role === "client" && clientTab !== "catalog" && clientTab !== "chats") ||
      (role === "admin" && (adminTab !== "dashboard" && adminTab !== "chats" || adminMoreScreen !== "menu"));

    if (needsBack) {
      tg.BackButton.show();
      const handler = () => goBack();
      tg.BackButton.onClick(handler);
      return () => tg.BackButton.offClick(handler);
    }
    tg.BackButton.hide();
    return;
  }, [role, clientTab, adminTab, adminMoreScreen, goBack]);

  /* Auto-scroll chat to bottom */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  /* Apply theme mode */
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", themeMode);
  }, [themeMode]);

  /* Apply accent color */
  useEffect(() => {
    document.documentElement.style.setProperty("--accent-override", accentColor);
  }, [accentColor]);

  /* Cleanup timers and audio on unmount */
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (chatRatingTimerRef.current)
        window.clearTimeout(chatRatingTimerRef.current);
      if (recordingTimerRef.current)
        window.clearInterval(recordingTimerRef.current);
      if (playbackTimerRef.current)
        window.clearInterval(playbackTimerRef.current);
      /* Stop any mic streams */
      recordingStreamRef.current?.getTracks().forEach((t) => t.stop());
      /* Pause audio */
      audioRef.current?.pause();
    };
  }, []);

  /* Close sticker panel / attachment menu when navigating away from chat */
  const isClientChat = role === "client" && clientTab === "chat";
  const isAdminChat = role === "admin" && adminTab === "chat";
  const isChat = isClientChat || isAdminChat;

  /* Chat list search */
  const [chatListQuery, setChatListQuery] = useState("");

  useEffect(() => {
    if (!isChat) {
      setStickerPanelOpen(false);
      setAttachMenuOpen(false);
      if (isRecording) cancelRecording();
    }
  }, [isChat, isRecording, cancelRecording]);

  /* ================================================================
     Render helpers
     ================================================================ */
  const renderStarRatingInline = (
    channelId: string,
    size?: "sm" | "md"
  ) => {
    const info = channelRatings[channelId] ?? { rating: 0, count: 0 };
    return (
      <span className={`star-inline ${size === "sm" ? "star-inline--sm" : ""}`}>
        {formatRating(info.rating, info.count)}
      </span>
    );
  };

  const renderChatHeader = () => {
    const title = isAdminChat
      ? activeTicket?.title ?? "Чат"
      : activeServiceName || "Чат поддержки";
    const subtitle = isAdminChat
      ? `${activeTicket?.clientNumber} -- SLA ${activeTicket?.slaMinutes} мин`
      : `${activeChannel?.name ?? "Канал"} -- online`;

    return (
      <div className="chat-header">
        <button
          className="chat-header__back"
          type="button"
          onClick={goBack}
          aria-label="Назад"
        >
          &#8592;
        </button>
        <div className="avatar">
          {isAdminChat
            ? (activeTicket?.clientNumber ?? "C").replace("C-", "").slice(0, 2)
            : "S"}
        </div>
        <div className="chat-header__info">
          <div className="chat-header__name">{title}</div>
          <div className="chat-header__status">{subtitle}</div>
        </div>
        {isAdminChat && (
          <div className="chat-header__actions">
            <span className={`badge badge--${activeTicket?.status}`}>
              {statusLabels[activeTicket?.status ?? "new"]}
            </span>
          </div>
        )}
      </div>
    );
  };

  /* ---------- render single message bubble ---------- */
  const renderBubble = (msg: Message) => {
    /* Sticker message */
    if (msg.type === "sticker" && msg.sticker) {
      return (
        <div
          key={msg.id}
          className={`bubble-sticker bubble-sticker--${msg.author}`}
        >
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
        <div
          key={msg.id}
          className={`bubble bubble--${msg.author} bubble--voice`}
        >
          <div className="voice-bubble">
            <button
              className="voice-bubble__play"
              type="button"
              onClick={() => togglePlayVoice(msg)}
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
        <div
          key={msg.id}
          className={`bubble bubble--${msg.author} bubble--image`}
        >
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
        <div
          key={msg.id}
          className={`bubble bubble--${msg.author} bubble--file`}
        >
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
      <div key={msg.id} className={`bubble bubble--${msg.author}`}>
        <span>{msg.text}</span>
        <small>{msg.time}</small>
      </div>
    );
  };

  const renderChatBody = () => (
    <div className="chat-body">
      <div className="chat-day">Сегодня</div>
      {messages.map((msg) => renderBubble(msg))}
      {isTyping && (
        <div className="bubble bubble--agent bubble--typing">
          <span className="typing">
            <i />
            <i />
            <i />
          </span>
        </div>
      )}
      {/* Chat rating prompt for client */}
      {isClientChat && chatRatingShown && (
        <div className="chat-rating-prompt">
          <span>Оцените канал</span>
          <div className="chat-rating-prompt__stars">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                className="chat-rating-prompt__star"
                type="button"
                onClick={() => {
                  rateChannel(activeChannelId, s);
                  setChatRatingShown(false);
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
              setReviewingChannelId(activeChannelId);
              setReviewStars(0);
              setReviewComment("");
              setChatRatingShown(false);
            }}
          >
            Оставить отзыв
          </button>
        </div>
      )}
      <div ref={chatEndRef} />
    </div>
  );

  const renderQuickReplies = () => (
    <div className="quick-replies">
      {quickReplies.map((reply) => (
        <button
          key={reply}
          className="quick-reply"
          type="button"
          onClick={() => insertQuickReply(reply)}
        >
          {reply}
        </button>
      ))}
    </div>
  );

  /* ---------- Sticker panel ---------- */
  const renderStickerPanel = () => {
    if (!stickerPanelOpen) return null;
    const category = stickerCategories[stickerCategoryIdx];
    return (
      <div className="sticker-panel">
        <div className="sticker-panel__tabs">
          {stickerCategories.map((cat, idx) => (
            <button
              key={cat.label}
              className={`sticker-panel__tab ${idx === stickerCategoryIdx ? "sticker-panel__tab--active" : ""}`}
              type="button"
              onClick={() => setStickerCategoryIdx(idx)}
              aria-label={cat.label}
            >
              {cat.icon}
            </button>
          ))}
        </div>
        <div className="sticker-panel__grid">
          {category.stickers.map((s) => (
            <button
              key={s}
              className="sticker-panel__item"
              type="button"
              onClick={() => sendSticker(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  };

  /* ---------- Attachment bottom sheet ---------- */
  const renderAttachMenu = () => {
    if (!attachMenuOpen) return null;
    return (
      <div className="attach-sheet-overlay" onClick={() => setAttachMenuOpen(false)}>
        <div className="attach-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="attach-sheet__grid">
            <button
              className="attach-sheet__item"
              type="button"
              onClick={() => sendAttachment("photo")}
            >
              <span className="attach-sheet__icon" style={{ background: "rgba(106,179,243,0.2)", color: "var(--accent)" }}>{"\u{1F4F7}"}</span>
              <span>Фото</span>
            </button>
            <button
              className="attach-sheet__item"
              type="button"
              onClick={() => sendAttachment("file")}
            >
              <span className="attach-sheet__icon" style={{ background: "rgba(77,205,94,0.2)", color: "var(--green)" }}>{"\u{1F4C4}"}</span>
              <span>Файл</span>
            </button>
            <button
              className="attach-sheet__item"
              type="button"
              onClick={() => {
                showToast("Камера недоступна в демо");
                setAttachMenuOpen(false);
              }}
            >
              <span className="attach-sheet__icon" style={{ background: "rgba(230,126,34,0.2)", color: "#e67e22" }}>{"\u{1F4F9}"}</span>
              <span>Камера</span>
            </button>
            <button
              className="attach-sheet__item"
              type="button"
              onClick={() => sendAttachment("location")}
            >
              <span className="attach-sheet__icon" style={{ background: "rgba(155,89,182,0.2)", color: "#9b59b6" }}>{"\u{1F4CD}"}</span>
              <span>Геолокация</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ---------- Composer (Telegram-style) ---------- */
  const renderComposer = () => {
    /* Recording state */
    if (isRecording) {
      return (
        <div className="composer composer--recording">
          <div className="recording-bar">
            <span className="recording-bar__dot" />
            <span className="recording-bar__label">
              Запись... {formatVoiceTime(recordingTime)}
            </span>
            <button
              className="recording-bar__cancel"
              type="button"
              onClick={cancelRecording}
            >
              {"\u2190"} Отмена
            </button>
          </div>
        </div>
      );
    }

    const hasText = composer.trim().length > 0;

    return (
      <>
        {renderAttachMenu()}
        {renderStickerPanel()}
        <div className="composer">
          {/* Pill-shaped input field */}
          <div className="composer__field">
            <button
              className="composer__field-btn"
              type="button"
              aria-label="Прикрепить"
              onClick={() => {
                setAttachMenuOpen((v) => !v);
                setStickerPanelOpen(false);
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
                  setStickerPanelOpen(false);
                }
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                setAttachMenuOpen(false);
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
                setStickerPanelOpen((v) => !v);
                setAttachMenuOpen(false);
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
            onClick={hasText ? sendMessage : undefined}
            onPointerDown={!hasText ? (e) => {
              recordingStartXRef.current = e.clientX;
              startRecording();
            } : undefined}
            onPointerUp={!hasText ? () => {
              if (isRecording && !isCancelHinted) {
                stopRecordingAndSend();
              } else if (isCancelHinted) {
                cancelRecording();
              }
            } : undefined}
            onPointerMove={!hasText ? (e) => {
              if (isRecording) {
                const dx = recordingStartXRef.current - e.clientX;
                setIsCancelHinted(dx > 60);
              }
            } : undefined}
            onPointerLeave={!hasText ? () => {
              if (isRecording && !isCancelHinted) {
                stopRecordingAndSend();
              } else if (isRecording && isCancelHinted) {
                cancelRecording();
              }
            } : undefined}
          >
            {hasText ? "\u27A4" : "\u{1F3A4}"}
          </button>
        </div>
      </>
    );
  };

  /* ================================================================
     Review overlay
     ================================================================ */
  const renderReviewOverlay = () => {
    if (!reviewingChannel) return null;
    return (
      <div className="review-overlay" onClick={() => setReviewingChannelId(null)}>
        <div className="review-modal" onClick={(e) => e.stopPropagation()}>
          <div className="review-modal__header">
            <div
              className="channel-icon"
              style={{ background: reviewingChannel.color }}
            >
              {reviewingChannel.icon}
            </div>
            <strong>{reviewingChannel.name}</strong>
          </div>
          <div className="review-modal__stars">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                className={`star ${reviewStars >= s ? "star--on" : ""}`}
                type="button"
                onClick={() => setReviewStars(s)}
                aria-label={`${s} звезд`}
              >
                &#9733;
              </button>
            ))}
          </div>
          <textarea
            className="rating-comment"
            placeholder="Ваш комментарий"
            rows={3}
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
          />
          <div className="review-modal__actions">
            <button
              className="btn btn--primary btn--block"
              type="button"
              disabled={reviewStars === 0}
              onClick={submitReview}
            >
              Отправить отзыв
            </button>
            <button
              className="btn btn--ghost btn--block"
              type="button"
              onClick={() => {
                setReviewingChannelId(null);
                setReviewStars(0);
                setReviewComment("");
              }}
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ================================================================
     CLIENT SCREENS
     ================================================================ */
  const renderClientCatalog = () => (
    <div className="screen" key="client-catalog">
      <div className="screen__header">
        <h2>Каталог каналов</h2>
        <p>Mini Apps, боты и провайдеры услуг</p>
      </div>
      <div className="filter-chips">
        {["Все", "Mini App", "Bot", "Провайдер"].map((f) => (
          <button
            key={f}
            className={`chip ${channelFilter === f ? "chip--active" : ""}`}
            type="button"
            onClick={() => setChannelFilter(f)}
          >
            {f === "Bot" ? "Боты" : f === "Провайдер" ? "Провайдеры" : f}
          </button>
        ))}
      </div>
      <div className="card-list">
        {filteredChannels.map((ch) => (
          <div key={ch.id} className="channel-card-wrapper">
            <button
              className="channel-card"
              type="button"
              onClick={() => openChannelServices(ch.id)}
            >
              <div className="channel-card__row">
                <div
                  className="channel-icon"
                  style={{ background: ch.color }}
                >
                  {ch.icon}
                </div>
                <div className="channel-card__body">
                  <div className="channel-card__top">
                    <span className="badge">{ch.type}</span>
                    <span className="pill">{ch.services.length} услуг</span>
                  </div>
                  <div className="channel-card__name-row">
                    <strong className="channel-card__name">{ch.name}</strong>
                    {renderStarRatingInline(ch.id, "sm")}
                  </div>
                  <p className="channel-card__desc">{ch.description}</p>
                  <div className="channel-card__owner">{ch.owner}</div>
                </div>
              </div>
            </button>
            <button
              className="channel-card__review-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setReviewingChannelId(ch.id);
                setReviewStars(0);
                setReviewComment("");
              }}
            >
              Оставить отзыв
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderClientServices = () => (
    <div className="screen" key="client-services">
      <div className="screen__header">
        <button className="back-link" type="button" onClick={goBack}>
          &#8592; Назад
        </button>
        <div className="service-channel-header">
          <div
            className="channel-icon"
            style={{ background: activeChannel?.color ?? "#5288c1" }}
          >
            {activeChannel?.icon ?? "?"}
          </div>
          <div>
            <span className="badge badge--new">{activeChannel?.type ?? "Канал"}</span>
            <h2>{activeChannel?.name ?? "Канал"}</h2>
            {renderStarRatingInline(activeChannelId)}
          </div>
        </div>
      </div>

      {/* Sub-tabs: Услуги | Реклама */}
      <div className="sub-tabs">
        <button
          className={`sub-tab ${serviceSubTab === "services" ? "sub-tab--active" : ""}`}
          type="button"
          onClick={() => setServiceSubTab("services")}
        >
          Услуги
        </button>
        <button
          className={`sub-tab ${serviceSubTab === "ads" ? "sub-tab--active" : ""}`}
          type="button"
          onClick={() => setServiceSubTab("ads")}
        >
          Реклама
        </button>
      </div>

      {/* Rate channel button */}
      <button
        className="btn btn--ghost btn--sm"
        type="button"
        style={{ alignSelf: "flex-start" }}
        onClick={() => {
          setReviewingChannelId(activeChannelId);
          setReviewStars(0);
          setReviewComment("");
        }}
      >
        Оценить
      </button>

      {serviceSubTab === "services" ? (
        <>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: 0 }}>
            Выберите услугу, чтобы перейти в чат поддержки.
          </p>
          <div className="card-list">
            {activeServices.map((srv) => (
              <button
                key={srv.id}
                className="service-card"
                type="button"
                onClick={() => openServiceChat(srv)}
              >
                <div className="service-card__header">
                  <strong>{srv.name}</strong>
                  {srv.price ? (
                    <span className="price-tag">
                      {srv.price} {srv.currency === "RUB" ? "\u20BD" : srv.currency}
                    </span>
                  ) : (
                    <span className="price-tag price-tag--free">Бесплатно</span>
                  )}
                </div>
                <p>{srv.description}</p>
                <div className="service-card__meta">
                  <span className="pill">SLA {srv.sla} мин</span>
                  <span className="pill">{srv.agents} агентов</span>
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="card-list" style={{ gap: 12 }}>
          {channelAdsForActive.length === 0 ? (
            <div className="empty-state">
              У канала пока нет рекламных объявлений.
            </div>
          ) : (
            channelAdsForActive.map((ad) => {
              const info = channelRatings[ad.channelId] ?? {
                rating: 0,
                count: 0,
              };
              return (
                <div key={ad.id} className="ad-card">
                  <div className="ad-card__header">
                    <div
                      className="channel-icon channel-icon--sm"
                      style={{ background: ad.channelColor }}
                    >
                      {ad.channelIcon}
                    </div>
                    <span className="ad-card__channel">{ad.channelName}</span>
                    {ad.price && (
                      <span className="price-tag">
                        {ad.price}{" "}
                        {ad.currency === "RUB" ? "\u20BD" : ad.currency}
                      </span>
                    )}
                  </div>
                  <strong className="ad-card__title">{ad.title}</strong>
                  <p className="ad-card__desc">{ad.description}</p>
                  <div className="ad-card__rating">
                    <span className="star-inline star-inline--sm">
                      {formatRating(info.rating, info.count)}
                    </span>
                  </div>
                  <button
                    className="btn btn--primary btn--block"
                    type="button"
                    onClick={() => {
                      setActiveChannelId(ad.channelId);
                      setActiveServiceName(ad.title);
                      setChatRatingShown(false);
                      navigateClientTab("chat");
                    }}
                  >
                    Связаться с продавцом
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );

  /* ---------- Client chat list (Telegram-style) ---------- */
  const renderClientChatList = () => {
    const query = chatListQuery.trim().toLowerCase();
    const chatItems = demoTickets.map((ticket) => {
      const ch = demoChannels.find((c) =>
        c.services.some((s) => s.name === ticket.service)
      ) ?? demoChannels[0];
      return { ticket, channel: ch };
    }).filter((item) =>
      !query ||
      item.ticket.title.toLowerCase().includes(query) ||
      item.channel.name.toLowerCase().includes(query) ||
      item.ticket.lastMessage.toLowerCase().includes(query)
    );

    return (
      <div className="screen" key="client-chats">
        <div className="screen__header">
          <h2>Чаты</h2>
        </div>
        <div className="search-bar">
          <input
            placeholder="Поиск..."
            value={chatListQuery}
            onChange={(e) => setChatListQuery(e.target.value)}
          />
        </div>
        <div className="chat-list">
          {chatItems.length === 0 && (
            <div className="empty-state">Нет активных чатов</div>
          )}
          {chatItems.map(({ ticket, channel }) => (
            <button
              key={ticket.id}
              className="chat-list-item"
              type="button"
              onClick={() => openChatFromChatList(ticket.id, channel.id, ticket.title)}
            >
              <div
                className="channel-icon"
                style={{ background: channel.color }}
              >
                {channel.icon}
              </div>
              <div className="chat-list-item__body">
                <div className="chat-list-item__top">
                  <span className="chat-list-item__name">{channel.name}</span>
                  <span className="chat-list-item__time">{ticket.updatedAt}</span>
                </div>
                <div className="chat-list-item__bottom">
                  <span className="chat-list-item__preview">
                    <strong>{ticket.service}: </strong>{ticket.lastMessage}
                  </span>
                  {ticket.status === "new" && (
                    <span className="chat-list-item__badge">1</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderClientChat = () => (
    <div className="screen screen--chat" key="client-chat">
      {renderChatHeader()}
      {renderQuickReplies()}
      {renderChatBody()}
      {renderComposer()}
    </div>
  );

  const renderClientProfile = () => (
    <div className="screen" key="client-profile">
      <div className="screen__header">
        <h2>Профиль</h2>
      </div>

      {/* User info */}
      <div className="profile-card">
        <div className="avatar avatar--lg">C</div>
        <div className="profile-card__info">
          <strong>@cybercat</strong>
          <span>C-000042 -- ru-RU -- VIP</span>
        </div>
      </div>

      {/* Rating */}
      <div className="section-block">
        <h3>Оцените поддержку</h3>
        <p>Ваш отзыв помогает нам стать лучше.</p>
        <div className="rating">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              className={`star ${rating >= star ? "star--on" : ""}`}
              onClick={() => {
                setRating(star);
                setRatingSubmitted(false);
              }}
              type="button"
              aria-label={`${star} звезд`}
            >
              &#9733;
            </button>
          ))}
        </div>
        <textarea
          className="rating-comment"
          placeholder="Комментарий для команды"
          rows={3}
          value={ratingComment}
          onChange={(e) => setRatingComment(e.target.value)}
        />
        {ratingSubmitted ? (
          <div className="rating__note rating__note--success">
            Спасибо за отзыв!
          </div>
        ) : (
          <button
            className="btn btn--primary btn--block"
            type="button"
            onClick={() => {
              setRatingSubmitted(true);
              showToast("Отзыв отправлен!");
            }}
          >
            Отправить отзыв
          </button>
        )}
      </div>

      {/* History */}
      <div className="section-block">
        <h3>История обращений</h3>
        <div className="filter-chips">
          {["Все", "Активные", "Решенные"].map((f) => (
            <button
              key={f}
              className={`chip ${historyFilter === f ? "chip--active" : ""}`}
              type="button"
              onClick={() => setHistoryFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="ticket-list">
          {filteredHistory.map((ticket) => (
            <div key={ticket.id} className="ticket-item-wrapper">
              <button
                className="ticket-item"
                type="button"
                onClick={() => openClientChatFromHistory(ticket.id)}
              >
                <div className="ticket-item__left">
                  <strong>{ticket.title}</strong>
                  <span>{ticket.id}</span>
                </div>
                <span className={`badge badge--${ticket.status}`}>
                  {statusLabels[ticket.status]}
                </span>
              </button>
              <button
                className="ticket-review-btn"
                type="button"
                onClick={() => {
                  setReviewingChannelId(activeChannelId);
                  setReviewStars(0);
                  setReviewComment("");
                }}
              >
                Оценить
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* System notes */}
      <div className="section-block">
        <h3>Заметки</h3>
        <ul className="note-list">
          {systemNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>
    </div>
  );

  /* ================================================================
     ADMIN SCREENS
     ================================================================ */
  const renderAdminDashboard = () => (
    <div className="screen" key="admin-dashboard">
      <div className="screen__header">
        <h2>Дашборд</h2>
      </div>
      <div className="kpi-grid">
        <div className="kpi">
          <span>Новые</span>
          <strong>12</strong>
          <small>+3 за час</small>
        </div>
        <div className="kpi">
          <span>В работе</span>
          <strong>7</strong>
          <small>2 просрочены</small>
        </div>
        <div className="kpi">
          <span>Ждем клиента</span>
          <strong>5</strong>
          <small>Среднее 18 мин</small>
        </div>
        <div className="kpi kpi--alert">
          <span>SLA</span>
          <strong>2</strong>
          <small>критические</small>
        </div>
      </div>
      <div className="section-block">
        <div className="section-block__header">
          <h3>Динамика обращений</h3>
          <span className="pill">за 7 дней</span>
        </div>
        <div className="graph">
          <div className="graph__bar" style={{ height: "45%" }} />
          <div className="graph__bar" style={{ height: "70%" }} />
          <div className="graph__bar" style={{ height: "60%" }} />
          <div className="graph__bar" style={{ height: "90%" }} />
          <div className="graph__bar" style={{ height: "55%" }} />
          <div className="graph__bar" style={{ height: "40%" }} />
          <div className="graph__bar" style={{ height: "65%" }} />
        </div>
        <div className="graph__labels">
          <span>Пн</span>
          <span>Вт</span>
          <span>Ср</span>
          <span>Чт</span>
          <span>Пт</span>
          <span>Сб</span>
          <span>Вс</span>
        </div>
      </div>

      {/* Recent tickets */}
      <div className="section-block">
        <h3>Последние тикеты</h3>
        <div className="ticket-list">
          {demoTickets.slice(0, 3).map((ticket) => (
            <button
              key={ticket.id}
              className="ticket-item"
              type="button"
              onClick={() => openAdminChat(ticket.id)}
            >
              <div className="ticket-item__left">
                <strong>{ticket.title}</strong>
                <span>
                  {ticket.id} -- {ticket.clientNumber}
                </span>
              </div>
              <div className="ticket-item__right">
                <span className={`badge badge--${ticket.status}`}>
                  {statusLabels[ticket.status]}
                </span>
                <small>{ticket.updatedAt}</small>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAdminTickets = () => (
    <div className="screen" key="admin-tickets">
      <div className="screen__header">
        <h2>Тикеты</h2>
        <p>Очередь обращений</p>
      </div>

      {/* Search */}
      <div className="search-bar">
        <input
          placeholder="Поиск по номеру, клиенту, заголовку"
          value={ticketQuery}
          onChange={(e) => setTicketQuery(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="filter-chips">
        {(
          [
            ["all", "Все"],
            ["new", "Новые"],
            ["waiting_customer", "Ожидание"],
            ["overdue", "Просрочены"],
          ] as [TicketStatus | "all" | "overdue", string][]
        ).map(([value, label]) => (
          <button
            key={value}
            className={`chip ${ticketFilter === value ? "chip--active" : ""}`}
            type="button"
            onClick={() => setTicketFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="filter-chips">
        <button
          className={`chip chip--sm ${ticketSort === "sla" ? "chip--active" : ""}`}
          type="button"
          onClick={() => setTicketSort("sla")}
        >
          По SLA
        </button>
        <button
          className={`chip chip--sm ${ticketSort === "status" ? "chip--active" : ""}`}
          type="button"
          onClick={() => setTicketSort("status")}
        >
          По статусу
        </button>
      </div>

      {/* Ticket list */}
      <div className="ticket-list">
        {filteredTickets.length === 0 && (
          <div className="empty-state">Ничего не найдено</div>
        )}
        {filteredTickets.map((ticket) => (
          <button
            key={ticket.id}
            className={`ticket-item ${activeTicketId === ticket.id ? "ticket-item--active" : ""}`}
            type="button"
            onClick={() => openAdminChat(ticket.id)}
          >
            <div className="ticket-item__left">
              <strong>{ticket.title}</strong>
              <span>
                {ticket.id} -- {ticket.clientNumber}
              </span>
              <span className="ticket-item__preview">
                {ticket.lastMessage}
              </span>
            </div>
            <div className="ticket-item__right">
              <span className={`badge badge--${ticket.status}`}>
                {statusLabels[ticket.status]}
              </span>
              <span className="pill pill--sm">{ticket.slaMinutes} мин</span>
              <small>{ticket.updatedAt}</small>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  /* ---------- Admin chat list (Telegram-style) ---------- */
  const renderAdminChatList = () => {
    const query = chatListQuery.trim().toLowerCase();
    const chatItems = demoTickets.filter((t) =>
      !query ||
      t.title.toLowerCase().includes(query) ||
      t.clientNumber.toLowerCase().includes(query) ||
      t.lastMessage.toLowerCase().includes(query)
    );

    return (
      <div className="screen" key="admin-chats">
        <div className="screen__header">
          <h2>Чаты</h2>
        </div>
        <div className="search-bar">
          <input
            placeholder="Поиск..."
            value={chatListQuery}
            onChange={(e) => setChatListQuery(e.target.value)}
          />
        </div>
        <div className="chat-list">
          {chatItems.length === 0 && (
            <div className="empty-state">Нет активных чатов</div>
          )}
          {chatItems.map((ticket) => (
            <button
              key={ticket.id}
              className="chat-list-item"
              type="button"
              onClick={() => openChatFromChatList(ticket.id, demoChannels[0].id, ticket.title)}
            >
              <div className="avatar">{ticket.clientNumber.replace("C-", "").slice(0, 2)}</div>
              <div className="chat-list-item__body">
                <div className="chat-list-item__top">
                  <span className="chat-list-item__name">{ticket.clientNumber}</span>
                  <span className="chat-list-item__time">{ticket.updatedAt}</span>
                </div>
                <div className="chat-list-item__bottom">
                  <span className="chat-list-item__preview">
                    <strong>{ticket.title}: </strong>{ticket.lastMessage}
                  </span>
                  <span className={`badge badge--${ticket.status}`} style={{ flexShrink: 0, fontSize: 11 }}>
                    {statusLabels[ticket.status]}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderAdminChat = () => (
    <div className="screen screen--chat" key="admin-chat">
      {renderChatHeader()}
      {renderQuickReplies()}
      {renderChatBody()}

      {/* Admin templates quick access */}
      <div className="template-chips">
        {demoTemplates.map((tpl) => (
          <button
            key={tpl.id}
            className="chip chip--sm"
            type="button"
            onClick={() => insertTemplate(tpl.text)}
          >
            {tpl.title}
          </button>
        ))}
      </div>

      {renderComposer()}
    </div>
  );

  /* ---------- Admin "More" sub-screens ---------- */
  const renderAdminMoreMenu = () => (
    <div className="screen" key="admin-more-menu">
      <div className="screen__header">
        <h2>Управление</h2>
      </div>
      <div className="menu-list">
        <button
          className="menu-item"
          type="button"
          onClick={() => setAdminMoreScreen("services")}
        >
          <span className="menu-item__icon">&#128279;</span>
          <span>Услуги и ссылки</span>
          <span className="menu-item__arrow">&#8250;</span>
        </button>
        <button
          className="menu-item"
          type="button"
          onClick={() => setAdminMoreScreen("templates")}
        >
          <span className="menu-item__icon">&#128196;</span>
          <span>Шаблоны</span>
          <span className="menu-item__arrow">&#8250;</span>
        </button>
        <button
          className="menu-item"
          type="button"
          onClick={() => setAdminMoreScreen("team")}
        >
          <span className="menu-item__icon">&#128101;</span>
          <span>Команда</span>
          <span className="menu-item__arrow">&#8250;</span>
        </button>
        <button
          className="menu-item"
          type="button"
          onClick={() => setAdminMoreScreen("settings")}
        >
          <span className="menu-item__icon">&#9881;</span>
          <span>Настройки</span>
          <span className="menu-item__arrow">&#8250;</span>
        </button>
      </div>
    </div>
  );

  const renderAdminServices = () => (
    <div className="screen" key="admin-services">
      <div className="screen__header">
        <button className="back-link" type="button" onClick={() => setAdminMoreScreen("menu")}>
          &#8592; Назад
        </button>
        <h2>Услуги и ссылки</h2>
      </div>

      {/* Service form */}
      <div className="section-block">
        <div className="form-field">
          <label>Название услуги</label>
          <input
            value={serviceDraft.name}
            onChange={(e) =>
              setServiceDraft((prev) => ({ ...prev, name: e.target.value }))
            }
          />
        </div>
        <div className="form-field">
          <label>start_param</label>
          <input
            value={serviceDraft.startParam}
            onChange={(e) =>
              setServiceDraft((prev) => ({
                ...prev,
                startParam: e.target.value,
              }))
            }
          />
        </div>
        <div className="form-field">
          <label>short_name</label>
          <input
            value={serviceDraft.shortName}
            onChange={(e) =>
              setServiceDraft((prev) => ({
                ...prev,
                shortName: e.target.value,
              }))
            }
          />
        </div>

        {/* Generated links */}
        <div className="link-list">
          <div className="link-card">
            <div className="link-card__info">
              <strong>Main Mini App</strong>
              <span className="mono">
                t.me/your_bot?startapp={serviceDraft.startParam}&mode=compact
              </span>
            </div>
            <button
              className="btn btn--ghost btn--sm"
              type="button"
              onClick={() =>
                copyToClipboard(
                  `t.me/your_bot?startapp=${serviceDraft.startParam}&mode=compact`
                )
              }
            >
              {copied?.includes(serviceDraft.startParam)
                ? "OK"
                : "Копировать"}
            </button>
          </div>
          <div className="link-card">
            <div className="link-card__info">
              <strong>Direct Mini App</strong>
              <span className="mono">
                t.me/your_bot/{serviceDraft.shortName}?startapp=
                {serviceDraft.startParam}&mode=compact
              </span>
            </div>
            <button
              className="btn btn--ghost btn--sm"
              type="button"
              onClick={() =>
                copyToClipboard(
                  `t.me/your_bot/${serviceDraft.shortName}?startapp=${serviceDraft.startParam}&mode=compact`
                )
              }
            >
              {copied?.includes(serviceDraft.shortName) ? "OK" : "Копировать"}
            </button>
          </div>
        </div>
      </div>

      {/* Existing services */}
      <div className="section-block">
        <h3>Существующие услуги</h3>
        <div className="card-list">
          {demoServices.map((svc) => (
            <div key={svc.startParam} className="service-item">
              <div>
                <strong>{svc.name}</strong>
                <span className="mono">start_param: {svc.startParam}</span>
              </div>
              <button
                className="btn btn--ghost btn--sm"
                type="button"
                onClick={() =>
                  copyToClipboard(
                    `t.me/your_bot?startapp=${svc.startParam}&mode=compact`
                  )
                }
              >
                Ссылка
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAdminTemplates = () => (
    <div className="screen" key="admin-templates">
      <div className="screen__header">
        <button className="back-link" type="button" onClick={() => setAdminMoreScreen("menu")}>
          &#8592; Назад
        </button>
        <h2>Шаблоны</h2>
      </div>

      {/* Template list */}
      <div className="card-list">
        {demoTemplates.map((tpl) => (
          <button
            key={tpl.id}
            className={`template-card ${macroDraft.id === tpl.id ? "template-card--active" : ""}`}
            type="button"
            onClick={() => setMacroDraft(tpl)}
          >
            <strong>{tpl.title}</strong>
            <span>{tpl.text}</span>
          </button>
        ))}
      </div>

      {/* Editor */}
      <div className="section-block">
        <h3>Редактор</h3>
        <div className="form-field">
          <label>Название</label>
          <input
            value={macroDraft.title}
            onChange={(e) =>
              setMacroDraft((prev) => ({ ...prev, title: e.target.value }))
            }
          />
        </div>
        <div className="form-field">
          <label>Текст</label>
          <textarea
            value={macroDraft.text}
            rows={4}
            onChange={(e) =>
              setMacroDraft((prev) => ({ ...prev, text: e.target.value }))
            }
          />
        </div>
        <div className="template-vars">
          {["{clientNumber}", "{ticketNumber}", "{serviceName}", "{agentName}"].map(
            (token) => (
              <span key={token} className="tag">
                {token}
              </span>
            )
          )}
        </div>
        <div className="template-actions">
          <button
            className="btn btn--primary btn--block"
            type="button"
            onClick={() => showToast("Шаблон сохранён")}
          >
            Сохранить
          </button>
        </div>

        {/* Preview */}
        <div className="template-preview">
          <div className="bubble bubble--agent">
            <span>{macroDraft.text}</span>
            <small>Preview</small>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAdminTeam = () => (
    <div className="screen" key="admin-team">
      <div className="screen__header">
        <button className="back-link" type="button" onClick={() => setAdminMoreScreen("menu")}>
          &#8592; Назад
        </button>
        <h2>Команда</h2>
      </div>
      <div className="card-list">
        <div className="team-card">
          <div className="avatar">M</div>
          <div className="team-card__info">
            <strong>Маруся</strong>
            <span>Agent</span>
          </div>
          <span className="pill pill--glow">онлайн</span>
        </div>
        <div className="team-card">
          <div className="avatar">I</div>
          <div className="team-card__info">
            <strong>Игорь</strong>
            <span>Admin</span>
          </div>
          <span className="pill">офлайн</span>
        </div>
      </div>
      <button
        className="btn btn--primary btn--block"
        type="button"
        onClick={() => showToast("Приглашение отправлено")}
      >
        Пригласить агента
      </button>
    </div>
  );

  const renderAdminSettings = () => (
    <div className="screen" key="admin-settings">
      <div className="screen__header">
        <button className="back-link" type="button" onClick={() => setAdminMoreScreen("menu")}>
          &#8592; Назад
        </button>
        <h2>Настройки</h2>
      </div>
      <div className="section-block">
        <div className="setting-item">
          <label>Палитра</label>
          <div className="swatches">
            {[
              { cls: "swatch--blue", color: "#6ab3f3" },
              { cls: "swatch--purple", color: "#7aa2f7" },
              { cls: "swatch--green", color: "#4dcd5e" },
              { cls: "swatch--orange", color: "#e67e22" },
            ].map((s) => (
              <button
                key={s.cls}
                className={`swatch ${s.cls} ${accentColor === s.color ? "swatch--selected" : ""}`}
                type="button"
                onClick={() => {
                  setAccentColor(s.color);
                  showToast("Палитра обновлена");
                }}
                aria-label={`Цвет ${s.cls}`}
              />
            ))}
          </div>
        </div>
        <div className="setting-item">
          <label>Тема Telegram</label>
          <div className="filter-chips">
            <button
              className={`chip ${themeMode === "day" ? "chip--active" : ""}`}
              type="button"
              onClick={() => {
                setThemeMode("day");
                showToast("Светлая тема");
              }}
            >
              day
            </button>
            <button
              className={`chip ${themeMode === "night" ? "chip--active" : ""}`}
              type="button"
              onClick={() => {
                setThemeMode("night");
                showToast("Тёмная тема");
              }}
            >
              night
            </button>
          </div>
        </div>
        <div className="setting-item">
          <label>Safe area</label>
          <p>
            Учитываем --tg-safe-area-inset и --tg-content-safe-area-inset
            переменные.
          </p>
        </div>
        <div className="setting-item">
          <label>Dev mode</label>
          <span className={`pill ${IS_DEV ? "pill--glow" : ""}`}>
            {IS_DEV ? "browser" : "telegram"}
          </span>
        </div>
      </div>
    </div>
  );

  const renderAdminMore = () => {
    switch (adminMoreScreen) {
      case "services":
        return renderAdminServices();
      case "templates":
        return renderAdminTemplates();
      case "team":
        return renderAdminTeam();
      case "settings":
        return renderAdminSettings();
      default:
        return renderAdminMoreMenu();
    }
  };

  /* ================================================================
     Main render: which screen to show
     ================================================================ */
  const renderContent = () => {
    if (role === "client") {
      switch (clientTab) {
        case "catalog":
          return renderClientCatalog();
        case "services":
          return renderClientServices();
        case "chats":
          return renderClientChatList();
        case "chat":
          return renderClientChat();
        case "profile":
          return renderClientProfile();
      }
    } else {
      switch (adminTab) {
        case "dashboard":
          return renderAdminDashboard();
        case "tickets":
          return renderAdminTickets();
        case "chats":
          return renderAdminChatList();
        case "chat":
          return renderAdminChat();
        case "more":
          return renderAdminMore();
      }
    }
  };

  /* ================================================================
     Bottom tab bars
     ================================================================ */
  const clientTabs: [ClientTab, string, string][] = [
    ["catalog", "Каталог", "\u{1F4CB}"],
    ["services", "Услуги", "\u{1F4E6}"],
    ["chats", "Чаты", "\u{1F4AC}"],
    ["profile", "Профиль", "\u{1F464}"],
  ];

  const adminTabs: [AdminTab, string, string][] = [
    ["dashboard", "Дашборд", "\u{1F4CA}"],
    ["tickets", "Тикеты", "\u{1F4CB}"],
    ["chats", "Чаты", "\u{1F4AC}"],
    ["more", "Ещё", "\u2699\uFE0F"],
  ];

  return (
    <div className={`app ${isChat ? "app--chat" : ""}`}>
      {/* ===== TOAST ===== */}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}

      {/* ===== REVIEW OVERLAY ===== */}
      {renderReviewOverlay()}

      {/* ===== TOPBAR ===== */}
      {!isChat && (
        <header className="topbar">
          <div className="topbar__brand">CRM Chat</div>
          <div className="topbar__toggle">
            <button
              className={`toggle-btn ${role === "client" ? "toggle-btn--active" : ""}`}
              type="button"
              onClick={() => setRole("client")}
            >
              Клиент
            </button>
            <button
              className={`toggle-btn ${role === "admin" ? "toggle-btn--active" : ""}`}
              type="button"
              onClick={() => setRole("admin")}
            >
              Админ
            </button>
          </div>
        </header>
      )}

      {/* ===== MAIN CONTENT ===== */}
      <main className={`main ${isChat ? "main--chat" : ""}`}>
        {renderContent()}
      </main>

      {/* ===== BOTTOM TAB BAR ===== */}
      {!isChat && <nav className="tab-bar" role="tablist">
        {(role === "client" ? clientTabs : adminTabs).map(
          ([tab, label, icon]) => {
            const isActive =
              role === "client" ? clientTab === tab : adminTab === tab;
            return (
              <button
                key={tab}
                className={`tab-bar__btn ${isActive ? "tab-bar__btn--active" : ""}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  if (role === "client") {
                    if (tab === clientTab) return;
                    setClientHistory([]);
                    setClientTab(tab as ClientTab);
                  } else {
                    if (tab === adminTab && adminMoreScreen === "menu") return;
                    setAdminHistory([]);
                    setAdminTab(tab as AdminTab);
                    setAdminMoreScreen("menu");
                  }
                }}
              >
                <span className="tab-bar__icon">{icon}</span>
                <span className="tab-bar__label">{label}</span>
              </button>
            );
          }
        )}
      </nav>}
    </div>
  );
}
