import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "24px",
            textAlign: "center",
            background: "var(--bg)",
            color: "var(--text)",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>&#9888;</div>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>
            Что-то пошло не так
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-secondary)",
              marginBottom: 24,
              maxWidth: 320,
            }}
          >
            Произошла непредвиденная ошибка. Попробуйте перезагрузить страницу.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              padding: "12px 32px",
              borderRadius: 12,
              border: "none",
              background: "var(--button-bg)",
              color: "var(--button-text)",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Попробовать снова
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
