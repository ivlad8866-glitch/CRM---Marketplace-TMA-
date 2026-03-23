import type { Ticket, TicketStatus, Message, MessageType } from "../types";

/* ================================================================
   API to local type adapters
   ================================================================ */

export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.round(hours / 24);
  return `${days} д назад`;
}

const STATUS_MAP: Record<string, TicketStatus> = {
  NEW: "new",
  IN_PROGRESS: "in_progress",
  WAITING_CUSTOMER: "waiting_customer",
  RESOLVED: "resolved",
  CLOSED: "closed",
  SPAM: "spam",
  DUPLICATE: "duplicate",
};

export function apiTicketToLocal(t: any): Ticket {
  return {
    id: t.ticketNumber || t.id,
    clientNumber: t.customerNumber || "N/A",
    title: t.title || `Тикет ${t.ticketNumber}`,
    status: STATUS_MAP[t.status] || "new",
    lastMessage: t.lastMessage || "",
    updatedAt: t.updatedAt ? formatRelativeTime(t.updatedAt) : "",
    slaMinutes: t.slaDeadline
      ? Math.max(0, Math.round((new Date(t.slaDeadline).getTime() - Date.now()) / 60000))
      : 0,
    service: t.serviceName || "",
  };
}

export function apiMessageToLocal(m: any): Message {
  return {
    id: m.id,
    author: (m.authorType?.toLowerCase() || "system") as "customer" | "agent" | "system",
    text: m.text || "",
    time: new Date(m.createdAt).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }),
    type: (m.type?.toLowerCase() || "text") as MessageType,
  };
}

/* ================================================================
   Helpers
   ================================================================ */

export const IS_DEV = !window.Telegram?.WebApp?.initData;

export const getTelegram = () => window.Telegram?.WebApp;

export const formatRating = (r: number, count: number) =>
  `\u2605 ${r.toFixed(1)} (${count})`;

export const formatVoiceTime = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};
