interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

interface TelegramBackButton {
  show: () => void;
  hide: () => void;
  onClick: (cb: () => void) => void;
  offClick: (cb: () => void) => void;
}

interface TelegramHapticFeedback {
  impactOccurred: (style: "light" | "medium" | "heavy") => void;
  notificationOccurred: (type: "success" | "warning" | "error") => void;
  selectionChanged: () => void;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: Record<string, unknown>;
  themeParams?: TelegramThemeParams;
  ready: () => void;
  expand: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  BackButton: TelegramBackButton;
  HapticFeedback?: TelegramHapticFeedback;
  onEvent?: (event: string, cb: () => void) => void;
  offEvent?: (event: string, cb: () => void) => void;
}

interface TelegramNamespace {
  WebApp?: TelegramWebApp;
}

interface Window {
  Telegram?: TelegramNamespace;
}
