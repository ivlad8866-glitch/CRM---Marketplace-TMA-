import { useMemo } from "react";
import type { Ticket } from "../../types";
import { useLocale } from "../../lib/i18n";

type HomePageProps = {
  tickets: Ticket[];
  onOpenChat: (ticketId: string) => void;
  onGoToChats: () => void;
  onGoToStats: () => void;
};

/* ── helpers ── */

function getGreeting(t: (key: Parameters<ReturnType<typeof useLocale>["t"]>[0]) => string): string {
  const hour = new Date().getHours();
  if (hour < 12) return t("greeting_morning");
  if (hour < 18) return t("greeting_afternoon");
  return t("greeting_evening");
}

/* Up/down delta arrow inline component */
function Delta({ value, unit = "%" }: { value: number; unit?: string }) {
  const positive = value >= 0;
  const color = positive ? "#34c759" : "#ff3b30";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 11, fontWeight: 600, color }}>
      <svg width="10" height="10" viewBox="0 0 10 10" fill={color}>
        {positive
          ? <polygon points="5,1 9,8 1,8" />
          : <polygon points="5,9 9,2 1,2" />}
      </svg>
      {Math.abs(value)}{unit}
    </span>
  );
}

/* Mini sparkline — 5 bars */
function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <span style={{ display: "inline-flex", alignItems: "flex-end", gap: 2, height: 20 }}>
      {values.map((v, i) => (
        <span key={i} style={{
          width: 5,
          height: `${Math.round((v / max) * 20)}px`,
          borderRadius: 2,
          background: "var(--primary)",
          opacity: i === values.length - 1 ? 1 : 0.3,
          display: "block",
        }} />
      ))}
    </span>
  );
}

