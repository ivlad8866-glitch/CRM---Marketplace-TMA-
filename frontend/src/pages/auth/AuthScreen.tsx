import { isTelegramEnv } from "../../lib/telegram";
import { useLocale } from "../../lib/i18n";

type AuthScreenProps = {
  isLoading: boolean;
  authError: string | null;
  onDevLogin: (telegramId: number) => void;
  onSkip: () => void;
};

export default function AuthScreen({
  isLoading,
  authError,
  onDevLogin,
  onSkip,
}: AuthScreenProps) {
  const { t } = useLocale();
  const inTelegram = isTelegramEnv();

  return (
    <div className="app">
      <div className="auth-screen">
        <div className="auth-screen__header">
          <div className="auth-screen__logo">C</div>
          <h1 className="auth-screen__title">{t("auth_title")}</h1>
        </div>

        {authError && <div className="auth-screen__error">{authError}</div>}

        {inTelegram ? (
          /* ── Inside Telegram: auto-login is in progress, show only spinner ── */
          <div className="auth-screen__loading">
            {isLoading || !authError ? t("auth_loggingIn") : null}
          </div>
        ) : (
          /* ── Dev / browser mode: manual role selection ── */
          <>
            <p className="auth-screen__subtitle">{t("auth_selectRole")}</p>

            {isLoading && <div className="auth-screen__loading">{t("auth_loggingIn")}</div>}

            <div className="auth-screen__buttons">
              <button
                className="auth-screen__btn auth-screen__btn--client"
                type="button"
                disabled={isLoading}
                onClick={() => onDevLogin(100000003)}
              >
                <span className="auth-screen__btn-icon" role="img" aria-label={t("auth_client")}>
                  👤
                </span>
                <span className="auth-screen__btn-label">{t("auth_client")}</span>
                <span className="auth-screen__btn-chevron" aria-hidden="true">›</span>
              </button>

              <button
                className="auth-screen__btn auth-screen__btn--agent"
                type="button"
                disabled={isLoading}
                onClick={() => onDevLogin(100000002)}
              >
                <span className="auth-screen__btn-icon" role="img" aria-label={t("auth_agent")}>
                  🎧
                </span>
                <span className="auth-screen__btn-label">{t("auth_agent")}</span>
                <span className="auth-screen__btn-chevron" aria-hidden="true">›</span>
              </button>

              <button
                className="auth-screen__btn auth-screen__btn--admin"
                type="button"
                disabled={isLoading}
                onClick={() => onDevLogin(100000001)}
              >
                <span className="auth-screen__btn-icon" role="img" aria-label={t("auth_administrator")}>
                  ⚙️
                </span>
                <span className="auth-screen__btn-label">{t("auth_administrator")}</span>
                <span className="auth-screen__btn-chevron" aria-hidden="true">›</span>
              </button>
            </div>

            <button className="auth-screen__skip" type="button" onClick={onSkip}>
              {t("auth_loginDemo")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
