import { useLocale, setLocale, getLocale } from "../../lib/i18n";

type TopBarProps = {
  isAuthenticated: boolean;
  firstName: string | undefined;
  role: "client" | "admin";
  onRoleChange: (role: "client" | "admin") => void;
  onLogout: () => void;
};

export default function TopBar({
  isAuthenticated,
  firstName,
  role,
  onRoleChange,
  onLogout,
}: TopBarProps) {
  const { locale, t } = useLocale();
  const initial = (firstName ?? "U").charAt(0).toUpperCase();

  const toggleLocale = () => {
    setLocale(locale === "ru" ? "en" : "ru");
  };

  return (
    <header className="topbar">
      {/* Left: avatar + language toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, width: 80 }}>
        {isAuthenticated && (
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "var(--primary)", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 600, flexShrink: 0,
          }}>
            {initial}
          </div>
        )}
        {/* Language toggle */}
        <button
          type="button"
          onClick={toggleLocale}
          style={{
            height: 26, padding: "0 8px", borderRadius: 9999,
            border: "1px solid var(--divider)", background: "var(--surface)",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
            color: "var(--text-secondary)", fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 3,
            flexShrink: 0, transition: "background 0.15s",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
          </svg>
          {locale.toUpperCase()}
        </button>
      </div>

      {/* Center title */}
      <span style={{
        flex: 1, textAlign: "center",
        fontSize: 17, fontWeight: 600, letterSpacing: "-0.3px",
        color: "var(--text)",
      }}>
        CRM Chat
      </span>

      {/* Right */}
      <div style={{ width: 80, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        {isAuthenticated ? (
          <button
            type="button"
            onClick={onLogout}
            aria-label={t("topBar_logout")}
            style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "none", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--text-hint)",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        ) : (
          <div style={{ display: "flex", gap: 4, background: "var(--surface)", borderRadius: 9999, padding: 2 }}>
            <button
              type="button"
              onClick={() => onRoleChange("client")}
              style={{
                padding: "4px 10px", border: "none", borderRadius: 9999,
                fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                background: role === "client" ? "var(--primary)" : "transparent",
                color: role === "client" ? "#fff" : "var(--text-hint)",
              }}
            >
              {t("auth_client")}
            </button>
            <button
              type="button"
              onClick={() => onRoleChange("admin")}
              style={{
                padding: "4px 10px", border: "none", borderRadius: 9999,
                fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                background: role === "admin" ? "var(--primary)" : "transparent",
                color: role === "admin" ? "#fff" : "var(--text-hint)",
              }}
            >
              {t("auth_admin")}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
