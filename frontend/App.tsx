import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from './src/stores/auth.store';
import { useUiStore } from './src/stores/ui.store';
import { useTicketsStore } from './src/stores/tickets.store';
import { useMessagesStore } from './src/stores/messages.store';
import { useSocket } from './src/hooks/useSocket';
import { expandApp, haptic, showBackButton, isTelegramEnv } from './src/lib/telegram';
import { getSocket } from './src/lib/socket-manager';

type ClientScreen =
  | "loading"
  | "directory"
  | "services"
  | "chat"
  | "history"
  | "rating";
type AdminScreen =
  | "access"
  | "dashboard"
  | "tickets"
  | "ticket"
  | "services"
  | "templates"
  | "team"
  | "settings";

type Platform = "telegram" | "whatsapp" | "web";
type ClientRoute = `client/${ClientScreen}`;
type AdminRoute = `admin/${AdminScreen}`;
type Route = "select" | ClientRoute | AdminRoute;

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

type Message = {
  id: string;
  author: "customer" | "agent" | "system";
  text: string;
  time: string;
};

const demoTickets: Ticket[] = [
  {
    id: "T-2026-000142",
    clientNumber: "C-000042",
    title: "Консультация по заказу",
    status: "new",
    lastMessage: "Можно уточнить сроки доставки?",
    updatedAt: "2 мин назад",
    slaMinutes: 4,
    service: "Консультация"
  },
  {
    id: "T-2026-000141",
    clientNumber: "C-000018",
    title: "Возврат платежа",
    status: "waiting_customer",
    lastMessage: "Нужен чек или можно по номеру?",
    updatedAt: "7 мин назад",
    slaMinutes: 12,
    service: "Возвраты"
  },
  {
    id: "T-2026-000139",
    clientNumber: "C-000005",
    title: "Запись на услугу",
    status: "in_progress",
    lastMessage: "Подскажите удобное время",
    updatedAt: "24 мин назад",
    slaMinutes: 1,
    service: "Запись"
  }
];

const demoMessages: Message[] = [
  {
    id: "m-1",
    author: "system",
    text: "Оператор Маруся подключилась",
    time: "09:41"
  },
  {
    id: "m-2",
    author: "customer",
    text: "Привет! Нужна помощь по заказу.",
    time: "09:42"
  },
  {
    id: "m-3",
    author: "agent",
    text: "Здравствуйте! Сейчас всё проверю, оставайтесь на связи.",
    time: "09:43"
  }
];

const quickReplies = [
  "Проверяю детали по заказу",
  "Отправьте номер бронирования",
  "Сейчас подключу специалиста",
  "Могу предложить два варианта решения"
];

const systemNotes = [
  "Клиент из VIP сегмента",
  "Последний контакт: 2 дня назад",
  "Важная тема: платеж"
];

const demoServices = [
  {
    name: "Консультация",
    startParam: "consult_42",
    shortName: "support"
  },
  {
    name: "Возвраты",
    startParam: "refund_18",
    shortName: "refund"
  }
];

const demoTemplates = [
  {
    id: "macro-01",
    title: "Первичный ответ",
    text: "Здравствуйте! Я уточню детали и вернусь в течение 5 минут."
  },
  {
    id: "macro-02",
    title: "Запрос данных",
    text: "Пожалуйста, пришлите номер заказа или чек, чтобы я проверил статус."
  },
  {
    id: "macro-03",
    title: "Закрытие тикета",
    text: "Вопрос решен. Если понадобится помощь, напишите нам в любой момент."
  }
];

type Service = {
  id: string;
  name: string;
  description: string;
  sla: number;
  agents: number;
};

type Channel = {
  id: string;
  name: string;
  type: "Mini App" | "Bot" | "Канал" | "Провайдер";
  description: string;
  owner: string;
  services: Service[];
};

const demoChannels: Channel[] = [
  {
    id: "ch-01",
    name: "OptiCore Support",
    type: "Mini App",
    description: "Консультации по заказам и логистике.",
    owner: "@opticore",
    services: [
      {
        id: "srv-01",
        name: "Консультация",
        description: "Вопросы по заказу, доставке, статусу.",
        sla: 4,
        agents: 3
      },
      {
        id: "srv-02",
        name: "Возвраты",
        description: "Проверка платежей и возврат средств.",
        sla: 6,
        agents: 2
      }
    ]
  },
  {
    id: "ch-02",
    name: "Unicorn Studio",
    type: "Bot",
    description: "Быстрая помощь по цифровым услугам.",
    owner: "@unicornstudio",
    services: [
      {
        id: "srv-03",
        name: "Запись на услугу",
        description: "Подбор времени и бронирование.",
        sla: 5,
        agents: 4
      },
      {
        id: "srv-04",
        name: "Техподдержка",
        description: "Проблемы с доступом или оплатой.",
        sla: 3,
        agents: 5
      }
    ]
  },
  {
    id: "ch-03",
    name: "Nebula Care",
    type: "Провайдер",
    description: "Премиальная поддержка и VIP-каналы.",
    owner: "@nebulacare",
    services: [
      {
        id: "srv-05",
        name: "VIP линия",
        description: "Срочный контакт с агентом.",
        sla: 2,
        agents: 6
      }
    ]
  }
];

const cinematicSteps = [
  { title: "Запуск", note: "deep link + start_param" },
  { title: "Верификация", note: "HMAC + auth_date" },
  { title: "Диалог", note: "чат, файлы, emoji" },
  { title: "CRM", note: "статусы + SLA" }
];

const cinematicScenes = [
  {
    label: "Scene 01",
    tag: "initData",
    title: "Инициализация Mini App",
    text: "Проверяем подпись, привязываем пользователя и готовим защищенный канал."
  },
  {
    label: "Scene 02",
    tag: "ticket",
    title: "Создание тикета",
    text: "Сразу выдаем клиентский и тикетный номера, открываем чат."
  },
  {
    label: "Scene 03",
    tag: "crm",
    title: "CRM-поток",
    text: "Статусы, SLA, назначения и история — всё в одном окне."
  }
];

const getTelegram = () => window.Telegram?.WebApp;

const getInitialPlatform = (): Platform => {
  if (window.Telegram?.WebApp) return "telegram";
  const params = new URLSearchParams(window.location.search);
  const value = params.get("miniapp");
  if (value === "telegram" || value === "whatsapp" || value === "web") {
    return value;
  }
  return "telegram";
};

