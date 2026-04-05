import { useSyncExternalStore } from "react";

/* ================================================================
   i18n — lightweight internationalization for CRM Chat
   ================================================================
   Usage:
     import { t, useLocale, setLocale } from "../lib/i18n";

     function MyComponent() {
       const { t } = useLocale();         // re-renders on locale change
       return <span>{t("nav_home")}</span>;
     }

     // Or outside React:
     import { t } from "../lib/i18n";
     console.log(t("nav_home"));
   ================================================================ */

export type Locale = "ru" | "en";

/* ----------------------------------------------------------------
   Translation keys — every UI string lives here
   ---------------------------------------------------------------- */

type TranslationKeys = {
  /* ---- Navigation ---- */
  nav_home: string;
  nav_chats: string;
  nav_showcase: string;
  nav_stats: string;
  nav_settings: string;
  nav_tickets: string;

  /* ---- Auth screen ---- */
  auth_title: string;
  auth_selectRole: string;
  auth_client: string;
  auth_admin: string;
  auth_agent: string;
  auth_administrator: string;
  auth_loginClient: string;
  auth_loginAgent: string;
  auth_loginAdmin: string;
  auth_loginDemo: string;
  auth_loginError: string;
  auth_loggingIn: string;

  /* ---- Greetings ---- */
  greeting_morning: string;
  greeting_afternoon: string;
  greeting_evening: string;

  /* ---- Home / Dashboard ---- */
  dashboard_requests: string;
  dashboard_resolved: string;
  dashboard_active: string;
  dashboard_awaitingReply: string;
  dashboard_all: string;
  dashboard_noActiveRequests: string;
  dashboard_thisMonth: string;
  dashboard_activeTickets: string;
  dashboard_totalRequests: string;
  dashboard_hoursThisMonth: string;
  dashboard_avgCheck: string;
  dashboard_allProcessed: string;
  dashboard_createTicket: string;
  dashboard_title: string;
  dashboard_client: string;
  dashboard_service: string;
  dashboard_slaMinutes: string;
  dashboard_requestDescription: string;
  dashboard_cancel: string;

  /* ---- Chat list ---- */
  chatList_search: string;
  chatList_new: string;
  chatList_inProgress: string;
  chatList_resolved: string;
  chatList_noRequests: string;
  chatList_shareLink: string;
  chatList_copyLink: string;

  /* ---- Chat ---- */
  chat_replyToClient: string;
  chat_message: string;
  chat_stickers: string;
  chat_attach: string;
  chat_voiceMessage: string;
  chat_send: string;
  chat_you: string;
  chat_agent: string;
  chat_now: string;
  chat_recording: string;
  chat_cancel: string;
  chat_today: string;
  chat_back: string;
  chat_supportChat: string;
  chat_channel: string;
  chat_pause: string;
  chat_play: string;
  chat_playbackError: string;

  /* ---- Attachments ---- */
  attach_photo: string;
  attach_file: string;
  attach_camera: string;
  attach_location: string;
  attach_cameraUnavailable: string;

  /* ---- Catalog / Showcase ---- */
  catalog_showcase: string;
  catalog_free: string;
  catalog_empty: string;
  catalog_addFirstService: string;
  catalog_bots: string;
  catalog_providers: string;
  catalog_all: string;
  nav_marketplace: string;
  marketplace_title: string;
  marketplace_search: string;
  marketplace_allCategories: string;
  marketplace_tgOnly: string;
  marketplace_miniApp: string;
  marketplace_bot: string;
  marketplace_channel: string;
  marketplace_provider: string;
  marketplace_free: string;
  marketplace_reviews: string;
  marketplace_noReviews: string;
  marketplace_writeReview: string;
  marketplace_connect: string;
  marketplace_empty: string;
  marketplace_sla: string;
  marketplace_agents: string;
  marketplace_sortBy: string;
  marketplace_sortPrice: string;
  marketplace_sortRating: string;
  marketplace_sortNew: string;
  marketplace_filterLabel: string;
  marketplace_tgOnlyHint: string;
  marketplace_reviewsTab: string;
  marketplace_servicesTab: string;

  /* ---- Stats ---- */
  stats_week: string;
  stats_month: string;
  stats_allTime: string;
  stats_total: string;
  stats_resolved: string;
  stats_avgSla: string;
  stats_maxWait: string;
  stats_byStatus: string;
  stats_min: string;
  stats_noData: string;

  /* ---- Statuses ---- */
  status_new: string;
  status_inProgress: string;
  status_waitingClient: string;
  status_resolved: string;
  status_closed: string;
  status_spam: string;
  status_duplicate: string;

  /* ---- Stats status breakdown ---- */
  statsStatus_new: string;
  statsStatus_inProgress: string;
  statsStatus_waitingClient: string;
  statsStatus_resolved: string;
  statsStatus_closed: string;

  /* ---- Settings / More ---- */
  more_management: string;
  more_services: string;
  more_servicesAndLinks: string;
  more_templates: string;
  more_team: string;
  more_settings: string;
  more_theme: string;
  more_themeDay: string;
  more_themeNight: string;
  more_accentColor: string;
  more_language: string;
  more_languageRussian: string;
  more_languageEnglish: string;
  more_palette: string;
  more_paletteUpdated: string;
  more_lightTheme: string;
  more_darkTheme: string;
  more_back: string;

  /* ---- Services management ---- */
  services_existing: string;
  services_edit: string;
  services_delete: string;
  services_add: string;
  services_editTitle: string;
  services_newTitle: string;
  services_nameLabel: string;
  services_namePlaceholder: string;
  services_descriptionLabel: string;
  services_descriptionPlaceholder: string;
  services_coverLabel: string;
  services_coverAlt: string;
  services_priceLabel: string;
  services_pricePlaceholder: string;
  services_currencyLabel: string;
  services_slaLabel: string;
  services_slaPlaceholder: string;
  services_save: string;
  services_cancel: string;
  services_copy: string;
  services_copied: string;
  services_fillName: string;
  services_updated: string;
  services_added: string;
  services_deleted: string;
  services_deleteConfirm: string;
  services_free: string;
  services_coverUploaded: string;
  services_coverUploadError: string;
  services_uploadPhoto: string;
  services_replacePhoto: string;
  services_uploading: string;
  services_removePhoto: string;
  services_uniqueLink: string;
  services_directLink: string;
  folder_namePlaceholder: string;
  folder_keywordsPlaceholder: string;

  /* ---- Templates management ---- */
  templates_add: string;
  templates_editor: string;
  templates_nameLabel: string;
  templates_namePlaceholder: string;
  templates_textLabel: string;
  templates_textPlaceholder: string;
  templates_save: string;
  templates_delete: string;
  templates_noName: string;
  templates_created: string;
  templates_saved: string;
  templates_deleted: string;
  templates_fillName: string;
  templates_cantDeleteLast: string;
  templates_empty: string;

  /* ---- Team management ---- */
  team_invite: string;
  team_newMember: string;
  team_nameLabel: string;
  team_namePlaceholder: string;
  team_roleLabel: string;
  team_add: string;
  team_cancel: string;
  team_delete: string;
  team_online: string;
  team_offline: string;
  team_fillName: string;
  team_agentAdded: string;
  team_memberDeleted: string;
  team_cantDeleteSelf: string;
  team_deleteConfirm: string;

  /* ---- Profile / Review ---- */
  profile_requests: string;
  profile_resolved: string;
  profile_rateSupport: string;
  profile_rateDescription: string;
  profile_commentPlaceholder: string;
  profile_thankYou: string;
  profile_submitReview: string;
  profile_reviewSent: string;
  profile_history: string;
  profile_all: string;
  profile_active: string;
  profile_resolvedFilter: string;
  profile_rate: string;
  profile_notes: string;

  /* ---- Review (chat) ---- */
  review_rateChannel: string;
  review_leaveReview: string;
  review_submitReview: string;
  review_thanks: string;
  review_stars: string;

  /* ---- Time formatting ---- */
  time_ago: string;
  time_hours: string;
  time_days: string;

  /* ---- Toast / system messages ---- */
  toast_justNow: string;
  toast_ticketCreated: string;
  toast_browserNoRecording: string;
  toast_noMicAccess: string;
  toast_micPermissionDenied: string;
  toast_micNotFound: string;
  toast_micBusy: string;
  toast_playbackError: string;
  toast_agentAdded: string;

  /* ---- Tickets page ---- */
  tickets_title: string;
  tickets_queue: string;
  tickets_searchPlaceholder: string;
  tickets_all: string;
  tickets_new: string;
  tickets_waiting: string;
  tickets_overdue: string;
  tickets_sortBySla: string;
  tickets_sortByStatus: string;
  tickets_nothingFound: string;

  /* ---- Services page (client) ---- */
  servicesPage_services: string;
  servicesPage_ads: string;
  servicesPage_rate: string;
  servicesPage_selectService: string;
  servicesPage_agents: string;
  servicesPage_noAds: string;
  servicesPage_contactSeller: string;

  /* ---- Relative time ---- */
  time_justNow: string;
  time_minAgo: string;
  time_hAgo: string;
  time_dAgo: string;

  /* ---- Folders ---- */
  folder_management: string;
  folder_allFolders: string;
  folder_moveToFolder: string;
  folder_removeFromFolders: string;
  folder_dragHint: string;
  folder_fillName: string;
  folder_created: string;
  folder_updated: string;
  folder_deleted: string;
  folder_deleteConfirm: string;
  folder_newTitle: string;
  folder_editTitle: string;
  folder_nameLabel: string;
  folder_colorLabel: string;
  folder_keywordsLabel: string;
  folder_keywordsHint: string;
  folder_createBtn: string;
  folder_emptyHint: string;
  folder_noKeywords: string;
  folder_keywordsHintFull: string;
  more_folders: string;

  /* ---- Admin marketplace (seller view) ---- */
  adminMkt_title: string;
  adminMkt_tabListings: string;
  adminMkt_tabProfile: string;
  adminMkt_addListing: string;
  adminMkt_editListing: string;
  adminMkt_statusActive: string;
  adminMkt_statusPaused: string;
  adminMkt_statusDraft: string;
  adminMkt_views: string;
  adminMkt_leads: string;
  adminMkt_noListings: string;
  adminMkt_addFirst: string;
  adminMkt_pause: string;
  adminMkt_activate: string;
  adminMkt_delete: string;
  adminMkt_deleteConfirm: string;
  adminMkt_profileTitle: string;
  adminMkt_profileName: string;
  adminMkt_profileDesc: string;
  adminMkt_profileSave: string;
  adminMkt_profileSaved: string;
  adminMkt_totalListings: string;
  adminMkt_totalViews: string;
  adminMkt_totalLeads: string;
  adminMkt_avgRating: string;
  adminMkt_nameLabel: string;
  adminMkt_descLabel: string;
  adminMkt_priceLabel: string;
  adminMkt_slaLabel: string;
  adminMkt_typeLabel: string;
  adminMkt_saved: string;
  adminMkt_deleted: string;
  adminMkt_paused: string;
  adminMkt_activated: string;
  adminMkt_fillName: string;
  adminMkt_promote: string;
  adminMkt_promoted: string;

  /* ---- Misc ---- */
  common_cancel: string;
  common_save: string;
  common_delete: string;
  common_back: string;
  common_min: string;

  /* ---- Dashboard (extra) ---- */
  dashboard_avgResponseTime: string;
  dashboard_slaCompleted: string;
  dashboard_slaGoal: string;
  dashboard_serviceOptions_consultation: string;
  dashboard_serviceOptions_returns: string;
  dashboard_serviceOptions_techSupport: string;
  dashboard_serviceOptions_booking: string;
  dashboard_months_nov: string;
  dashboard_months_dec: string;
  dashboard_months_jan: string;
  dashboard_months_feb: string;
  dashboard_months_mar: string;
  dashboard_months_apr: string;

  /* ---- Stats (extra) ---- */
  stats_efficiency: string;
  stats_firstReply: string;
  stats_popularServices: string;
  stats_slaFive: string;
  stats_noPeriodData: string;
  stats_choosePeriod: string;
  stats_close: string;
  stats_trendUp: string;
  stats_trendDown: string;
  stats_trendFlat: string;

  /* ---- Home page status bar ---- */
  home_statusTitle: string;
  home_statusNew: string;
  home_statusInProgress: string;
  home_statusWaiting: string;
  home_statusResolved: string;
  home_statusClosed: string;

  /* ---- Client chat page ---- */
  clientChat_title: string;
  clientChat_online: string;

  /* ---- Admin chat page ---- */
  adminChat_title: string;

  /* ---- Services page (extra) ---- */
  servicesPage_channel: string;
  servicesPage_resultsCount: string;

  /* ---- Profile page (fixes) ---- */
  profile_starRating: string;
  profile_filterAll: string;
  profile_filterActive: string;
  profile_filterResolved: string;

  /* ---- Admin marketplace (extra) ---- */
  adminMkt_coverLabel: string;
  adminMkt_logoLabel: string;
  adminMkt_descPlaceholder: string;
  adminMkt_cancelAriaLabel: string;
  adminMkt_listingsCount: string;
  adminMkt_coverUploaded: string;
  adminMkt_activeListings: string;
  adminMkt_menuLabel: string;
  adminMkt_uploadCoverLabel: string;
  adminMkt_uploadLogoLabel: string;
  adminMkt_uploadBannerLabel: string;
  adminMkt_uploadAvatarLabel: string;
  adminMkt_detailLabel: string;
  adminMkt_editLabel: string;
  adminMkt_pauseLabel: string;
  adminMkt_activateLabel: string;
  adminMkt_promoteLabel: string;
  adminMkt_deleteLabel: string;
  adminMkt_backLabel: string;
  adminMkt_saveProfileLabel: string;
  adminMkt_clearFilterLabel: string;
  adminMkt_addListingLabel: string;
  adminMkt_filterLabel: string;
  adminMkt_editShort: string;
  adminMkt_reviews: string;
  adminMkt_agents: string;
  adminMkt_statusLabel: string;
  adminMkt_analyticsTab: string;
  adminMkt_viewsByListing: string;
  adminMkt_conversionFunnel: string;
  adminMkt_impressions: string;
  adminMkt_viewsLabel: string;
  adminMkt_applicationsLabel: string;
  adminMkt_byStatus: string;
  adminMkt_editListingAriaLabel: string;
  adminMkt_profilePreview: string;
  adminMkt_yourCompany: string;
  adminMkt_companyNamePlaceholder: string;
  adminMkt_aboutPlaceholder: string;
  adminMkt_telegramLink: string;
  adminMkt_city: string;
  adminMkt_cityPlaceholder: string;
  adminMkt_bannerAlt: string;
  adminMkt_avatarAlt: string;
  adminMkt_changeBannerBtn: string;
  adminMkt_coverAlt: string;
  adminMkt_namePlaceholder: string;
  adminMkt_pricePlaceholder: string;
  adminMkt_agentsLabel: string;

  /* ---- More page (extra) ---- */
  more_noWorkspace: string;

  /* ---- Review overlay ---- */
  review_starRatingLabel: string;
  review_commentPlaceholder: string;
  review_submit: string;
  review_cancel: string;
  review_thankYou: string;
  review_sent: string;

  /* ---- Top bar ---- */
  topBar_logout: string;

  /* ---- Voice recorder ---- */
  voiceRec_cancelRecord: string;
  voiceRec_stopSend: string;
  voiceRec_send: string;
  voiceRec_lock: string;
  voiceRec_slideToCancel: string;
  voiceRec_releaseToCancel: string;

  /* ---- Error boundary ---- */
  error_title: string;
  error_description: string;
  error_retry: string;
};

