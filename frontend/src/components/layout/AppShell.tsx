import type { ReactNode } from "react";

type AppShellProps = {
  isChat: boolean;
  toast: string | null;
  children: ReactNode;
};

export default function AppShell({ isChat, toast, children }: AppShellProps) {
  return (
    <div className={`app ${isChat ? "app--chat" : ""}`}>
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
      {children}
    </div>
  );
}
