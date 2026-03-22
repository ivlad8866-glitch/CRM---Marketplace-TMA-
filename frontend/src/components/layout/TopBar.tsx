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
  return (
    <header className="topbar">
      <div className="topbar__brand">CRM Chat</div>
      <div className="topbar__toggle">
        {isAuthenticated ? (
          <>
            <span className="topbar__user">
              {firstName ?? "User"} ({role === "client" ? "Клиент" : "Админ"})
            </span>
            <button
              className="toggle-btn"
              type="button"
              onClick={onLogout}
            >
              Выйти
            </button>
          </>
        ) : (
          <>
            <button
              className={`toggle-btn ${role === "client" ? "toggle-btn--active" : ""}`}
              type="button"
              onClick={() => onRoleChange("client")}
            >
              Клиент
            </button>
            <button
              className={`toggle-btn ${role === "admin" ? "toggle-btn--active" : ""}`}
              type="button"
              onClick={() => onRoleChange("admin")}
            >
              Админ
            </button>
          </>
        )}
      </div>
    </header>
  );
}
