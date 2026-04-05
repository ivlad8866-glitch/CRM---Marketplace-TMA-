import { useEffect, useRef } from "react";
import type { ClientTab, AdminTab } from "../../types";
import { useLocale } from "../../lib/i18n";

type BottomNavProps = {
  role: "client" | "admin";
  clientTab: ClientTab;
  adminTab: AdminTab;
  adminMoreScreen: string;
  unreadCount?: number;
  onClientTabChange: (tab: ClientTab) => void;
  onAdminTabChange: (tab: AdminTab) => void;
};

function IconHome() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconChats() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  );
}

function IconTicket() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function IconStats() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

function IconMarketplace() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  );
}

export default function BottomNav({
  role,
  clientTab,
  adminTab,
  unreadCount = 0,
  onClientTabChange,
  onAdminTabChange,
}: BottomNavProps) {
  const { t } = useLocale();

  const navRef = useRef<HTMLElement>(null);
  const activeTab = role === "client" ? clientTab : adminTab;

  useEffect(() => {
    if (!navRef.current) return;
    const active = navRef.current.querySelector(".tab-bar__btn--active") as HTMLElement | null;
    if (active) {
      active.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeTab]);

  const clientTabs: [ClientTab, string, React.FC][] = [
    ["home", t("nav_home"), IconHome],
    ["chats", t("nav_chats"), IconChats],
    ["catalog", t("nav_marketplace"), IconGrid],
    ["stats", t("nav_stats"), IconStats],
    ["profile", t("nav_settings"), IconSettings],
  ];

  const adminTabs: [AdminTab, string, React.FC][] = [
    ["dashboard", t("nav_home"), IconHome],
    ["chats", t("nav_chats"), IconChats],
    ["tickets", t("nav_tickets"), IconTicket],
    ["stats", t("nav_stats"), IconStats],
    ["marketplace", t("nav_marketplace"), IconMarketplace],
    ["more", t("nav_settings"), IconSettings],
  ];

  const tabs = role === "client" ? clientTabs : adminTabs;

  return (
    <nav className="tab-bar" role="tablist" ref={navRef}>
      {tabs.map(([tab, label, Icon]) => {
        const isActive = role === "client" ? clientTab === tab : adminTab === tab;
        const isChatsTab = tab === "chats";

        return (
          <button
            key={tab}
            className={`tab-bar__btn ${isActive ? "tab-bar__btn--active" : ""}`}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => {
              window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light");
              if (role === "client") onClientTabChange(tab as ClientTab);
              else onAdminTabChange(tab as AdminTab);
            }}
          >
            <span className="tab-bar__icon">
              <Icon />
              {isChatsTab && unreadCount > 0 && (
                <span className="tab-bar__badge">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </span>
            <span className="tab-bar__label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
