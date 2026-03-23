import { useState } from "react";
import type { AdminMoreScreen } from "../../types";
import { demoServices, demoTemplates } from "../../data/demo-data";
import { IS_DEV } from "../../lib/adapters";

type MorePageProps = {
  adminMoreScreen: AdminMoreScreen;
  themeMode: "day" | "night";
  accentColor: string;
  onSetAdminMoreScreen: (screen: AdminMoreScreen) => void;
  onSetThemeMode: (mode: "day" | "night") => void;
  onSetAccentColor: (color: string) => void;
  showToast: (msg: string) => void;
};

export default function MorePage({
  adminMoreScreen,
  themeMode,
  accentColor,
  onSetAdminMoreScreen,
  onSetThemeMode,
  onSetAccentColor,
  showToast,
}: MorePageProps) {
  /* Local state for services/templates editing */
  const [serviceDraft, setServiceDraft] = useState({
    name: "Консультация",
    startParam: "consult_42",
    shortName: "support",
  });
  const [copied, setCopied] = useState<string | null>(null);
  const [macroDraft, setMacroDraft] = useState(demoTemplates[0]);

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

  /* ---- Menu ---- */
  if (adminMoreScreen === "menu") {
    return (
      <div className="screen" key="admin-more-menu">
        <div className="screen__header">
          <h2>Управление</h2>
        </div>
        <div className="menu-list">
          <button className="menu-item" type="button" onClick={() => onSetAdminMoreScreen("services")}>
            <span className="menu-item__icon">&#128279;</span>
            <span>Услуги и ссылки</span>
            <span className="menu-item__arrow">&#8250;</span>
          </button>
          <button className="menu-item" type="button" onClick={() => onSetAdminMoreScreen("templates")}>
            <span className="menu-item__icon">&#128196;</span>
            <span>Шаблоны</span>
            <span className="menu-item__arrow">&#8250;</span>
          </button>
          <button className="menu-item" type="button" onClick={() => onSetAdminMoreScreen("team")}>
            <span className="menu-item__icon">&#128101;</span>
            <span>Команда</span>
            <span className="menu-item__arrow">&#8250;</span>
          </button>
          <button className="menu-item" type="button" onClick={() => onSetAdminMoreScreen("settings")}>
            <span className="menu-item__icon">&#9881;</span>
            <span>Настройки</span>
            <span className="menu-item__arrow">&#8250;</span>
          </button>
        </div>
      </div>
    );
  }

  /* ---- Services ---- */
  if (adminMoreScreen === "services") {
    return (
      <div className="screen" key="admin-services">
        <div className="screen__header">
          <button className="back-link" type="button" onClick={() => onSetAdminMoreScreen("menu")}>
            &#8592; Назад
          </button>
          <h2>Услуги и ссылки</h2>
        </div>

        <div className="section-block">
          <div className="form-field">
            <label>Название услуги</label>
            <input
              value={serviceDraft.name}
              onChange={(e) => setServiceDraft((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="form-field">
            <label>start_param</label>
            <input
              value={serviceDraft.startParam}
              onChange={(e) => setServiceDraft((prev) => ({ ...prev, startParam: e.target.value }))}
            />
          </div>
          <div className="form-field">
            <label>short_name</label>
            <input
              value={serviceDraft.shortName}
              onChange={(e) => setServiceDraft((prev) => ({ ...prev, shortName: e.target.value }))}
            />
          </div>

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
                  copyToClipboard(`t.me/your_bot?startapp=${serviceDraft.startParam}&mode=compact`)
                }
              >
                {copied?.includes(serviceDraft.startParam) ? "OK" : "Копировать"}
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
                    copyToClipboard(`t.me/your_bot?startapp=${svc.startParam}&mode=compact`)
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
  }

  /* ---- Templates ---- */
  if (adminMoreScreen === "templates") {
    return (
      <div className="screen" key="admin-templates">
        <div className="screen__header">
          <button className="back-link" type="button" onClick={() => onSetAdminMoreScreen("menu")}>
            &#8592; Назад
          </button>
          <h2>Шаблоны</h2>
        </div>

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

        <div className="section-block">
          <h3>Редактор</h3>
          <div className="form-field">
            <label>Название</label>
            <input
              value={macroDraft.title}
              onChange={(e) => setMacroDraft((prev) => ({ ...prev, title: e.target.value }))}
            />
          </div>
          <div className="form-field">
            <label>Текст</label>
            <textarea
              value={macroDraft.text}
              rows={4}
              onChange={(e) => setMacroDraft((prev) => ({ ...prev, text: e.target.value }))}
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

          <div className="template-preview">
            <div className="bubble bubble--agent">
              <span>{macroDraft.text}</span>
              <small>Preview</small>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---- Team ---- */
  if (adminMoreScreen === "team") {
    return (
      <div className="screen" key="admin-team">
        <div className="screen__header">
          <button className="back-link" type="button" onClick={() => onSetAdminMoreScreen("menu")}>
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
  }

  /* ---- Settings ---- */
  return (
    <div className="screen" key="admin-settings">
      <div className="screen__header">
        <button className="back-link" type="button" onClick={() => onSetAdminMoreScreen("menu")}>
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
                  onSetAccentColor(s.color);
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
                onSetThemeMode("day");
                showToast("Светлая тема");
              }}
            >
              day
            </button>
            <button
              className={`chip ${themeMode === "night" ? "chip--active" : ""}`}
              type="button"
              onClick={() => {
                onSetThemeMode("night");
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
}