const getRouteFromHash = (): Route => {
  const raw = window.location.hash.replace(/^#/, "");
  return (raw || "select") as Route;
};

const buildClientRoute = (screen: ClientScreen): ClientRoute =>
  `client/${screen}`;

const buildAdminRoute = (screen: AdminScreen): AdminRoute =>
  `admin/${screen}`;

export default function App() {
  // --- Real backend integration ---
  const { user, isAuthenticated, isLoading: authLoading, login, memberships, activeWorkspaceId, selectWorkspace } = useAuthStore();
  const { navigate: storeNavigate, route: storeRoute } = useUiStore();
  useSocket();

  useEffect(() => {
    if (isTelegramEnv() && !isAuthenticated) {
      login();
    }
  }, []);

  useEffect(() => {
    expandApp();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !activeWorkspaceId) return;
    const membership = memberships.find(m => m.workspaceId === activeWorkspaceId);
    if (!membership) return;
    const isStaff = ['WORKSPACE_OWNER', 'ADMIN', 'AGENT'].includes(membership.role);
    if (isStaff && route === 'select') {
      navigate('admin/dashboard');
    } else if (!isStaff && route === 'select') {
      navigate('client/directory');
    }
  }, [isAuthenticated, activeWorkspaceId]);
  // --- End real backend integration ---

  const [platform] = useState<Platform>(getInitialPlatform);
  const [route, setRoute] = useState<Route>(getRouteFromHash);
  const [role, setRole] = useState<"client" | "admin" | null>(null);
  const [messages, setMessages] = useState<Message[]>(demoMessages);
  const [composer, setComposer] = useState("");
  const [rating, setRating] = useState(4);
  const [isTyping, setIsTyping] = useState(true);
  const [transitionId, setTransitionId] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const [logoReady, setLogoReady] = useState(true);
  const [activeTicketId, setActiveTicketId] = useState(demoTickets[0]?.id ?? "");
  const [activeChannelId, setActiveChannelId] = useState(
    demoChannels[0]?.id ?? ""
  );
  const [activeServiceName, setActiveServiceName] = useState(
    demoChannels[0]?.services[0]?.name ?? "Консультация"
  );
  const [serviceDraft, setServiceDraft] = useState({
    name: "Консультация",
    startParam: "consult_42",
    shortName: "support"
  });
  const [macroDraft, setMacroDraft] = useState(demoTemplates[0]);
  const [ticketQuery, setTicketQuery] = useState("");
  const [ticketSort, setTicketSort] = useState<"sla" | "status">("sla");
  const [ticketFilter, setTicketFilter] = useState<
    TicketStatus | "all" | "overdue"
  >("all");
  const [scrollY, setScrollY] = useState(0);
  const mainRef = useRef<HTMLDivElement | null>(null);

  const clientScreen = route.startsWith("client/")
    ? (route.split("/")[1] as ClientScreen)
    : "directory";
  const adminScreen = route.startsWith("admin/")
    ? (route.split("/")[1] as AdminScreen)
    : "access";
  const viewRole =
    route.startsWith("client/")
      ? "client"
      : route.startsWith("admin/")
        ? "admin"
        : role;
  const isSelect = route === "select";
  const isClientChatFull = route === buildClientRoute("chat");
  const isAdminChatFull = route === buildAdminRoute("ticket");
  const isChatFull = isClientChatFull || isAdminChatFull;
  const isAdminQueue =
    adminScreen === "ticket" || adminScreen === "tickets";
  const gestureHint = useMemo(() => {
    if (platform === "telegram") {
      return "Свайп влево по сообщению — быстрый ответ";
    }
    if (platform === "whatsapp") {
      return "Удерживайте микрофон — голосовое сообщение";
    }
    return "Ctrl/⌘+Enter — отправить";
  }, [platform]);

  const activeTicket = useMemo(
    () => demoTickets.find((ticket) => ticket.id === activeTicketId) ?? demoTickets[0],
    [activeTicketId]
  );
  const activeChannel = useMemo(
    () => demoChannels.find((channel) => channel.id === activeChannelId) ?? demoChannels[0],
    [activeChannelId]
  );
  const activeServices = activeChannel?.services ?? [];
  const filteredTickets = useMemo(() => {
    const normalized = ticketQuery.trim().toLowerCase();
    const byFilter =
      ticketFilter === "all"
        ? demoTickets
        : ticketFilter === "overdue"
          ? demoTickets.filter((ticket) => ticket.slaMinutes <= 3)
          : demoTickets.filter((ticket) => ticket.status === ticketFilter);
    const byQuery = normalized
      ? byFilter.filter(
          (ticket) =>
            ticket.title.toLowerCase().includes(normalized) ||
            ticket.id.toLowerCase().includes(normalized) ||
            ticket.clientNumber.toLowerCase().includes(normalized)
        )
      : byFilter;
    if (ticketSort === "status") {
      return [...byQuery].sort((a, b) => a.status.localeCompare(b.status));
    }
    return [...byQuery].sort((a, b) => a.slaMinutes - b.slaMinutes);
  }, [ticketQuery, ticketFilter, ticketSort]);

  const startParam = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tgWebAppStartParam") || "";
  }, []);

  const navigate = useCallback((nextRoute: Route) => {
    setRoute(nextRoute);
    setTransitionId((id) => id + 1);
    if (window.location.hash.replace(/^#/, "") !== nextRoute) {
      window.location.hash = nextRoute;
    }
  }, []);

  const handleRoleSelect = (nextRole: "client" | "admin") => {
    setRole(nextRole);
    navigate(
      nextRole === "client"
        ? buildClientRoute("directory")
        : buildAdminRoute("access")
    );
  };

  const openClientChat = (ticketId: string) => {
    setActiveTicketId(ticketId);
    const ticket = demoTickets.find((item) => item.id === ticketId);
    if (ticket) setActiveServiceName(ticket.title);
    navigate(buildClientRoute("chat"));
  };

  const openAdminChat = (ticketId: string) => {
    setActiveTicketId(ticketId);
    navigate(buildAdminRoute("ticket"));
  };

  const openServiceChat = (service: Service) => {
    setActiveServiceName(service.name);
    openClientChat(activeTicket?.id ?? demoTickets[0]?.id ?? "");
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      window.setTimeout(() => setCopied(null), 1400);
    } catch {
      setCopied("error");
      window.setTimeout(() => setCopied(null), 1400);
    }
  };

  useEffect(() => {
    const onHashChange = () => setRoute(getRouteFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (route.startsWith("client/")) setRole("client");
    else if (route.startsWith("admin/")) setRole("admin");
    else setRole(null);
  }, [route]);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        setScrollY(window.scrollY || 0);
        raf = 0;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const tg = getTelegram();
    if (!tg) return;
    tg.ready();
    tg.expand();
    tg.setHeaderColor?.("#0e1621");
    tg.setBackgroundColor?.("#0e1621");
  }, []);

  useEffect(() => {
    if (!activeChannel?.services?.length) return;
    setActiveServiceName(activeChannel.services[0].name);
  }, [activeChannel]);

  useEffect(() => {
    if (clientScreen !== "loading") return;
    const timer = window.setTimeout(() => {
      navigate(buildClientRoute("directory"));
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [clientScreen, navigate]);

  useEffect(() => {
    const tg = getTelegram();
    if (!tg) return;
    if (
      route.startsWith("client/") &&
      clientScreen !== "directory" &&
      clientScreen !== "loading"
    ) {
      tg.BackButton.show();
      const handler = () => navigate(buildClientRoute("directory"));
      tg.BackButton.onClick(handler);
      return () => tg.BackButton.offClick(handler);
    }
    if (route.startsWith("admin/") && adminScreen !== "dashboard" && adminScreen !== "access") {
      tg.BackButton.show();
      const handler = () => navigate(buildAdminRoute("dashboard"));
      tg.BackButton.onClick(handler);
      return () => tg.BackButton.offClick(handler);
    }
    tg.BackButton.hide();
    return;
  }, [clientScreen, adminScreen, route, navigate]);

  const sendMessage = () => {
    const trimmed = composer.trim();
    if (!trimmed) return;
    const next: Message = {
      id: `m-${Date.now()}`,
      author: "customer",
      text: trimmed,
      time: "сейчас"
    };
    setMessages((prev) => [...prev, next]);
    setComposer("");
    const tg = getTelegram();
    tg?.HapticFeedback?.impactOccurred("light");
    setIsTyping(true);
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now() + 1}`,
          author: "agent",
          text: "Принято, уже проверяю детали по тикету.",
          time: "сейчас"
        }
      ]);
      setIsTyping(false);
    }, 900);
  };

  return (
    <div
      className={`app app--${viewRole ?? "guest"} ${
        isChatFull ? "app--chat" : ""
      }`}
      data-view={viewRole ?? "guest"}
      data-platform={platform}
      style={{ ["--scroll-y" as never]: `${scrollY}px` }}
    >
      <div className="noise" aria-hidden="true" />
      <div className="glow glow--pink" aria-hidden="true" />
      <div className="glow glow--mint" aria-hidden="true" />

      <header className="topbar">
        <div className="brand">
          {logoReady ? (
            <img
              className="brand__logo"
              src="/logo.png"
              alt="Unicorn CRM"
              onError={() => setLogoReady(false)}
            />
          ) : (
            <span className="brand__mark">U</span>
          )}
          <div>
            <div className="brand__title">Unicorn CRM</div>
            <div className="brand__subtitle">Защищенный канал поддержки</div>
          </div>
        </div>
        <div className="topbar__actions">
          <div className="topbar__group">
            <button
              className={`chip ${viewRole === "client" ? "chip--active" : ""}`}
              onClick={() => navigate(buildClientRoute("directory"))}
              type="button"
            >
              Клиент
            </button>
            <button
              className={`chip ${viewRole === "admin" ? "chip--active" : ""}`}
              onClick={() => navigate(buildAdminRoute("access"))}
              type="button"
            >
              Владелец
            </button>
          </div>
        </div>
      </header>

      <main
        className={`main ${isSelect ? "main--select" : ""} ${
          isChatFull ? "main--chat" : ""
        }`}
        ref={mainRef}
      >
        {isSelect ? (
          <section className="role-select" key={`select-${transitionId}`}>
            <div className="role-select__panel">
              <p className="eyebrow">Выберите роль</p>
              <h2>Кто вы в этом пространстве поддержки?</h2>
              <p className="role-select__text">
                Мы подстроим интерфейс и доступы под вашу роль.
              </p>
              <div className="role-select__cards">
                <button
                  className="role-card"
                  type="button"
                  onClick={() => handleRoleSelect("admin")}
                >
                  <span className="role-card__badge">Владелец</span>
                  <strong>Владелец проекта</strong>
                  <p>Доступ к дашборду, SLA, настройкам и команде.</p>
                </button>
                <button
                  className="role-card role-card--accent"
                  type="button"
                  onClick={() => handleRoleSelect("client")}
                >
                  <span className="role-card__badge">Клиент</span>
                  <strong>Пользователь</strong>
                  <p>Чат поддержки, история обращений и оценка сервиса.</p>
                </button>
              </div>
              <div className="role-select__note">
                Вы сможете сменить роль в любой момент.
              </div>
            </div>
          </section>
        ) : (
          <>
            {!isChatFull && (
              <section className="hero">
              <div className="hero__content">
                <p className="eyebrow">Telegram Mini App CRM</p>
                <h1 className="hero__title">
                  Подключаем защищенный канал поддержки и превращаем обращения в
                  управляемую CRM.
                </h1>
                <p className="hero__text">
                  Старт-параметр:{" "}
                  <span className="mono">{startParam || "demo"}</span>
                </p>
                <div className="hero__actions">
                  <button className="btn btn--primary" type="button">
                    Создать канал
                  </button>
                  <button className="btn btn--ghost" type="button">
                    Демо-сценарии
                  </button>
                </div>
                <div className="hero__stats">
                  <div className="stat">
                    <div className="stat__value">4 мин</div>
                    <div className="stat__label">SLA первого ответа</div>
                  </div>
                  <div className="stat">
                    <div className="stat__value">98%</div>
                    <div className="stat__label">Решенных тикетов</div>
                  </div>
                  <div className="stat">
                    <div className="stat__value">24/7</div>
                    <div className="stat__label">Дежурные агенты</div>
                  </div>
                </div>
              </div>
              <div className="hero__visual">
                <div className="stack">
                  <div className="card card--raised">
                    <div className="card__header">
                      <span className="badge badge--new">NEW</span>
                      <span className="card__title">Тикет T-2026-000142</span>
                    </div>
                    <p className="card__text">
                      Клиент C-000042: нужна консультация по заказу и статусу
                      доставки.
                    </p>
                    <div className="card__row">
                      <button className="btn btn--tiny" type="button">
                        Взять в работу
                      </button>
                      <span className="pill">SLA 4:12</span>
                    </div>
                  </div>
                  <div className="card card--glow">
                    <div className="card__header">
                      <span className="badge badge--progress">IN PROGRESS</span>
                      <span className="card__title">Карточка клиента</span>
                    </div>
                    <div className="profile">
                      <div className="avatar">C</div>
                      <div>
                        <div className="profile__name">@cybercat</div>
                        <div className="profile__meta">C-000042 · VIP</div>
                      </div>
                    </div>
                    <div className="tags">
                      <span className="tag">консультация</span>
                      <span className="tag">оплата</span>
                      <span className="tag">premium</span>
                    </div>
                  </div>
                  <div className="card card--dark">
                    <div className="card__header">
                      <span className="badge badge--waiting">WAITING</span>
                      <span className="card__title">Ожидаем клиента</span>
                    </div>
                    <p className="card__text">
                      Шаблон: "Мы отправили запрос, вернемся в течение 5 минут."
                    </p>
                    <div className="card__row">
                      <span className="pill">Шаблон #04</span>
                      <button className="btn btn--tiny" type="button">
                        Отправить
                      </button>
                    </div>
                  </div>
                </div>
                <div className="orb orb--top" aria-hidden="true" />
                <div className="orb orb--bottom" aria-hidden="true" />
              </div>
            </section>
            )}

            {!isChatFull && (
              <section className="cinematic">
                <div className="cinematic__sticky">
                  <div className="cinematic__intro">
                    <p className="eyebrow">Кинематографично</p>
                    <h2>Сюжет поддержки, который ощущается как продукт</h2>
                    <p className="cinematic__text">
                      Прокрутите вниз — таймлайн оживает, а сцены переходят
                      друг в друга с мягкими кинематографичными движениями.
                    </p>
                  </div>
                  <div className="timeline">
                    <div className="timeline__line">
                      <span className="timeline__progress" />
                    </div>
                    <div className="timeline__steps">
                      {cinematicSteps.map((step, index) => (
                        <div key={step.title} className="timeline__step">
                          <div className="timeline__index">{index + 1}</div>
                          <div>
                            <strong>{step.title}</strong>
                            <span>{step.note}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="scene-cards">
                    {cinematicScenes.map((scene) => (
                      <div key={scene.title} className="scene-card">
                        <div className="scene-card__header">
                          <span className="scene-card__label">{scene.label}</span>
                          <span className="pill">{scene.tag}</span>
                        </div>
                        <strong>{scene.title}</strong>
                        <p>{scene.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

        {viewRole === "client" && !isClientChatFull && (
          <section className="client">
            <div className="section-header">
              <div>
                <h2>Клиентский сценарий</h2>
                <p>Каталог каналов → Услуги → Чат → История</p>
              </div>
              <div className="segmented">
                {(["directory", "services", "chat", "history", "rating"] as ClientScreen[]).map(
                  (screen) => (
                    <button
                      key={screen}
                      className={`segmented__btn ${
                        clientScreen === screen ? "segmented__btn--active" : ""
                      }`}
                      onClick={() => navigate(buildClientRoute(screen))}
                      type="button"
                    >
                      {screen === "directory" && "Каталог"}
                      {screen === "services" && "Услуги"}
                      {screen === "chat" && "Чат"}
                      {screen === "history" && "История"}
                      {screen === "rating" && "Оценка"}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="phone">
              <div className="phone__safe">
                <div
                  className="screen-stage"
                  key={`client-${clientScreen}-${transitionId}`}
                >
                {clientScreen === "loading" && (
                  <div className="screen screen--loading">
                    <div className="loading">
                      <div className="loading__badge">Защищенный канал</div>
                      <h3>Подключаем защищенный канал...</h3>
                      <p>
                        Проверяем доступ, синхронизируем данные и настраиваем
                        приватный чат.
                      </p>
                      <div className="loading__bar">
                        <span />
                      </div>
                      <div className="loading__status">
                        Инициализация сессии · 82%
                      </div>
                      <div className="loading__grid">
                        <div className="loading__tile">
                          <span>initData</span>
                          <strong>ok</strong>
                        </div>
                        <div className="loading__tile">
                          <span>start_param</span>
                          <strong>{startParam || "demo"}</strong>
                        </div>
                        <div className="loading__tile">
                          <span>safe area</span>
                          <strong>ready</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {clientScreen === "directory" && (
                  <div className="screen screen--directory">
                    <div className="screen__header">
                      <h3>Каталог каналов</h3>
                      <p>Mini Apps, боты и провайдеры услуг</p>
                    </div>
                    <div className="directory-filters">
                      <button className="chip chip--active" type="button">
                        Все
                      </button>
                      <button className="chip" type="button">
                        Mini App
                      </button>
                      <button className="chip" type="button">
                        Боты
                      </button>
                      <button className="chip" type="button">
                        Провайдеры
                      </button>
                    </div>
                    <div className="channel-list">
                      {demoChannels.map((channel) => (
                        <button
                          key={channel.id}
                          className={`channel-card ${
                            activeChannel?.id === channel.id
                              ? "channel-card--active"
                              : ""
                          }`}
                          type="button"
                          onClick={() => {
                            setActiveChannelId(channel.id);
                            navigate(buildClientRoute("services"));
                          }}
                        >
                          <div className="channel-card__header">
                            <span className="badge">{channel.type}</span>
                            <span className="pill">
                              {channel.services.length} услуг
                            </span>
                          </div>
                          <strong>{channel.name}</strong>
                          <p>{channel.description}</p>
                          <div className="channel-card__meta">
                            <span>{channel.owner}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {clientScreen === "services" && (
                  <div className="screen screen--services">
                    <div className="screen__header">
                      <span className="badge badge--new">Канал</span>
                      <h3>{activeChannel?.name ?? "Выбранный канал"}</h3>
                      <p>Выберите услугу, чтобы перейти в чат поддержки.</p>
                    </div>
                    <div className="service-list">
                      {activeServices.map((service) => (
                        <button
                          key={service.id}
                          className="service-card"
                          type="button"
                          onClick={() => openServiceChat(service)}
                        >
                          <strong>{service.name}</strong>
                          <p>{service.description}</p>
                          <div className="service-card__meta">
                            <span className="pill">SLA {service.sla} мин</span>
                            <span className="pill">{service.agents} агентов</span>
                          </div>
                        </button>
                      ))}
                    </div>
                    <button
                      className="btn btn--ghost btn--block"
                      type="button"
                      onClick={() => navigate(buildClientRoute("directory"))}
                    >
                      Назад к каналам
                    </button>
                  </div>
                )}

                {clientScreen === "chat" && (
                  <div className="screen screen--chat">
                    <div className="screen__header screen__header--chat">
                      <div>
                        <h3>{activeServiceName}</h3>
                        <p>{activeChannel?.name ?? "Поддержка канала"}</p>
                      </div>
                      <span className="pill pill--glow">online</span>
                    </div>
                    <div className="chat">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`bubble bubble--${message.author}`}
                        >
                          <span>{message.text}</span>
                          <small>{message.time}</small>
                        </div>
                      ))}
                      {isTyping && (
                        <div className="bubble bubble--agent bubble--typing">
                          <span className="typing">
                            <i />
                            <i />
                            <i />
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="quick-replies">
                      {quickReplies.map((reply) => (
                        <button
                          key={reply}
                          className="quick-reply"
                          type="button"
                          onClick={() => setComposer(reply)}
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                    <div className="attachments">
                      <div className="attachment">
                        <div className="attachment__icon">PDF</div>
                        <div>
                          <strong>Чек оплаты.pdf</strong>
                          <span>482 KB</span>
                        </div>
                      </div>
                      <div className="attachment attachment--image">
                        <div className="attachment__icon">IMG</div>
                        <div>
                          <strong>Фото заказа.png</strong>
                          <span>1.2 MB</span>
                        </div>
                      </div>
                    </div>
                    <div className="composer">
                      <button className="icon-btn" type="button" aria-label="Файл">
                        +
                      </button>
                      <input
                        value={composer}
                        onChange={(event) => setComposer(event.target.value)}
                        placeholder="Сообщение оператору"
                      />
                      <button className="icon-btn" type="button" aria-label="Эмодзи">
                        :)
                      </button>
                      <button
                        className="btn btn--primary btn--tiny"
                        type="button"
                        onClick={sendMessage}
                      >
                        Отправить
                      </button>
                    </div>
                  </div>
                )}

                {clientScreen === "history" && (
                  <div className="screen screen--history">
                    <div className="screen__header">
                      <h3>История обращений</h3>
                      <p>Последние тикеты клиента</p>
                    </div>
                    <div className="history-filters">
                      <button className="chip chip--active" type="button">
                        Все
                      </button>
                      <button className="chip" type="button">
                        Активные
                      </button>
                      <button className="chip" type="button">
                        Решенные
                      </button>
                    </div>
                    <div className="ticket-list">
                      {demoTickets.map((ticket) => (
                        <button
                          key={ticket.id}
                          className="ticket-item"
                          type="button"
                          onClick={() => openClientChat(ticket.id)}
                        >
                          <div>
                            <strong>{ticket.title}</strong>
                            <span>{ticket.id}</span>
                          </div>
                          <span className={`badge badge--${ticket.status}`}>
                            {ticket.status.replace("_", " ")}
                          </span>
                        </button>
                      ))}
                    </div>
                    <button
                      className="btn btn--ghost btn--block"
                      type="button"
                      onClick={() => openClientChat(activeTicket?.id ?? "")}
                    >
                      Открыть последний чат
                    </button>
                  </div>
                )}

                {clientScreen === "rating" && (
                  <div className="screen screen--rating">
                    <div className="screen__header">
                      <h3>Оцените поддержку</h3>
                      <p>Ваш отзыв помогает нам стать лучше.</p>
                    </div>
                    <div className="rating">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          className={`star ${rating >= star ? "star--on" : ""}`}
                          onClick={() => setRating(star)}
                          type="button"
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    <textarea
                      placeholder="Комментарий для команды"
                      rows={4}
                    />
                    <div className="rating__note">
                      <strong>Бонус:</strong> после оценки мы отправим персональный
                      гайд по улучшению сервиса.
                    </div>
                    <button className="btn btn--primary btn--block" type="button">
                      Отправить отзыв
                    </button>
                  </div>
                )}
                </div>
                {clientScreen !== "loading" && (
                  <div className="phone-nav">
                    {(
                      [
                        ["directory", "Каталог"],
                        ["services", "Услуги"],
                        ["chat", "Чат"],
                        ["history", "История"]
                      ] as [ClientScreen, string][]
                    ).map(([screen, label]) => (
                      <button
                        key={screen}
                        className={`phone-nav__btn ${
                          clientScreen === screen ? "phone-nav__btn--active" : ""
                        }`}
                        onClick={() => navigate(buildClientRoute(screen))}
                        type="button"
                        aria-label={label}
                      >
                        <span />
                        <small>{label}</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {viewRole === "client" && isClientChatFull && (
          <section className="chat-page chat-page--client">
            <aside className="chat-list">
              <div className="chat-list__header">
                <h3>Чаты</h3>
                <span className="pill">{activeChannel?.name ?? "Клиент"}</span>
              </div>
              <div className="chat-search">
                <input placeholder="Поиск чатов" />
              </div>
              <div className="chat-filters">
                <button className="chip chip--active" type="button">
                  Все
                </button>
                <button className="chip" type="button">
                  Новые
                </button>
                <button className="chip" type="button">
                  В работе
                </button>
              </div>
              <div className="chat-list__items">
                {demoTickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    className={`chat-item ${
                      activeTicket?.id === ticket.id ? "chat-item--active" : ""
                    }`}
                    type="button"
                    onClick={() => setActiveTicketId(ticket.id)}
                  >
                        <div className="chat-item__avatar">
                          {ticket.clientNumber.replace("C-", "").slice(0, 2)}
                        </div>
                    <div className="chat-item__body">
                      <strong>{ticket.title}</strong>
                      <span>{ticket.lastMessage}</span>
                    </div>
                    <div className="chat-item__meta">
                      <small>{ticket.updatedAt}</small>
                      <span className={`badge badge--${ticket.status}`}>
                        {ticket.status.replace("_", " ")}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </aside>
            <div className="chat-main">
              <div className="chat-main__header">
                <div className="chat-main__title">
                  <button
                    className="icon-btn"
                    type="button"
                    onClick={() => navigate(buildClientRoute("directory"))}
                    aria-label="Назад"
                  >
                    ←
                  </button>
                  <div className="avatar avatar--lg">C</div>
                  <div>
                    <strong>{activeServiceName || activeTicket?.title}</strong>
                    <span className="chat-main__subtitle">
                      {activeChannel?.name ?? "Канал поддержки"} · online
                    </span>
                  </div>
                </div>
                <div className="chat-actions">
                  <button className="icon-btn" type="button">
                    📞
                  </button>
                  <button className="icon-btn" type="button">
                    🎥
                  </button>
                  <button className="icon-btn" type="button">
                    ⋯
                  </button>
                </div>
              </div>
              <div className="chat-main__body">
                <div className="chat-day">Сегодня</div>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`bubble bubble--${message.author}`}
                  >
                    <span>{message.text}</span>
                    <small>{message.time}</small>
                  </div>
                ))}
                <div className="bubble bubble--customer bubble--voice">
                  <span>Голосовое сообщение · 0:24</span>
                  <small>09:48</small>
                </div>
              </div>
              <div className="chat-main__composer">
                <button className="icon-btn" type="button">
                  📎
                </button>
                <button className="icon-btn" type="button">
                  🙂
                </button>
                <input
                  placeholder="Напишите сообщение"
                  value={composer}
                  onChange={(event) => setComposer(event.target.value)}
                />
                <button className="icon-btn" type="button">
                  🎤
                </button>
                <button className="btn btn--primary btn--tiny" type="button">
                  Отправить
                </button>
              </div>
              {platform !== "web" && (
                <div className="gesture-hint">{gestureHint}</div>
              )}
            </div>
            {platform !== "web" && (
              <div className="mobile-bottom mobile-bottom--client">
                <div className="mobile-bottom__handle" aria-hidden="true" />
                <button
                  className={`mobile-bottom__btn ${
                    clientScreen === "directory" ? "is-active" : ""
                  }`}
                  type="button"
                  onClick={() => navigate(buildClientRoute("directory"))}
                >
                  <span />
                  <small>Каталог</small>
                </button>
                <button
                  className={`mobile-bottom__btn ${
                    clientScreen === "services" ? "is-active" : ""
                  }`}
                  type="button"
                  onClick={() => navigate(buildClientRoute("services"))}
                >
                  <span />
                  <small>Услуги</small>
                </button>
                <button
                  className={`mobile-bottom__btn ${
                    clientScreen === "chat" ? "is-active" : ""
                  }`}
                  type="button"
                  onClick={() => navigate(buildClientRoute("chat"))}
                >
                  <span />
                  <small>Чат</small>
                </button>
                <button
                  className={`mobile-bottom__btn ${
                    clientScreen === "history" ? "is-active" : ""
                  }`}
                  type="button"
                  onClick={() => navigate(buildClientRoute("history"))}
                >
                  <span />
                  <small>История</small>
                </button>
              </div>
            )}
          </section>
        )}

        {viewRole === "admin" && isAdminChatFull && (
          <section className="chat-page chat-page--admin">
            <div className="chat-main">
              <div className="chat-main__header">
                <div className="chat-main__title">
                  <button
                    className="icon-btn"
                    type="button"
                    onClick={() => navigate(buildAdminRoute("tickets"))}
                    aria-label="Назад"
                  >
                    ←
                  </button>
                  <div className="avatar avatar--lg">C</div>
                  <div>
                    <strong>{activeTicket?.title}</strong>
                    <span className="chat-main__subtitle">
                      {activeTicket?.clientNumber} · SLA {activeTicket?.slaMinutes} мин
                    </span>
                  </div>
                </div>
                <div className="chat-actions">
                  <button className="chip chip--active" type="button">
                    in_progress
                  </button>
                  <button className="chip" type="button">
                    Назначить
                  </button>
                  <button className="chip" type="button">
                    Закрыть
                  </button>
                </div>
              </div>
              <div className="chat-main__body">
                <div className="chat-day">Сегодня</div>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`bubble bubble--${message.author}`}
                  >
                    <span>{message.text}</span>
                    <small>{message.time}</small>
                  </div>
                ))}
              </div>
              <div className="chat-main__composer">
                <button className="icon-btn" type="button">
                  📎
                </button>
                <button className="icon-btn" type="button">
                  🙂
                </button>
                <input
                  placeholder="Ответ клиенту"
                  value={composer}
                  onChange={(event) => setComposer(event.target.value)}
                />
                <button className="icon-btn" type="button">
                  ⚡
                </button>
                <button className="btn btn--primary btn--tiny" type="button">
                  Отправить
                </button>
              </div>
              {platform !== "web" && (
                <div className="gesture-hint">{gestureHint}</div>
              )}
            </div>
            <aside className="chat-aside">
              <div className="panel panel--profile">
                <div className="panel__header">
                  <h3>Карточка клиента</h3>
                  <span className="badge badge--progress">VIP</span>
                </div>
                <div className="profile profile--stacked">
                  <div className="avatar avatar--lg">C</div>
                  <div>
                    <strong>@cybercat</strong>
                    <span>{activeTicket?.clientNumber} · ru-RU</span>
                  </div>
                </div>
                <div className="field">
                  <label>Теги</label>
                  <div className="tags">
                    <span className="tag">premium</span>
                    <span className="tag">консультация</span>
                  </div>
                </div>
                <div className="field">
                  <label>Внутренние заметки</label>
                  <ul className="note-list">
                    {systemNotes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
                <div className="field">
                  <label>Поля CRM</label>
                  <div className="chip-row">
                    <span className="pill">Город: Москва</span>
                    <span className="pill">Сегмент: VIP</span>
                  </div>
                </div>
              </div>
            </aside>
            {platform !== "web" && (
              <div className="mobile-bottom mobile-bottom--admin">
                <div className="mobile-bottom__handle" aria-hidden="true" />
                <button
                  className={`mobile-bottom__btn ${
                    adminScreen === "dashboard" ? "is-active" : ""
                  }`}
                  type="button"
                  onClick={() => navigate(buildAdminRoute("dashboard"))}
                >
                  <span />
                  <small>Дашборд</small>
                </button>
                <button
                  className={`mobile-bottom__btn ${isAdminQueue ? "is-active" : ""}`}
                  type="button"
                  onClick={() => navigate(buildAdminRoute("tickets"))}
                >
                  <span />
                  <small>Очередь</small>
                </button>
                <button
                  className={`mobile-bottom__btn ${
                    adminScreen === "settings" ? "is-active" : ""
                  }`}
                  type="button"
                  onClick={() => navigate(buildAdminRoute("settings"))}
                >
                  <span />
                  <small>Настройки</small>
                </button>
              </div>
            )}
          </section>
        )}

        {viewRole === "admin" && !isAdminChatFull && (
          <section className="admin">
            <div className="section-header">
              <div>
                <h2>CRM для агентов и админов</h2>
                <p>Очередь → карточка тикета → ссылки → команда → бренд</p>
              </div>
            </div>

            <div className="admin-shell">
              <aside className="sidebar">
                <div className="sidebar__title">Навигация</div>
                {(
                  [
                    ["access", "Доступ"],
                    ["dashboard", "Дашборд"],
                    ["tickets", "Очередь"],
                    ["ticket", "Карточка"],
                    ["services", "Услуги"],
                    ["templates", "Шаблоны"],
                    ["team", "Команда"],
                    ["settings", "Настройки"]
                  ] as [AdminScreen, string][]
                ).map(([screen, label]) => (
                  <button
                    key={screen}
                    className={`sidebar__btn ${
                      adminScreen === screen ? "sidebar__btn--active" : ""
                    }`}
                    onClick={() => navigate(buildAdminRoute(screen))}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </aside>

              <div className="admin-content">
                <div
                  className="screen-stage"
                  key={`admin-${adminScreen}-${transitionId}`}
                >
                {adminScreen === "access" && (
                  <div className="panel access">
                    <div className="panel__header">
                      <h3>Проверяем доступ</h3>
                      <span className="badge badge--progress">secure</span>
                    </div>
                    <div className="access__body">
                      <div className="access__status">
                        <div className="access__pulse" />
                        <div>
                          <strong>Telegram ID подтвержден</strong>
                          <p>Проверяем роль в workspace и права агента.</p>
                        </div>
                      </div>
                      <div className="access__actions">
                        <button
                          className="btn btn--primary"
                          type="button"
                          onClick={() => navigate(buildAdminRoute("dashboard"))}
                        >
                          Продолжить
                        </button>
                        <button className="btn btn--ghost" type="button">
                          Запросить доступ
                        </button>
                      </div>
                      <div className="access__note">
                        Если прав нет, администратор может пригласить вас по
                        username или tg_id.
                      </div>
                    </div>
                  </div>
                )}
                {adminScreen === "dashboard" && (
                  <div className="dashboard">
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
                    <div className="panel panel--graph">
                      <div className="panel__header">
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
                    </div>
                  </div>
                )}

                {adminScreen === "tickets" && (
                  <div className="panel">
                    <div className="panel__header">
                      <div>
                        <h3>Очередь тикетов</h3>
                        <p>Фильтры, сортировки и быстрый поиск</p>
                      </div>
                      <div className="panel__actions">
                        <button
                          className={`chip ${
                            ticketFilter === "all" ? "chip--active" : ""
                          }`}
                          type="button"
                          onClick={() => setTicketFilter("all")}
                        >
                          Все
                        </button>
                        <button
                          className={`chip ${
                            ticketFilter === "new" ? "chip--active" : ""
                          }`}
                          type="button"
                          onClick={() => setTicketFilter("new")}
                        >
                          New
                        </button>
                        <button
                          className={`chip ${
                            ticketFilter === "waiting_customer" ? "chip--active" : ""
                          }`}
                          type="button"
                          onClick={() => setTicketFilter("waiting_customer")}
                        >
                          Waiting
                        </button>
                        <button
                          className={`chip ${
                            ticketFilter === "overdue" ? "chip--active" : ""
                          }`}
                          type="button"
                          onClick={() => setTicketFilter("overdue")}
                        >
                          Просрочены
                        </button>
                      </div>
                    </div>
                    <div className="ticket-toolbar">
                      <div className="ticket-toolbar__search">
                        <input
                          placeholder="Поиск по номеру, клиенту, заголовку"
                          value={ticketQuery}
                          onChange={(event) => setTicketQuery(event.target.value)}
                        />
                      </div>
                      <div className="ticket-toolbar__sort">
                        <button
                          className={`chip ${
                            ticketSort === "sla" ? "chip--active" : ""
                          }`}
                          type="button"
                          onClick={() => setTicketSort("sla")}
                        >
                          По SLA
                        </button>
                        <button
                          className={`chip ${
                            ticketSort === "status" ? "chip--active" : ""
                          }`}
                          type="button"
                          onClick={() => setTicketSort("status")}
                        >
                          По статусу
                        </button>
                      </div>
                    </div>
                    <div className="table">
                      {filteredTickets.map((ticket) => (
                        <button
                          key={ticket.id}
                          className="table__row"
                          type="button"
                          onClick={() => openAdminChat(ticket.id)}
                        >
                          <div>
                            <strong>{ticket.id}</strong>
                            <span>{ticket.title}</span>
                          </div>
                          <div className="table__meta">
                            <span className="mono">{ticket.clientNumber}</span>
                            <span>{ticket.service}</span>
                          </div>
                          <div className="table__meta">
                            <span>{ticket.lastMessage}</span>
                            <small>{ticket.updatedAt}</small>
                          </div>
                          <span className={`badge badge--${ticket.status}`}>
                            {ticket.status.replace("_", " ")}
                          </span>
                          <span className="pill">{ticket.slaMinutes} мин</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {adminScreen === "ticket" && (
                  <div className="ticket-detail">
                    <div className="panel panel--chat">
                      <div className="panel__header">
                        <h3>T-2026-000142 · C-000042</h3>
                        <div className="panel__actions">
                          <button className="chip chip--active" type="button">
                            in_progress
                          </button>
                          <button className="chip" type="button">
                            Назначить
                          </button>
                          <button className="chip" type="button">
                            Закрыть
                          </button>
                        </div>
                      </div>
                      <div className="chat chat--admin">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`bubble bubble--${message.author}`}
                          >
                            <span>{message.text}</span>
                            <small>{message.time}</small>
                        </div>
                      ))}
                    </div>
                    <div className="quick-replies">
                      {quickReplies.map((reply) => (
                        <button
                          key={reply}
                          className="quick-reply"
                          type="button"
                          onClick={() => setComposer(reply)}
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                    <div className="attachments">
                      <div className="attachment">
                        <div className="attachment__icon">PDF</div>
                        <div>
                          <strong>Чек оплаты.pdf</strong>
                          <span>482 KB</span>
                        </div>
                      </div>
                      <div className="attachment attachment--image">
                        <div className="attachment__icon">IMG</div>
                        <div>
                          <strong>Фото заказа.png</strong>
                          <span>1.2 MB</span>
                        </div>
                      </div>
                    </div>
                      <div className="composer">
                        <button className="icon-btn" type="button">
                          +
                        </button>
                        <input placeholder="Сообщение клиенту" />
                        <button className="icon-btn" type="button">
                          ::
                        </button>
                        <button className="btn btn--primary btn--tiny" type="button">
                          Ответить
                        </button>
                      </div>
                    </div>
                    <aside className="panel panel--profile">
                      <div className="panel__header">
                        <h3>Карточка клиента</h3>
                        <span className="badge badge--progress">VIP</span>
                      </div>
                      <div className="profile profile--stacked">
                        <div className="avatar avatar--lg">C</div>
                        <div>
                          <strong>@cybercat</strong>
                          <span>C-000042 · ru-RU</span>
                        </div>
                      </div>
                      <div className="field">
                        <label>Теги</label>
                        <div className="tags">
                          <span className="tag">premium</span>
                          <span className="tag">консультация</span>
                        </div>
                      </div>
                      <div className="field">
                        <label>Заметка</label>
                        <p>
                          Клиент предпочитает быстрый ответ и короткие инструкции.
                        </p>
                      </div>
                      <div className="field">
                        <label>Внутренние заметки</label>
                        <ul className="note-list">
                          {systemNotes.map((note) => (
                            <li key={note}>{note}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="field">
                        <label>Поля CRM</label>
                        <div className="chip-row">
                          <span className="pill">Город: Москва</span>
                          <span className="pill">Сегмент: VIP</span>
                        </div>
                      </div>
                    </aside>
                  </div>
                )}

                {adminScreen === "services" && (
                  <div className="panel">
                    <div className="panel__header">
                      <h3>Услуги и ссылки</h3>
                      <button className="btn btn--primary btn--tiny" type="button">
                        Создать услугу
                      </button>
                    </div>
                    <div className="service-grid">
                      <div className="service-form">
                        <label>Название услуги</label>
                        <input
                          value={serviceDraft.name}
                          onChange={(event) =>
                            setServiceDraft((prev) => ({
                              ...prev,
                              name: event.target.value
                            }))
                          }
                        />
                        <label>start_param</label>
                        <input
                          value={serviceDraft.startParam}
                          onChange={(event) =>
                            setServiceDraft((prev) => ({
                              ...prev,
                              startParam: event.target.value
                            }))
                          }
                        />
                        <label>short_name</label>
                        <input
                          value={serviceDraft.shortName}
                          onChange={(event) =>
                            setServiceDraft((prev) => ({
                              ...prev,
                              shortName: event.target.value
                            }))
                          }
                        />
                        <div className="service-links">
                          <div className="link-card">
                            <div>
                              <strong>Main Mini App</strong>
                              <span>
                                t.me/your_bot?startapp={serviceDraft.startParam}
                                &mode=compact
                              </span>
                            </div>
                            <button
                              className="btn btn--ghost btn--tiny"
                              type="button"
                              onClick={() =>
                                copyToClipboard(
                                  `t.me/your_bot?startapp=${serviceDraft.startParam}&mode=compact`
                                )
                              }
                            >
                              {copied?.includes(serviceDraft.startParam)
                                ? "Скопировано"
                                : "Скопировать"}
                            </button>
                          </div>
                          <div className="link-card">
                            <div>
                              <strong>Direct Mini App</strong>
                              <span>
                                t.me/your_bot/{serviceDraft.shortName}?startapp=
                                {serviceDraft.startParam}&mode=compact
                              </span>
                            </div>
                            <button
                              className="btn btn--ghost btn--tiny"
                              type="button"
                              onClick={() =>
                                copyToClipboard(
                                  `t.me/your_bot/${serviceDraft.shortName}?startapp=${serviceDraft.startParam}&mode=compact`
                                )
                              }
                            >
                              {copied?.includes(serviceDraft.shortName)
                                ? "Скопировано"
                                : "Скопировать"}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="service-preview">
                        <div className="card card--glow">
                          <div className="card__header">
                            <span className="badge badge--new">SERVICE</span>
                            <span className="card__title">{serviceDraft.name}</span>
                          </div>
                          <p className="card__text">
                            start_param: {serviceDraft.startParam}
                          </p>
                          <div className="card__row">
                            <span className="pill">short: {serviceDraft.shortName}</span>
                            <button className="btn btn--tiny" type="button">
                              Открыть
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="service-list">
                      {demoServices.map((service) => (
                        <div key={service.startParam} className="service">
                          <div>
                            <strong>{service.name}</strong>
                            <span>start_param: {service.startParam}</span>
                          </div>
                          <button
                            className="btn btn--ghost btn--tiny"
                            type="button"
                            onClick={() =>
                              copyToClipboard(
                                `t.me/your_bot?startapp=${service.startParam}&mode=compact`
                              )
                            }
                          >
                            Скопировать ссылку
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {adminScreen === "team" && (
                  <div className="panel">
                    <div className="panel__header">
                      <h3>Команда</h3>
                      <button className="btn btn--primary btn--tiny" type="button">
                        Пригласить агента
                      </button>
                    </div>
                    <div className="team-grid">
                      <div className="team-card">
                        <div className="avatar">M</div>
                        <div>
                          <strong>Маруся</strong>
                          <span>Agent</span>
                        </div>
                        <span className="pill">онлайн</span>
                      </div>
                      <div className="team-card">
                        <div className="avatar">I</div>
                        <div>
                          <strong>Игорь</strong>
                          <span>Admin</span>
                        </div>
                        <span className="pill">офлайн</span>
                      </div>
                    </div>
                  </div>
                )}

                {adminScreen === "templates" && (
                  <div className="panel">
                    <div className="panel__header">
                      <h3>Шаблоны и макросы</h3>
                      <button className="btn btn--primary btn--tiny" type="button">
                        Новый шаблон
                      </button>
                    </div>
                    <div className="template-grid">
                      <div className="template-list">
                        {demoTemplates.map((template) => (
                          <button
                            key={template.id}
                            className={`template-card ${
                              macroDraft.id === template.id
                                ? "template-card--active"
                                : ""
                            }`}
                            type="button"
                            onClick={() => setMacroDraft(template)}
                          >
                            <strong>{template.title}</strong>
                            <span>{template.text}</span>
                          </button>
                        ))}
                      </div>
                      <div className="template-editor">
                        <label>Название</label>
                        <input
                          value={macroDraft.title}
                          onChange={(event) =>
                            setMacroDraft((prev) => ({
                              ...prev,
                              title: event.target.value
                            }))
                          }
                        />
                        <label>Текст</label>
                        <textarea
                          value={macroDraft.text}
                          rows={5}
                          onChange={(event) =>
                            setMacroDraft((prev) => ({
                              ...prev,
                              text: event.target.value
                            }))
                          }
                        />
                        <div className="template-vars">
                          {[
                            "{clientNumber}",
                            "{ticketNumber}",
                            "{serviceName}",
                            "{agentName}"
                          ].map((token) => (
                            <span key={token} className="tag">
                              {token}
                            </span>
                          ))}
                        </div>
                        <div className="template-actions">
                          <button className="btn btn--primary btn--tiny" type="button">
                            Сохранить
                          </button>
                          <button className="btn btn--ghost btn--tiny" type="button">
                            Предпросмотр
                          </button>
                        </div>
                      </div>
                      <div className="template-preview">
                        <div className="bubble bubble--agent">
                          <span>{macroDraft.text}</span>
                          <small>Preview</small>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {adminScreen === "settings" && (
                  <div className="panel">
                    <div className="panel__header">
                      <h3>Бренд и стиль</h3>
                      <span className="pill pill--glow">neon</span>
                    </div>
                    <div className="settings-grid">
                      <div className="setting">
                        <label>Палитра</label>
                        <div className="swatches">
                          <span className="swatch swatch--pink" />
                          <span className="swatch swatch--rose" />
                          <span className="swatch swatch--mint" />
                          <span className="swatch swatch--dark" />
                        </div>
                      </div>
                      <div className="setting">
                        <label>Превью бренда</label>
                        <div className="brand-preview">
                          <div className="brand-preview__card">
                            <div className="brand-preview__header">
                              <span className="badge badge--new">NEW</span>
                              <strong>Support Pack</strong>
                            </div>
                            <p>Новый стиль активирован для всех каналов.</p>
                            <button className="btn btn--tiny btn--primary" type="button">
                              Проверить
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="setting">
                        <label>Глитч-эффекты</label>
                        <div className="slider">
                          <span>умеренно</span>
                          <div className="slider__track">
                            <div className="slider__thumb" />
                          </div>
                        </div>
                      </div>
                      <div className="setting">
                        <label>Тема Telegram</label>
                        <div className="theme-toggle">
                          <button className="chip chip--active" type="button">
                            day
                          </button>
                          <button className="chip" type="button">
                            night
                          </button>
                        </div>
                      </div>
                      <div className="setting">
                        <label>Safe area</label>
                        <p>
                          Учитываем --tg-safe-area-inset и
                          --tg-content-safe-area-inset переменные.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                </div>
              </div>
            </div>
          </section>
        )}
          </>
        )}
      </main>
    </div>
  );
}
