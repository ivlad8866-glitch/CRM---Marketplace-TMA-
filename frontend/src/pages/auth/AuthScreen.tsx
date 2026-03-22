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
  return (
    <div className="app">
      <div className="auth-screen">
        <div className="auth-screen__logo">CRM Chat</div>
        <p className="auth-screen__subtitle">Выберите роль для входа</p>
        {authError && <div className="auth-screen__error">{authError}</div>}
        {isLoading && <div className="auth-screen__loading">Вход...</div>}
        <div className="auth-screen__buttons">
          <button
            className="auth-screen__btn auth-screen__btn--client"
            type="button"
            disabled={isLoading}
            onClick={() => onDevLogin(100000003)}
          >
            Клиент
          </button>
          <button
            className="auth-screen__btn auth-screen__btn--agent"
            type="button"
            disabled={isLoading}
            onClick={() => onDevLogin(100000002)}
          >
            Оператор
          </button>
          <button
            className="auth-screen__btn auth-screen__btn--admin"
            type="button"
            disabled={isLoading}
            onClick={() => onDevLogin(100000001)}
          >
            Администратор
          </button>
        </div>
        <button
          className="auth-screen__skip"
          type="button"
          onClick={onSkip}
        >
          Войти без бэкенда (демо)
        </button>
      </div>
    </div>
  );
}