/* ----------------------------------------------------------------
   Translations
   ---------------------------------------------------------------- */

const translations: Record<Locale, TranslationKeys> = {
  ru: {
    /* Navigation */
    nav_home: "Главная",
    nav_chats: "Чаты",
    nav_showcase: "Витрина",
    nav_stats: "Статистика",
    nav_settings: "Настройки",
    nav_tickets: "Тикеты",

    /* Auth */
    auth_title: "CRM Chat",
    auth_selectRole: "Выберите роль для входа",
    auth_client: "Клиент",
    auth_admin: "Админ",
    auth_agent: "Оператор",
    auth_administrator: "Администратор",
    auth_loginClient: "Войти как клиент",
    auth_loginAgent: "Войти как оператор",
    auth_loginAdmin: "Войти как администратор",
    auth_loginDemo: "Войти без бэкенда (демо)",
    auth_loginError: "Не удалось войти. Проверьте, что бэкенд запущен.",
    auth_loggingIn: "Вход...",

    /* Greetings */
    greeting_morning: "Доброе утро",
    greeting_afternoon: "Добрый день",
    greeting_evening: "Добрый вечер",

    /* Home / Dashboard */
    dashboard_requests: "Обращений",
    dashboard_resolved: "Решено",
    dashboard_active: "Активных",
    dashboard_awaitingReply: "Ждут ответа",
    dashboard_all: "Все",
    dashboard_noActiveRequests: "Нет активных обращений",
    dashboard_thisMonth: "В этом месяце",
    dashboard_activeTickets: "Активных тикетов",
    dashboard_totalRequests: "Всего обращений",
    dashboard_hoursThisMonth: "Часов в месяце",
    dashboard_avgCheck: "Средний чек",
    dashboard_allProcessed: "Все обращения обработаны",
    dashboard_createTicket: "Создать тикет",
    dashboard_title: "Название",
    dashboard_client: "Клиент",
    dashboard_service: "Услуга",
    dashboard_slaMinutes: "SLA (минуты)",
    dashboard_requestDescription: "Описание обращения",
    dashboard_cancel: "Отмена",

    /* Chat list */
    chatList_search: "Поиск",
    chatList_new: "Новые",
    chatList_inProgress: "В работе",
    chatList_resolved: "Решённые",
    chatList_noRequests: "Пока нет обращений",
    chatList_shareLink: "Поделитесь ссылкой на ваш канал чтобы клиенты могли написать",
    chatList_copyLink: "Скопировать ссылку",

    /* Chat */
    chat_replyToClient: "Ответ клиенту...",
    chat_message: "Сообщение...",
    chat_stickers: "Стикеры",
    chat_attach: "Прикрепить",
    chat_voiceMessage: "Голосовое сообщение",
    chat_send: "Отправить",
    chat_you: "Вы",
    chat_agent: "Оператор",
    chat_now: "сейчас",
    chat_recording: "Запись...",
    chat_cancel: "Отмена",
    chat_today: "Сегодня",
    chat_back: "Назад",
    chat_supportChat: "Чат поддержки",
    chat_channel: "Канал",
    chat_pause: "Пауза",
    chat_play: "Воспроизвести",
    chat_playbackError: "Ошибка воспроизведения",

    /* Attachments */
    attach_photo: "Фото",
    attach_file: "Файл",
    attach_camera: "Камера",
    attach_location: "Геолокация",
    attach_cameraUnavailable: "Камера недоступна в демо",

    /* Catalog / Showcase */
    catalog_showcase: "Витрина",
    catalog_free: "Бесплатно",
    catalog_empty: "Витрина пуста",
    catalog_addFirstService: "Добавить первую услугу",
    catalog_bots: "Боты",
    catalog_providers: "Провайдеры",
    catalog_all: "Все",
    nav_marketplace: "Маркетплейс",
    marketplace_title: "Маркетплейс",
    marketplace_search: "Найти услугу...",
    marketplace_allCategories: "Все",
    marketplace_tgOnly: "Только Telegram",
    marketplace_miniApp: "Mini App",
    marketplace_bot: "Боты",
    marketplace_channel: "Каналы",
    marketplace_provider: "Провайдеры",
    marketplace_free: "Бесплатно",
    marketplace_reviews: "отзывов",
    marketplace_noReviews: "Отзывов пока нет",
    marketplace_writeReview: "Написать отзыв",
    marketplace_connect: "Подключиться",
    marketplace_empty: "Ничего не найдено",
    marketplace_sla: "мин ответ",
    marketplace_agents: "агентов",
    marketplace_sortBy: "Сортировка",
    marketplace_sortPrice: "По цене",
    marketplace_sortRating: "По рейтингу",
    marketplace_sortNew: "Новинки",
    marketplace_filterLabel: "Фильтры",
    marketplace_tgOnlyHint: "Доступно в Telegram",
    marketplace_reviewsTab: "Отзывы",
    marketplace_servicesTab: "Услуги",

    /* Stats */
    stats_week: "Неделя",
    stats_month: "Месяц",
    stats_allTime: "Всё время",
    stats_total: "Всего",
    stats_resolved: "Решено",
    stats_avgSla: "Среднее SLA",
    stats_maxWait: "Макс. ожидание",
    stats_byStatus: "По статусам",
    stats_min: "мин",
    stats_noData: "Данные появятся когда пройдёт первое обращение",

    /* Statuses (for badges / labels) */
    status_new: "Новый",
    status_inProgress: "В работе",
    status_waitingClient: "Ждем клиента",
    status_resolved: "Решен",
    status_closed: "Закрыт",
    status_spam: "Спам",
    status_duplicate: "Дубликат",

    /* Stats status breakdown */
    statsStatus_new: "Новые",
    statsStatus_inProgress: "В работе",
    statsStatus_waitingClient: "Ждёт клиента",
    statsStatus_resolved: "Решено",
    statsStatus_closed: "Закрыто",

    /* Settings / More */
    more_management: "Управление",
    more_services: "Услуги",
    more_servicesAndLinks: "Услуги и ссылки",
    more_templates: "Шаблоны",
    more_team: "Команда",
    more_settings: "Настройки",
    more_theme: "Тема",
    more_themeDay: "День",
    more_themeNight: "Ночь",
    more_accentColor: "Акцентный цвет",
    more_language: "Язык",
    more_languageRussian: "Русский",
    more_languageEnglish: "English",
    more_palette: "Палитра",
    more_paletteUpdated: "Палитра обновлена",
    more_lightTheme: "Светлая тема",
    more_darkTheme: "Тёмная тема",
    more_back: "Назад",

    /* Services management */
    services_existing: "Существующие услуги",
    services_edit: "Изменить",
    services_delete: "Удалить",
    services_add: "Добавить услугу",
    services_editTitle: "Редактирование услуги",
    services_newTitle: "Новая услуга",
    services_nameLabel: "Название услуги *",
    services_namePlaceholder: "Название",
    services_descriptionLabel: "Описание",
    services_descriptionPlaceholder: "Краткое описание услуги",
    services_coverLabel: "Обложка — URL ввод",
    services_coverAlt: "Обложка",
    services_priceLabel: "Цена",
    services_pricePlaceholder: "0 = бесплатно",
    services_currencyLabel: "Валюта",
    services_slaLabel: "SLA минут",
    services_slaPlaceholder: "Время ответа в минутах",
    services_save: "Сохранить",
    services_cancel: "Отмена",
    services_copy: "Копировать",
    services_copied: "Скопировано",
    services_fillName: "Заполните название услуги",
    services_updated: "Услуга обновлена",
    services_added: "Услуга добавлена",
    services_deleted: "Услуга удалена",
    services_deleteConfirm: "Удалить услугу?",
    services_free: "Бесплатно",
    services_coverUploaded: "Обложка загружена",
    services_coverUploadError: "Ошибка загрузки обложки",
    services_uploadPhoto: "Загрузить фото",
    services_replacePhoto: "Заменить фото",
    services_uploading: "Загрузка...",
    services_removePhoto: "Удалить",
    services_uniqueLink: "Уникальная ссылка",
    services_directLink: "Прямая ссылка",
    folder_namePlaceholder: "Реклама, Оплата, Возвраты...",
    folder_keywordsPlaceholder: "реклама, промо, объявление",

    /* Templates management */
    templates_add: "Добавить шаблон",
    templates_editor: "Редактор",
    templates_nameLabel: "Название",
    templates_namePlaceholder: "Название шаблона",
    templates_textLabel: "Текст",
    templates_textPlaceholder: "Текст шаблона",
    templates_save: "Сохранить",
    templates_delete: "Удалить",
    templates_noName: "(без названия)",
    templates_created: "Новый шаблон создан",
    templates_saved: "Шаблон сохранён",
    templates_deleted: "Шаблон удалён",
    templates_fillName: "Заполните название шаблона",
    templates_cantDeleteLast: "Нельзя удалить единственный шаблон",
    templates_empty: "(пусто)",

    /* Team management */
    team_invite: "Пригласить агента",
    team_newMember: "Новый участник",
    team_nameLabel: "Имя *",
    team_namePlaceholder: "Имя агента",
    team_roleLabel: "Роль",
    team_add: "Добавить",
    team_cancel: "Отмена",
    team_delete: "Удалить",
    team_online: "онлайн",
    team_offline: "офлайн",
    team_fillName: "Заполните имя агента",
    team_agentAdded: "Агент добавлен",
    team_memberDeleted: "Участник удалён",
    team_cantDeleteSelf: "Нельзя удалить себя",
    team_deleteConfirm: "Удалить участника?",

    /* Profile / Review */
    profile_requests: "Обращений",
    profile_resolved: "Решено",
    profile_rateSupport: "Оцените поддержку",
    profile_rateDescription: "Ваш отзыв помогает нам стать лучше.",
    profile_commentPlaceholder: "Комментарий для команды",
    profile_thankYou: "Спасибо за отзыв!",
    profile_submitReview: "Отправить отзыв",
    profile_reviewSent: "Отзыв отправлен!",
    profile_history: "История обращений",
    profile_all: "Все",
    profile_active: "Активные",
    profile_resolvedFilter: "Решенные",
    profile_rate: "Оценить",
    profile_notes: "Заметки",

    /* Review (chat) */
    review_rateChannel: "Оцените канал",
    review_leaveReview: "Оставить отзыв",
    review_submitReview: "Отправить отзыв",
    review_thanks: "Спасибо за оценку!",
    review_stars: "звезд",

    /* Time formatting */
    time_ago: "назад",
    time_hours: "ч",
    time_days: "д",

    /* Toast / system messages */
    toast_justNow: "только что",
    toast_ticketCreated: "Тикет создан",
    toast_browserNoRecording: "Браузер не поддерживает запись",
    toast_noMicAccess: "Нет доступа к микрофону",
    toast_micPermissionDenied: "Доступ к микрофону запрещён. Разрешите в настройках браузера",
    toast_micNotFound: "Микрофон не найден",
    toast_micBusy: "Микрофон занят другим приложением",
    toast_playbackError: "Ошибка воспроизведения",
    toast_agentAdded: "Агент добавлен",

    /* Tickets page */
    tickets_title: "Тикеты",
    tickets_queue: "Очередь обращений",
    tickets_searchPlaceholder: "Поиск по номеру, клиенту, заголовку",
    tickets_all: "Все",
    tickets_new: "Новые",
    tickets_waiting: "Ожидание",
    tickets_overdue: "Просрочены",
    tickets_sortBySla: "По SLA",
    tickets_sortByStatus: "По статусу",
    tickets_nothingFound: "Ничего не найдено",

    /* Services page (client) */
    servicesPage_services: "Услуги",
    servicesPage_ads: "Реклама",
    servicesPage_rate: "Оценить",
    servicesPage_selectService: "Выберите услугу, чтобы перейти в чат поддержки.",
    servicesPage_agents: "агентов",
    servicesPage_noAds: "У канала пока нет рекламных объявлений.",
    servicesPage_contactSeller: "Связаться с продавцом",

    /* Relative time */
    time_justNow: "только что",
    time_minAgo: "мин назад",
    time_hAgo: "ч назад",
    time_dAgo: "д назад",

    /* Folders */
    folder_management: "Папки чатов",
    folder_allFolders: "Все папки",
    folder_moveToFolder: "Переместить в папку",
    folder_removeFromFolders: "Убрать из папок",
    folder_dragHint: "Перетащите на папку выше ↑",
    folder_fillName: "Введите название папки",
    folder_created: "Папка создана",
    folder_updated: "Папка обновлена",
    folder_deleted: "Папка удалена",
    folder_deleteConfirm: "Удалить папку?",
    folder_newTitle: "Новая папка",
    folder_editTitle: "Редактирование папки",
    folder_nameLabel: "Название",
    folder_colorLabel: "Цвет",
    folder_keywordsLabel: "Ключевые слова (через запятую)",
    folder_keywordsHint: "через запятую",
    folder_createBtn: "Создать папку",
    folder_emptyHint: "Папок пока нет. Создайте первую папку для автосортировки чатов.",
    folder_noKeywords: "Нет ключевых слов",
    folder_keywordsHintFull: "Чат автоматически попадёт в папку, если в сообщении есть одно из этих слов",
    more_folders: "Папки чатов",

    /* Admin marketplace (seller view) */
    adminMkt_title: "Маркетплейс",
    adminMkt_tabListings: "Мои объявления",
    adminMkt_tabProfile: "Профиль продавца",
    adminMkt_addListing: "Добавить объявление",
    adminMkt_editListing: "Редактировать",
    adminMkt_statusActive: "Активно",
    adminMkt_statusPaused: "На паузе",
    adminMkt_statusDraft: "Черновик",
    adminMkt_views: "просмотров",
    adminMkt_leads: "заявок",
    adminMkt_noListings: "Нет объявлений",
    adminMkt_addFirst: "Добавьте первое объявление, чтобы клиенты находили вас в маркетплейсе",
    adminMkt_pause: "Приостановить",
    adminMkt_activate: "Активировать",
    adminMkt_delete: "Удалить",
    adminMkt_deleteConfirm: "Удалить объявление?",
    adminMkt_profileTitle: "Профиль продавца",
    adminMkt_profileName: "Название компании",
    adminMkt_profileDesc: "О себе",
    adminMkt_profileSave: "Сохранить профиль",
    adminMkt_profileSaved: "Профиль обновлён",
    adminMkt_totalListings: "Объявлений",
    adminMkt_totalViews: "Просмотров",
    adminMkt_totalLeads: "Заявок",
    adminMkt_avgRating: "Рейтинг",
    adminMkt_nameLabel: "Название услуги",
    adminMkt_descLabel: "Описание",
    adminMkt_priceLabel: "Цена (₽)",
    adminMkt_slaLabel: "SLA (мин)",
    adminMkt_typeLabel: "Тип канала",
    adminMkt_saved: "Объявление сохранено",
    adminMkt_deleted: "Объявление удалено",
    adminMkt_paused: "Объявление приостановлено",
    adminMkt_activated: "Объявление активировано",
    adminMkt_fillName: "Введите название услуги",
    adminMkt_promote: "Продвигать",
    adminMkt_promoted: "Объявление отправлено на продвижение",

    /* Misc */
    common_cancel: "Отмена",
    common_save: "Сохранить",
    common_delete: "Удалить",
    common_back: "Назад",
    common_min: "мин",

    /* Dashboard (extra) */
    dashboard_avgResponseTime: "Среднее время ответа",
    dashboard_slaCompleted: "SLA выполнен",
    dashboard_slaGoal: "цель 85%",
    dashboard_serviceOptions_consultation: "Консультация",
    dashboard_serviceOptions_returns: "Возвраты",
    dashboard_serviceOptions_techSupport: "Техподдержка",
    dashboard_serviceOptions_booking: "Запись",
    dashboard_months_nov: "Ноя",
    dashboard_months_dec: "Дек",
    dashboard_months_jan: "Янв",
    dashboard_months_feb: "Фев",
    dashboard_months_mar: "Мар",
    dashboard_months_apr: "Апр",

    /* Stats (extra) */
    stats_efficiency: "Эффективность",
    stats_firstReply: "Первый ответ",
    stats_popularServices: "Популярные услуги",
    stats_slaFive: "SLA ≤5 мин",
    stats_noPeriodData: "Нет данных за этот период",
    stats_choosePeriod: "Выберите другой период",
    stats_close: "Закрыть",
    stats_trendUp: "↑ +12% к предыдущему периоду",
    stats_trendDown: "↓ -8% к предыдущему периоду",
    stats_trendFlat: "≈ без изменений",

    /* Home page status bar */
    home_statusTitle: "Статус обращений",
    home_statusNew: "Новые",
    home_statusInProgress: "В работе",
    home_statusWaiting: "Ожидание",
    home_statusResolved: "Решены",
    home_statusClosed: "Закрыты",

    /* Client chat page */
    clientChat_title: "Чат поддержки",
    clientChat_online: "online",

    /* Admin chat page */
    adminChat_title: "Чат",

    /* Services page (extra) */
    servicesPage_channel: "Канал",
    servicesPage_resultsCount: "услуг",

    /* Profile page (fixes) */
    profile_starRating: "звезд",
    profile_filterAll: "Все",
    profile_filterActive: "Активные",
    profile_filterResolved: "Решенные",

    /* Admin marketplace (extra) */
    adminMkt_coverLabel: "Добавить обложку",
    adminMkt_logoLabel: "Логотип услуги",
    adminMkt_descPlaceholder: "Опишите услугу подробнее...",
    adminMkt_cancelAriaLabel: "Отмена",
    adminMkt_listingsCount: "услуг",
    adminMkt_coverUploaded: "Обложка загружена",
    adminMkt_activeListings: "активных",
    adminMkt_menuLabel: "Меню объявления",
    adminMkt_uploadCoverLabel: "Загрузить обложку",
    adminMkt_uploadLogoLabel: "Загрузить логотип",
    adminMkt_uploadBannerLabel: "Изменить баннер",
    adminMkt_uploadAvatarLabel: "Загрузить аватар",
    adminMkt_detailLabel: "Подробнее",
    adminMkt_editLabel: "Редактировать",
    adminMkt_pauseLabel: "Приостановить",
    adminMkt_activateLabel: "Активировать",
    adminMkt_promoteLabel: "Продвинуть",
    adminMkt_deleteLabel: "Удалить",
    adminMkt_backLabel: "Назад",
    adminMkt_saveProfileLabel: "Сохранить профиль",
    adminMkt_clearFilterLabel: "Сбросить фильтр",
    adminMkt_addListingLabel: "Добавить объявление",
    adminMkt_filterLabel: "Фильтр",
    adminMkt_editShort: "Ред.",
    adminMkt_reviews: "отзывов",
    adminMkt_agents: "агентов",
    adminMkt_statusLabel: "Статус",
    adminMkt_analyticsTab: "Аналитика",
    adminMkt_viewsByListing: "Просмотры по объявлениям",
    adminMkt_conversionFunnel: "Воронка конверсии",
    adminMkt_impressions: "Показы",
    adminMkt_viewsLabel: "Просмотры",
    adminMkt_applicationsLabel: "Заявки",
    adminMkt_byStatus: "По статусам",
    adminMkt_editListingAriaLabel: "Редактировать",
    adminMkt_profilePreview: "Как выглядит в маркетплейсе",
    adminMkt_yourCompany: "Ваша компания",
    adminMkt_companyNamePlaceholder: "Название компании",
    adminMkt_aboutPlaceholder: "Расскажите о своей компании...",
    adminMkt_telegramLink: "Telegram-ссылка",
    adminMkt_city: "Город",
    adminMkt_cityPlaceholder: "Москва",
    adminMkt_bannerAlt: "Баннер",
    adminMkt_avatarAlt: "Аватар",
    adminMkt_changeBannerBtn: "Изменить баннер",
    adminMkt_coverAlt: "Обложка",
    adminMkt_namePlaceholder: "Напр. Консультация по заказу",
    adminMkt_pricePlaceholder: "0 = бесплатно",
    adminMkt_agentsLabel: "Агентов",

    /* More page (extra) */
    more_noWorkspace: "Нет активного рабочего пространства",

    /* Review overlay */
    review_starRatingLabel: "звезд",
    review_commentPlaceholder: "Комментарий для команды",
    review_submit: "Отправить отзыв",
    review_cancel: "Отмена",
    review_thankYou: "Спасибо за отзыв!",
    review_sent: "Отзыв отправлен!",

    /* Top bar */
    topBar_logout: "Выйти",

    /* Voice recorder */
    voiceRec_cancelRecord: "Отменить запись",
    voiceRec_stopSend: "Остановить и отправить",
    voiceRec_send: "Отправить",
    voiceRec_lock: "Зафиксировать запись",
    voiceRec_slideToCancel: "Сдвиньте для отмены",
    voiceRec_releaseToCancel: "Отпустите для отмены",

    error_title: "Что-то пошло не так",
    error_description: "Произошла непредвиденная ошибка. Попробуйте перезагрузить страницу.",
    error_retry: "Попробовать снова",
  },

  en: {
    /* Navigation */
    nav_home: "Home",
    nav_chats: "Chats",
    nav_showcase: "Showcase",
    nav_stats: "Statistics",
    nav_settings: "Settings",
    nav_tickets: "Tickets",

    /* Auth */
    auth_title: "CRM Chat",
    auth_selectRole: "Select a role to log in",
    auth_client: "Client",
    auth_admin: "Admin",
    auth_agent: "Agent",
    auth_administrator: "Administrator",
    auth_loginClient: "Login as Client",
    auth_loginAgent: "Login as Agent",
    auth_loginAdmin: "Login as Admin",
    auth_loginDemo: "Login without backend (demo)",
    auth_loginError: "Login failed. Check that the backend is running.",
    auth_loggingIn: "Logging in...",

    /* Greetings */
    greeting_morning: "Good morning",
    greeting_afternoon: "Good afternoon",
    greeting_evening: "Good evening",

    /* Home / Dashboard */
    dashboard_requests: "Requests",
    dashboard_resolved: "Resolved",
    dashboard_active: "Active",
    dashboard_awaitingReply: "Awaiting reply",
    dashboard_all: "All",
    dashboard_noActiveRequests: "No active requests",
    dashboard_thisMonth: "This month",
    dashboard_activeTickets: "Active tickets",
    dashboard_totalRequests: "Total requests",
    dashboard_hoursThisMonth: "Hours this month",
    dashboard_avgCheck: "Avg. check",
    dashboard_allProcessed: "All requests processed",
    dashboard_createTicket: "Create ticket",
    dashboard_title: "Title",
    dashboard_client: "Client",
    dashboard_service: "Service",
    dashboard_slaMinutes: "SLA (minutes)",
    dashboard_requestDescription: "Request description",
    dashboard_cancel: "Cancel",

    /* Chat list */
    chatList_search: "Search",
    chatList_new: "New",
    chatList_inProgress: "In progress",
    chatList_resolved: "Resolved",
    chatList_noRequests: "No requests yet",
    chatList_shareLink: "Share your channel link so clients can reach you",
    chatList_copyLink: "Copy link",

    /* Chat */
    chat_replyToClient: "Reply to client...",
    chat_message: "Message...",
    chat_stickers: "Stickers",
    chat_attach: "Attach",
    chat_voiceMessage: "Voice message",
    chat_send: "Send",
    chat_you: "You",
    chat_agent: "Agent",
    chat_now: "now",
    chat_recording: "Recording...",
    chat_cancel: "Cancel",
    chat_today: "Today",
    chat_back: "Back",
    chat_supportChat: "Support chat",
    chat_channel: "Channel",
    chat_pause: "Pause",
    chat_play: "Play",
    chat_playbackError: "Playback error",

    /* Attachments */
    attach_photo: "Photo",
    attach_file: "File",
    attach_camera: "Camera",
    attach_location: "Location",
    attach_cameraUnavailable: "Camera unavailable in demo",

    /* Catalog / Showcase */
    catalog_showcase: "Showcase",
    catalog_free: "Free",
    catalog_empty: "Showcase is empty",
    catalog_addFirstService: "Add first service",
    catalog_bots: "Bots",
    catalog_providers: "Providers",
    catalog_all: "All",
    nav_marketplace: "Marketplace",
    marketplace_title: "Marketplace",
    marketplace_search: "Search services...",
    marketplace_allCategories: "All",
    marketplace_tgOnly: "Telegram only",
    marketplace_miniApp: "Mini App",
    marketplace_bot: "Bots",
    marketplace_channel: "Channels",
    marketplace_provider: "Providers",
    marketplace_free: "Free",
    marketplace_reviews: "reviews",
    marketplace_noReviews: "No reviews yet",
    marketplace_writeReview: "Write a review",
    marketplace_connect: "Connect",
    marketplace_empty: "Nothing found",
    marketplace_sla: "min reply",
    marketplace_agents: "agents",
    marketplace_sortBy: "Sort",
    marketplace_sortPrice: "By price",
    marketplace_sortRating: "By rating",
    marketplace_sortNew: "Newest",
    marketplace_filterLabel: "Filters",
    marketplace_tgOnlyHint: "Available in Telegram",
    marketplace_reviewsTab: "Reviews",
    marketplace_servicesTab: "Services",

    /* Stats */
    stats_week: "Week",
    stats_month: "Month",
    stats_allTime: "All time",
    stats_total: "Total",
    stats_resolved: "Resolved",
    stats_avgSla: "Avg. SLA",
    stats_maxWait: "Max wait",
    stats_byStatus: "By status",
    stats_min: "min",
    stats_noData: "Data will appear after the first request",

    /* Statuses (for badges / labels) */
    status_new: "New",
    status_inProgress: "In progress",
    status_waitingClient: "Waiting for client",
    status_resolved: "Resolved",
    status_closed: "Closed",
    status_spam: "Spam",
    status_duplicate: "Duplicate",

    /* Stats status breakdown */
    statsStatus_new: "New",
    statsStatus_inProgress: "In progress",
    statsStatus_waitingClient: "Waiting for client",
    statsStatus_resolved: "Resolved",
    statsStatus_closed: "Closed",

    /* Settings / More */
    more_management: "Management",
    more_services: "Services",
    more_servicesAndLinks: "Services & links",
    more_templates: "Templates",
    more_team: "Team",
    more_settings: "Settings",
    more_theme: "Theme",
    more_themeDay: "Light",
    more_themeNight: "Dark",
    more_accentColor: "Accent color",
    more_language: "Language",
    more_languageRussian: "Russian",
    more_languageEnglish: "English",
    more_palette: "Palette",
    more_paletteUpdated: "Palette updated",
    more_lightTheme: "Light theme",
    more_darkTheme: "Dark theme",
    more_back: "Back",

    /* Services management */
    services_existing: "Existing services",
    services_edit: "Edit",
    services_delete: "Delete",
    services_add: "Add service",
    services_editTitle: "Edit service",
    services_newTitle: "New service",
    services_nameLabel: "Service name *",
    services_namePlaceholder: "Name",
    services_descriptionLabel: "Description",
    services_descriptionPlaceholder: "Short service description",
    services_coverLabel: "Cover — URL input",
    services_coverAlt: "Cover",
    services_priceLabel: "Price",
    services_pricePlaceholder: "0 = free",
    services_currencyLabel: "Currency",
    services_slaLabel: "SLA minutes",
    services_slaPlaceholder: "Response time in minutes",
    services_save: "Save",
    services_cancel: "Cancel",
    services_copy: "Copy",
    services_copied: "Copied",
    services_fillName: "Please fill in the service name",
    services_updated: "Service updated",
    services_added: "Service added",
    services_deleted: "Service deleted",
    services_deleteConfirm: "Delete service?",
    services_free: "Free",
    services_coverUploaded: "Cover uploaded",
    services_coverUploadError: "Cover upload failed",
    services_uploadPhoto: "Upload photo",
    services_replacePhoto: "Replace photo",
    services_uploading: "Uploading...",
    services_removePhoto: "Remove",
    services_uniqueLink: "Unique link",
    services_directLink: "Direct link",
    folder_namePlaceholder: "Ads, Payments, Returns...",
    folder_keywordsPlaceholder: "ad, promo, announcement",

    /* Templates management */
    templates_add: "Add template",
    templates_editor: "Editor",
    templates_nameLabel: "Name",
    templates_namePlaceholder: "Template name",
    templates_textLabel: "Text",
    templates_textPlaceholder: "Template text",
    templates_save: "Save",
    templates_delete: "Delete",
    templates_noName: "(untitled)",
    templates_created: "New template created",
    templates_saved: "Template saved",
    templates_deleted: "Template deleted",
    templates_fillName: "Please fill in the template name",
    templates_cantDeleteLast: "Cannot delete the only template",
    templates_empty: "(empty)",

    /* Team management */
    team_invite: "Invite agent",
    team_newMember: "New member",
    team_nameLabel: "Name *",
    team_namePlaceholder: "Agent name",
    team_roleLabel: "Role",
    team_add: "Add",
    team_cancel: "Cancel",
    team_delete: "Delete",
    team_online: "online",
    team_offline: "offline",
    team_fillName: "Please fill in the agent name",
    team_agentAdded: "Agent added",
    team_memberDeleted: "Member deleted",
    team_cantDeleteSelf: "Cannot delete yourself",
    team_deleteConfirm: "Delete member?",

    /* Profile / Review */
    profile_requests: "Requests",
    profile_resolved: "Resolved",
    profile_rateSupport: "Rate support",
    profile_rateDescription: "Your review helps us improve.",
    profile_commentPlaceholder: "Comment for the team",
    profile_thankYou: "Thank you for your review!",
    profile_submitReview: "Submit review",
    profile_reviewSent: "Review submitted!",
    profile_history: "Request history",
    profile_all: "All",
    profile_active: "Active",
    profile_resolvedFilter: "Resolved",
    profile_rate: "Rate",
    profile_notes: "Notes",

    /* Review (chat) */
    review_rateChannel: "Rate channel",
    review_leaveReview: "Leave review",
    review_submitReview: "Submit review",
    review_thanks: "Thanks for your rating!",
    review_stars: "stars",

    /* Time formatting */
    time_ago: "ago",
    time_hours: "h",
    time_days: "d",

    /* Toast / system messages */
    toast_justNow: "just now",
    toast_ticketCreated: "Ticket created",
    toast_browserNoRecording: "Browser doesn't support recording",
    toast_noMicAccess: "No microphone access",
    toast_micPermissionDenied: "Microphone access denied. Allow in browser settings",
    toast_micNotFound: "Microphone not found",
    toast_micBusy: "Microphone is busy with another app",
    toast_playbackError: "Playback error",
    toast_agentAdded: "Agent added",

    /* Tickets page */
    tickets_title: "Tickets",
    tickets_queue: "Request queue",
    tickets_searchPlaceholder: "Search by number, client, title",
    tickets_all: "All",
    tickets_new: "New",
    tickets_waiting: "Waiting",
    tickets_overdue: "Overdue",
    tickets_sortBySla: "By SLA",
    tickets_sortByStatus: "By status",
    tickets_nothingFound: "Nothing found",

    /* Services page (client) */
    servicesPage_services: "Services",
    servicesPage_ads: "Ads",
    servicesPage_rate: "Rate",
    servicesPage_selectService: "Select a service to open support chat.",
    servicesPage_agents: "agents",
    servicesPage_noAds: "This channel has no ads yet.",
    servicesPage_contactSeller: "Contact seller",

    /* Relative time */
    time_justNow: "just now",
    time_minAgo: "min ago",
    time_hAgo: "h ago",
    time_dAgo: "d ago",

    /* Folders */
    folder_management: "Chat folders",
    folder_allFolders: "All folders",
    folder_moveToFolder: "Move to folder",
    folder_removeFromFolders: "Remove from folders",
    folder_dragHint: "Drag onto a folder above ↑",
    folder_fillName: "Enter folder name",
    folder_created: "Folder created",
    folder_updated: "Folder updated",
    folder_deleted: "Folder deleted",
    folder_deleteConfirm: "Delete folder?",
    folder_newTitle: "New folder",
    folder_editTitle: "Edit folder",
    folder_nameLabel: "Name",
    folder_colorLabel: "Color",
    folder_keywordsLabel: "Keywords (comma-separated)",
    folder_keywordsHint: "comma-separated",
    folder_createBtn: "Create folder",
    folder_emptyHint: "No folders yet. Create your first folder for auto-sorting chats.",
    folder_noKeywords: "No keywords",
    folder_keywordsHintFull: "A chat is automatically placed in the folder if one of these words appears in the message",
    more_folders: "Chat folders",

    /* Admin marketplace (seller view) */
    adminMkt_title: "Marketplace",
    adminMkt_tabListings: "My Listings",
    adminMkt_tabProfile: "Seller Profile",
    adminMkt_addListing: "Add listing",
    adminMkt_editListing: "Edit",
    adminMkt_statusActive: "Active",
    adminMkt_statusPaused: "Paused",
    adminMkt_statusDraft: "Draft",
    adminMkt_views: "views",
    adminMkt_leads: "leads",
    adminMkt_noListings: "No listings",
    adminMkt_addFirst: "Add your first listing so clients can find you in the marketplace",
    adminMkt_pause: "Pause",
    adminMkt_activate: "Activate",
    adminMkt_delete: "Delete",
    adminMkt_deleteConfirm: "Delete listing?",
    adminMkt_profileTitle: "Seller Profile",
    adminMkt_profileName: "Company name",
    adminMkt_profileDesc: "About",
    adminMkt_profileSave: "Save profile",
    adminMkt_profileSaved: "Profile updated",
    adminMkt_totalListings: "Listings",
    adminMkt_totalViews: "Views",
    adminMkt_totalLeads: "Leads",
    adminMkt_avgRating: "Rating",
    adminMkt_nameLabel: "Service name",
    adminMkt_descLabel: "Description",
    adminMkt_priceLabel: "Price (₽)",
    adminMkt_slaLabel: "SLA (min)",
    adminMkt_typeLabel: "Channel type",
    adminMkt_saved: "Listing saved",
    adminMkt_deleted: "Listing deleted",
    adminMkt_paused: "Listing paused",
    adminMkt_activated: "Listing activated",
    adminMkt_fillName: "Enter service name",
    adminMkt_promote: "Promote",
    adminMkt_promoted: "Listing sent for promotion",

    /* Misc */
    common_cancel: "Cancel",
    common_save: "Save",
    common_delete: "Delete",
    common_back: "Back",
    common_min: "min",

    /* Dashboard (extra) */
    dashboard_avgResponseTime: "Avg. response time",
    dashboard_slaCompleted: "SLA fulfilled",
    dashboard_slaGoal: "goal 85%",
    dashboard_serviceOptions_consultation: "Consultation",
    dashboard_serviceOptions_returns: "Returns",
    dashboard_serviceOptions_techSupport: "Tech support",
    dashboard_serviceOptions_booking: "Booking",
    dashboard_months_nov: "Nov",
    dashboard_months_dec: "Dec",
    dashboard_months_jan: "Jan",
    dashboard_months_feb: "Feb",
    dashboard_months_mar: "Mar",
    dashboard_months_apr: "Apr",

    /* Stats (extra) */
    stats_efficiency: "Efficiency",
    stats_firstReply: "First reply",
    stats_popularServices: "Popular services",
    stats_slaFive: "SLA ≤5 min",
    stats_noPeriodData: "No data for this period",
    stats_choosePeriod: "Choose another period",
    stats_close: "Close",
    stats_trendUp: "↑ +12% vs previous period",
    stats_trendDown: "↓ -8% vs previous period",
    stats_trendFlat: "≈ no change",

    /* Home page status bar */
    home_statusTitle: "Request status",
    home_statusNew: "New",
    home_statusInProgress: "In progress",
    home_statusWaiting: "Waiting",
    home_statusResolved: "Resolved",
    home_statusClosed: "Closed",

    /* Client chat page */
    clientChat_title: "Support chat",
    clientChat_online: "online",

    /* Admin chat page */
    adminChat_title: "Chat",

    /* Services page (extra) */
    servicesPage_channel: "Channel",
    servicesPage_resultsCount: "services",

    /* Profile page (fixes) */
    profile_starRating: "stars",
    profile_filterAll: "All",
    profile_filterActive: "Active",
    profile_filterResolved: "Resolved",

    /* Admin marketplace (extra) */
    adminMkt_coverLabel: "Add cover",
    adminMkt_logoLabel: "Service logo",
    adminMkt_descPlaceholder: "Describe your service in detail...",
    adminMkt_cancelAriaLabel: "Cancel",
    adminMkt_listingsCount: "services",
    adminMkt_coverUploaded: "Cover uploaded",
    adminMkt_activeListings: "active",
    adminMkt_menuLabel: "Listing menu",
    adminMkt_uploadCoverLabel: "Upload cover",
    adminMkt_uploadLogoLabel: "Upload logo",
    adminMkt_uploadBannerLabel: "Change banner",
    adminMkt_uploadAvatarLabel: "Upload avatar",
    adminMkt_detailLabel: "Details",
    adminMkt_editLabel: "Edit",
    adminMkt_pauseLabel: "Pause",
    adminMkt_activateLabel: "Activate",
    adminMkt_promoteLabel: "Promote",
    adminMkt_deleteLabel: "Delete",
    adminMkt_backLabel: "Back",
    adminMkt_saveProfileLabel: "Save profile",
    adminMkt_clearFilterLabel: "Clear filter",
    adminMkt_addListingLabel: "Add listing",
    adminMkt_filterLabel: "Filter",
    adminMkt_editShort: "Edit",
    adminMkt_reviews: "reviews",
    adminMkt_agents: "agents",
    adminMkt_statusLabel: "Status",
    adminMkt_analyticsTab: "Analytics",
    adminMkt_viewsByListing: "Views by listing",
    adminMkt_conversionFunnel: "Conversion funnel",
    adminMkt_impressions: "Impressions",
    adminMkt_viewsLabel: "Views",
    adminMkt_applicationsLabel: "Applications",
    adminMkt_byStatus: "By status",
    adminMkt_editListingAriaLabel: "Edit listing",
    adminMkt_profilePreview: "How it looks in marketplace",
    adminMkt_yourCompany: "Your company",
    adminMkt_companyNamePlaceholder: "Company name",
    adminMkt_aboutPlaceholder: "Tell about your company...",
    adminMkt_telegramLink: "Telegram link",
    adminMkt_city: "City",
    adminMkt_cityPlaceholder: "City",
    adminMkt_bannerAlt: "Banner",
    adminMkt_avatarAlt: "Avatar",
    adminMkt_changeBannerBtn: "Change banner",
    adminMkt_coverAlt: "Cover",
    adminMkt_namePlaceholder: "E.g. Order consultation",
    adminMkt_pricePlaceholder: "0 = free",
    adminMkt_agentsLabel: "Agents",

    /* More page (extra) */
    more_noWorkspace: "No active workspace",

    /* Review overlay */
    review_starRatingLabel: "stars",
    review_commentPlaceholder: "Comment for the team",
    review_submit: "Submit review",
    review_cancel: "Cancel",
    review_thankYou: "Thank you for your review!",
    review_sent: "Review submitted!",

    /* Top bar */
    topBar_logout: "Log out",

    /* Voice recorder */
    voiceRec_cancelRecord: "Cancel recording",
    voiceRec_stopSend: "Stop and send",
    voiceRec_send: "Send",
    voiceRec_lock: "Lock recording",
    voiceRec_slideToCancel: "Slide to cancel",
    voiceRec_releaseToCancel: "Release to cancel",

    error_title: "Something went wrong",
    error_description: "An unexpected error occurred. Please try reloading the page.",
    error_retry: "Try again",
  },
};

