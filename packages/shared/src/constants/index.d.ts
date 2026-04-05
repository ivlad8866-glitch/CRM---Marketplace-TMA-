export declare const LIMITS: {
    readonly PAGE_DEFAULT: 20;
    readonly PAGE_MAX: 100;
    readonly MESSAGES_PAGE: 50;
    readonly MESSAGE_MAX_LENGTH: 10000;
    readonly ATTACHMENT_MAX_SIZE: number;
    readonly ATTACHMENT_ALLOWED_MIMES: readonly ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/zip"];
    readonly ATTACHMENT_BLOCKED_EXTENSIONS: readonly [".exe", ".bat", ".cmd", ".sh", ".ps1", ".scr", ".com", ".msi", ".dll"];
    readonly MESSAGE_EDIT_WINDOW_MS: number;
    readonly TYPING_DEBOUNCE_MS: 1000;
    readonly TYPING_TIMEOUT_MS: 5000;
    readonly TOKEN_REFRESH_INTERVAL_MS: number;
    readonly SOCKET_RECONNECT_MAX_MS: 30000;
    readonly PRESENCE_TTL_SECONDS: 30;
    readonly HEARTBEAT_INTERVAL_MS: 15000;
};
export declare const TICKET_TRANSITIONS: Record<string, string[]>;
//# sourceMappingURL=index.d.ts.map