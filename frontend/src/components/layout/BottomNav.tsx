import type { ClientTab, AdminTab } from "../../types";

type BottomNavProps = {
  role: "client" | "admin";
  clientTab: ClientTab;
  adminTab: AdminTab;
  adminMoreScreen: string;
  onClientTabChange: (tab: ClientTab) => void;
  onAdminTabChange: (tab: AdminTab) => void;
};

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

export default function BottomNav({
  role,
  clientTab,
  adminTab,
  adminMoreScreen,
  onClientTabChange,
  onAdminTabChange,
}: BottomNavProps) {
  const tabs = role === "client" ? clientTabs : adminTabs;

  return (
    <nav className="tab-bar" role="tablist">
      {tabs.map(([tab, label, icon]) => {
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
                onClientTabChange(tab as ClientTab);
              } else {
                onAdminTabChange(tab as AdminTab);
              }
            }}
          >
            <span className="tab-bar__icon">{icon}</span>
            <span className="tab-bar__label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
