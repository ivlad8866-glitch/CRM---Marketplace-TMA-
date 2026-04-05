import { useState } from "react";
import type { Ticket } from "../../types";
import { demoChannels } from "../../data/demo-data";
import { useLocale } from "../../lib/i18n";

type ChatListPageProps = {
  tickets: Ticket[];
  chatListQuery: string;
  onQueryChange: (q: string) => void;
  onOpenChat: (ticketId: string, channelId: string, serviceName: string) => void;
};

const AVATAR_COLORS = ["#2AABEE", "#FF9500", "#34c759", "#9b59b6", "#e67e22", "#ff3b30"];
const STATUS_DOT: Record<string, string> = { new: "#ff3b30", in_progress: "#2AABEE", waiting_customer: "#ff9f0a", resolved: "#34c759", closed: "#8e8e93" };
type FilterKey = "all" | "new" | "in_progress" | "resolved";

function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return Math.abs(h); }

export default function ChatListPage({ tickets, chatListQuery, onQueryChange, onOpenChat }: ChatListPageProps) {
  const { t } = useLocale();
  const [filter, setFilter] = useState<FilterKey>("all");

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: "all", label: t("dashboard_all") },
    { key: "new", label: t("chatList_new") },
    { key: "in_progress", label: t("chatList_inProgress") },
    { key: "resolved", label: t("chatList_resolved") },
  ];
  const q = chatListQuery.trim().toLowerCase();

  const items = tickets
    .map((t) => ({ ticket: t, channel: demoChannels.find((c) => c.services.some((s) => s.name === t.service)) ?? demoChannels[0] }))
    .filter(({ ticket }) => {
      if (filter !== "all" && ticket.status !== filter) return false;
      if (q && !ticket.title.toLowerCase().includes(q) && !ticket.lastMessage.toLowerCase().includes(q)) return false;
      return true;
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg)" }}>
      <div style={{ padding: "8px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", height: 36, background: "var(--surface)", borderRadius: 10, padding: "0 10px", marginBottom: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-hint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginRight: 8 }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input placeholder={t("chatList_search")} value={chatListQuery} onChange={(e) => onQueryChange(e.target.value)} style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 15, color: "var(--text)", lineHeight: "36px", fontFamily: "inherit" }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, padding: "0 16px", marginBottom: 8, overflowX: "auto", flexShrink: 0 }}>
        {FILTERS.map((f) => (
          <button key={f.key} type="button" onClick={() => setFilter(f.key)} style={{ padding: "6px 14px", borderRadius: 9999, fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, fontFamily: "inherit", background: filter === f.key ? "var(--primary)" : "var(--surface)", color: filter === f.key ? "#fff" : "var(--text-secondary)", transition: "background 0.15s, color 0.15s" }}>
            {f.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {items.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "64px 32px", textAlign: "center" }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="var(--text-hint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}><path d="M8 36V12a4 4 0 014-4h24a4 4 0 014 4v16a4 4 0 01-4 4H16l-8 8z" /></svg>
            <div style={{ fontSize: 15, color: "var(--text-hint)", marginBottom: 4 }}>{t("chatList_noRequests")}</div>
            <div style={{ fontSize: 12, color: "var(--text-hint)", marginBottom: 16, maxWidth: 240 }}>{t("chatList_shareLink")}</div>
            <button
              type="button"
              style={{ padding: "8px 20px", borderRadius: 9999, background: "var(--primary)", color: "#fff", fontSize: 15, fontWeight: 500, border: "none", cursor: "pointer", fontFamily: "inherit" }}
              onClick={() => {
                navigator.clipboard.writeText(window.location.href).catch(() => {});
              }}
            >{t("chatList_copyLink")}</button>
          </div>
        ) : items.map(({ ticket, channel }, idx) => (
          <div key={ticket.id} className="cascade-item" style={{ animationDelay: `${idx * 30}ms` }}>
            <button type="button" className="pressable" onClick={() => onOpenChat(ticket.id, channel.id, ticket.title)} style={{ display: "flex", alignItems: "center", width: "100%", height: 72, padding: "0 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: AVATAR_COLORS[hash(ticket.id) % AVATAR_COLORS.length], display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff", fontSize: 18, fontWeight: 600 }}>{ticket.title.charAt(0).toUpperCase()}</div>
              <div style={{ flex: 1, marginLeft: 12, overflow: "hidden", minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_DOT[ticket.status] ?? "#8e8e93", flexShrink: 0, marginRight: 6 }} />
                    <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ticket.title}</span>
                  </div>
                  <span style={{ fontSize: 12, color: ticket.slaMinutes <= 3 ? "var(--destructive)" : "var(--text-hint)", flexShrink: 0, marginLeft: 8 }}>{ticket.updatedAt}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                  <span style={{ fontSize: 15, color: "var(--text-hint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1, minWidth: 0 }}>{ticket.lastMessage}</span>
                  {ticket.status === "new" && <span style={{ minWidth: 20, height: 20, borderRadius: 10, background: "var(--primary)", color: "#fff", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px", flexShrink: 0, marginLeft: 8 }}>1</span>}
                  {ticket.status === "waiting_customer" && <span style={{ minWidth: 20, height: 20, borderRadius: 10, background: "#ff9f0a", color: "#fff", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px", flexShrink: 0, marginLeft: 8 }}>!</span>}
                </div>
              </div>
            </button>
            {idx < items.length - 1 && <div style={{ height: 0.5, background: "var(--divider)", marginLeft: 76 }} />}
          </div>
        ))}
      </div>
    </div>
  );
}
