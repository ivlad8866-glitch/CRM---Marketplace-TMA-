export function getTg() {
  return window.Telegram?.WebApp;
}

export function getInitData(): string {
  return getTg()?.initData ?? '';
}

export function isTelegramEnv(): boolean {
  return !!getTg()?.initData;
}

export function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  getTg()?.HapticFeedback?.impactOccurred(style);
}

export function hapticNotification(type: 'success' | 'warning' | 'error') {
  getTg()?.HapticFeedback?.notificationOccurred(type);
}

export function expandApp() {
  const tg = getTg();
  if (!tg) return;
  tg.ready();
  tg.expand();
  tg.setHeaderColor?.('#0e1621');
  tg.setBackgroundColor?.('#0e1621');
}

export function showBackButton(handler: () => void): () => void {
  const tg = getTg();
  if (!tg) return () => {};
  tg.BackButton.show();
  tg.BackButton.onClick(handler);
  return () => {
    tg.BackButton.offClick(handler);
    tg.BackButton.hide();
  };
}