/* ----------------------------------------------------------------
   Reactive store
   ---------------------------------------------------------------- */

let currentLocale: Locale = "ru";
const listeners = new Set<() => void>();

/** Get the current active locale */
export function getLocale(): Locale {
  return currentLocale;
}

/** Switch the active locale — triggers re-render in all useLocale() consumers */
export function setLocale(locale: Locale): void {
  if (locale === currentLocale) return;
  currentLocale = locale;
  try {
    localStorage.setItem("crm-chat-locale", locale);
  } catch {
    /* localStorage may be unavailable in some environments */
  }
  listeners.forEach((fn) => fn());
}

/** Translate a key using the current locale */
export function t(key: keyof TranslationKeys): string {
  return translations[currentLocale]?.[key] ?? key;
}

/** Subscribe to locale changes — returns an unsubscribe function */
export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/* ----------------------------------------------------------------
   React hook — uses useSyncExternalStore for tear-free reads
   ---------------------------------------------------------------- */

function getSnapshot(): Locale {
  return currentLocale;
}

function getServerSnapshot(): Locale {
  return "ru";
}

/**
 * React hook that re-renders the component when the locale changes.
 * Returns the current locale and a bound `t` function.
 *
 * @example
 * function MyComponent() {
 *   const { locale, t } = useLocale();
 *   return <span>{t("nav_home")}</span>;
 * }
 */
export function useLocale(): { locale: Locale; t: typeof t } {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // Return `t` bound to the current closure so components always get fresh translations
  // even though `t` itself reads `currentLocale` at call time.
  void locale; // ensure the subscription triggers re-render
  return { locale, t };
}

/* ----------------------------------------------------------------
   Initialise from persisted preference
   ---------------------------------------------------------------- */

try {
  const stored = localStorage.getItem("crm-chat-locale");
  if (stored === "en" || stored === "ru") {
    currentLocale = stored;
  }
} catch {
  /* localStorage may be unavailable */
}

/* ----------------------------------------------------------------
   Type export for consumers that need the key union
   ---------------------------------------------------------------- */

export type TranslationKey = keyof TranslationKeys;
