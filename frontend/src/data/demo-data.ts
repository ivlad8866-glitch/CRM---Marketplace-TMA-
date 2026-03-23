import type { Ticket, Message, Channel, Ad } from "../types";

export const demoTickets: Ticket[] = [
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

export const demoMessages: Message[] = [
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

export const quickReplies = [
  "Проверяю детали по заказу",
  "Отправьте номер бронирования",
  "Сейчас подключу специалиста",
  "Могу предложить два варианта решения",
];

export const systemNotes = [
  "Клиент из VIP сегмента",
  "Последний контакт: 2 дня назад",
  "Важная тема: платеж",
];

export const demoServices = [
  { name: "Консультация", startParam: "consult_42", shortName: "support" },
  { name: "Возвраты", startParam: "refund_18", shortName: "refund" },
];

export const demoTemplates = [
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

export const demoChannels: Channel[] = [
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

export const demoAds: Ad[] = [
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

export const statusLabels: Record<string, string> = {
  new: "Новый",
  in_progress: "В работе",
  waiting_customer: "Ждем клиента",
  resolved: "Решен",
  closed: "Закрыт",
  spam: "Спам",
  duplicate: "Дубль",
};

/* Auto-reply text variants */
export const agentTextReplies = [
  "Принято, уже проверяю детали по тикету.",
  "Одну секунду, уточню информацию.",
  "Хорошо, передал вопрос специалисту.",
  "Спасибо за обращение, работаем над решением.",
];

export const customerTextReplies = [
  "Хорошо, спасибо за ответ!",
  "Понял, жду информацию.",
  "Ок, буду на связи.",
];

export const replyStickers = ["\u{1F44D}", "\u{1F44F}", "\u{1F64F}", "\u2764\uFE0F", "\u{1F525}", "\u2728", "\u{1F60A}"];