/* Status progress bar — shows breakdown of ticket statuses */
function StatusBar({ tickets }: { tickets: Ticket[] }) {
  const { t } = useLocale();
  const total = tickets.length;
  if (total === 0) return null;

  const segments = [
    { status: "new",              color: "#ff3b30", label: t("home_statusNew") },
    { status: "in_progress",      color: "#2AABEE", label: t("home_statusInProgress") },
    { status: "waiting_customer", color: "#ff9f0a", label: t("home_statusWaiting") },
    { status: "resolved",         color: "#34c759", label: t("home_statusResolved") },
    { status: "closed",           color: "#8e8e93", label: t("home_statusClosed") },
  ] as const;

  const counts = segments.map((s) => ({
    ...s,
    count: tickets.filter((tick) => tick.status === s.status).length,
  })).filter((s) => s.count > 0);

  return (
    <div style={{ background: "var(--surface-card)", borderRadius: 16, padding: "14px 16px", boxShadow: "var(--shadow-card)", marginBottom: 24 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 10 }}>
        {t("home_statusTitle")}
      </div>
      {/* Segmented bar */}
      <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", gap: 1, marginBottom: 10 }}>
        {counts.map((s) => (
          <div key={s.status} style={{ flex: s.count, background: s.color, transition: "flex 0.4s ease" }} />
        ))}
      </div>
      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px" }}>
        {counts.map((s) => (
          <span key={s.status} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-hint)" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, display: "inline-block", flexShrink: 0 }} />
            {s.label}: <strong style={{ color: "var(--text-secondary)", marginLeft: 2 }}>{s.count}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Main component ── */

export default function HomePage({ tickets, onOpenChat, onGoToChats, onGoToStats }: HomePageProps) {
  const { t } = useLocale();

  const total    = tickets.length;
  const resolved = tickets.filter((t) => t.status === "resolved" || t.status === "closed").length;
  const active   = tickets.filter((t) => t.status === "new" || t.status === "in_progress").length;

  const urgent = useMemo(() =>
    tickets
      .filter((t) => t.status === "new" || t.status === "in_progress")
      .sort((a, b) => a.slaMinutes - b.slaMinutes)
      .slice(0, 3),
    [tickets]
  );

  /* Demo deltas and sparklines (replace with real data when backend provides history) */
  const kpiConfig = [
    { value: total,    label: t("dashboard_requests"), onClick: onGoToStats, delta: 12,  spark: [8, 10, 9, 12, total] },
    { value: resolved, label: t("dashboard_resolved"), onClick: onGoToStats, delta: 8,   spark: [4, 7, 6, 9, resolved] },
    { value: active,   label: t("dashboard_active"),   onClick: onGoToChats, delta: -5,  spark: [5, 3, 4, 6, active] },
  ];

  return (
    <div style={{ padding: "0 16px 32px", overflowY: "auto" }}>

      {/* Greeting */}
      <div className="cascade-item" style={{ height: 52, display: "flex", alignItems: "center", fontSize: 15, color: "var(--text-hint)" }}>
        {getGreeting(t)}
      </div>

      {/* KPI cards — 3 columns */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        {kpiConfig.map((stat, i) => (
          <button
            key={stat.label}
            type="button"
            className="cascade-item"
            onClick={stat.onClick}
            style={{
              flex: 1, background: "var(--surface-card)", borderRadius: 16, padding: "12px 10px 10px",
              display: "flex", flexDirection: "column", animationDelay: `${i * 40}ms`,
              border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit",
              boxShadow: "var(--shadow-card)", transition: "opacity 0.15s",
            }}
          >
            {/* Value + sparkline */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
              <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px", lineHeight: 1.1, color: "var(--text)" }}>
                {stat.value}
              </span>
              <Sparkline values={stat.spark} />
            </div>
            {/* Label */}
            <span style={{ fontSize: 11, color: "var(--text-hint)", marginBottom: 6, lineHeight: 1.3 }}>
              {stat.label}
            </span>
            {/* Delta */}
            <Delta value={stat.delta} />
          </button>
        ))}
      </div>

      {/* Status breakdown bar */}
      <div className="cascade-item" style={{ animationDelay: "120ms" }}>
        <StatusBar tickets={tickets} />
      </div>

      {/* Urgent / awaiting reply section */}
      <div className="cascade-item" style={{ animationDelay: "160ms" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.3px", color: "var(--text)" }}>
            {t("dashboard_awaitingReply")}
          </span>
          <button
            type="button"
            onClick={onGoToChats}
            style={{ fontSize: 15, color: "var(--primary)", cursor: "pointer", background: "none", border: "none", fontFamily: "inherit", padding: 0 }}
          >
            {t("dashboard_all")}
          </button>
        </div>

        {urgent.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 16px" }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="var(--text-hint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
              <path d="M8 36V12a4 4 0 014-4h24a4 4 0 014 4v16a4 4 0 01-4 4H16l-8 8z" />
            </svg>
            <span style={{ fontSize: 15, color: "var(--text-hint)" }}>{t("dashboard_noActiveRequests")}</span>
          </div>
        ) : (
          <div style={{ background: "var(--surface-card)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
            {urgent.map((ticket, idx) => {
              const statusColor = ticket.status === "new" ? "#ff3b30" : ticket.status === "in_progress" ? "#2AABEE" : "#ff9f0a";
              const isCritical = ticket.slaMinutes <= 3;

              return (
                <div key={ticket.id}>
                  <button
                    type="button"
                    onClick={() => onOpenChat(ticket.id)}
                    style={{
                      display: "flex", alignItems: "center", width: "100%",
                      minHeight: 68, background: "none", border: "none",
                      cursor: "pointer", textAlign: "left", padding: "10px 14px",
                      borderLeft: `3px solid ${statusColor}`,
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%",
                      background: statusColor, color: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 17, fontWeight: 600, flexShrink: 0, position: "relative",
                    }}>
                      {ticket.title.charAt(0).toUpperCase()}
                      {/* Pulsing dot for critical SLA */}
                      {isCritical && (
                        <span style={{
                          position: "absolute", top: 0, right: 0,
                          width: 10, height: 10, borderRadius: "50%",
                          background: "#ff3b30", border: "2px solid var(--surface-card)",
                          animation: "pulse 1.5s infinite",
                        }} />
                      )}
                    </div>

                    <div style={{ flex: 1, marginLeft: 12, overflow: "hidden", minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {ticket.title}
                        </span>
                        <span style={{ fontSize: 12, color: isCritical ? "var(--destructive)" : "var(--text-hint)", flexShrink: 0 }}>
                          {ticket.updatedAt}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-hint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 3 }}>
                        {ticket.lastMessage}
                      </div>
                    </div>
                  </button>
                  {idx < urgent.length - 1 && (
                    <div style={{ height: 0.5, background: "var(--divider)", marginLeft: 71 }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
