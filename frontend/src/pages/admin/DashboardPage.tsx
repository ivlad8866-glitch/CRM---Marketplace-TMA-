import { useState, useMemo, useRef } from "react";
import type { Ticket } from "../../types";
import { useLocale } from "../../lib/i18n";
import KpiCard from "../../components/ui/KpiCard";

type DashboardPageProps = {
  tickets: Ticket[];
  onOpenAdminChat: (ticketId: string) => void;
  onAddTicket: (ticket: Ticket) => void;
  showToast: (msg: string) => void;
  onGoToChats: () => void;
  onGoToTickets: () => void;
  onGoToStats: () => void;
};

/* ── Constants ── */

/* SERVICE_OPTIONS populated inside component after t() is available */
const AVATAR_PALETTE  = ["#2AABEE", "#34c759", "#ff9f0a", "#9b59b6", "#e67e22"];
const STATUS_COLOR: Record<string, string> = {
  new: "#ff3b30", in_progress: "#2AABEE", waiting_customer: "#ff9f0a",
  resolved: "#34c759", closed: "#8e8e93",
};

/* CHART_DATA month labels populated inside component after t() is available */
const CHART_AMOUNTS = [85_400, 64_200, 107_000, 71_300, 114_800, 142_500];
const CHART_HEIGHTS = ["60%", "45%", "75%", "50%", "80%", "90%"];

/* ── Helpers ── */

function hashCode(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function getGreeting(t: (key: Parameters<ReturnType<typeof useLocale>["t"]>[0]) => string) {
  const h = new Date().getHours();
  return h < 12 ? t("greeting_morning") : h < 18 ? t("greeting_afternoon") : t("greeting_evening");
}

function genClient() {
  return `C-${String(Math.floor(Math.random() * 999999) + 1).padStart(6, "0")}`;
}

/* ── Small shared widgets ── */

/** Up/down delta indicator */
function Delta({ value }: { value: number }) {
  const up    = value >= 0;
  const color = up ? "#34c759" : "#ff3b30";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 11, fontWeight: 600, color }}>
      <svg width="9" height="9" viewBox="0 0 10 10" fill={color} aria-hidden="true">
        {up ? <polygon points="5,1 9,8 1,8" /> : <polygon points="5,9 9,2 1,2" />}
      </svg>
      {Math.abs(value)}%
    </span>
  );
}

/** 5-bar mini sparkline */
function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <span style={{ display: "inline-flex", alignItems: "flex-end", gap: 2, height: 20, flexShrink: 0 }}>
      {values.map((v, i) => (
        <span key={i} style={{
          width: 5,
          height: `${Math.max(3, Math.round((v / max) * 20))}px`,
          borderRadius: 2,
          background: "var(--primary)",
          opacity: i === values.length - 1 ? 1 : 0.28,
          display: "block",
        }} />
      ))}
    </span>
  );
}

/* ── Main component ── */

export default function DashboardPage({
  tickets, onOpenAdminChat, onAddTicket, showToast,
  onGoToChats, onGoToTickets, onGoToStats,
}: DashboardPageProps) {
  const { t } = useLocale();

  const SERVICE_OPTIONS = [
    t("dashboard_serviceOptions_consultation"),
    t("dashboard_serviceOptions_returns"),
    t("dashboard_serviceOptions_techSupport"),
    t("dashboard_serviceOptions_booking"),
  ];

  const CHART_DATA = [
    { month: t("dashboard_months_nov"), amount: CHART_AMOUNTS[0], height: CHART_HEIGHTS[0] },
    { month: t("dashboard_months_dec"), amount: CHART_AMOUNTS[1], height: CHART_HEIGHTS[1] },
    { month: t("dashboard_months_jan"), amount: CHART_AMOUNTS[2], height: CHART_HEIGHTS[2] },
    { month: t("dashboard_months_feb"), amount: CHART_AMOUNTS[3], height: CHART_HEIGHTS[3] },
    { month: t("dashboard_months_mar"), amount: CHART_AMOUNTS[4], height: CHART_HEIGHTS[4] },
    { month: t("dashboard_months_apr"), amount: CHART_AMOUNTS[5], height: CHART_HEIGHTS[5] },
  ];

  const [modalOpen,   setModalOpen]   = useState(false);
  const [formTitle,   setFormTitle]   = useState("");
  const [formClient,  setFormClient]  = useState(() => genClient());
  const [formService, setFormService] = useState(() => t("dashboard_serviceOptions_consultation"));
  const [formSla,     setFormSla]     = useState(5);
  const [activeBar,   setActiveBar]   = useState<number | null>(null);
  const tooltipHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeCount = useMemo(() =>
    tickets.filter((t) => t.status === "new" || t.status === "in_progress").length,
    [tickets]
  );

  const urgentTickets = useMemo(() =>
    tickets
      .filter((t) => t.status === "new" || t.status === "in_progress" || t.status === "waiting_customer")
      .sort((a, b) => a.slaMinutes - b.slaMinutes)
      .slice(0, 3),
    [tickets]
  );

  /* SLA compliance: % tickets with slaMinutes > 5 considered "at-risk" */
  const slaOkPercent = useMemo(() => {
    if (!tickets.length) return 100;
    const ok = tickets.filter((t) => t.slaMinutes > 5).length;
    return Math.round((ok / tickets.length) * 100);
  }, [tickets]);

  function openModal() {
    setFormTitle(""); setFormClient(genClient());
    setFormService(t("dashboard_serviceOptions_consultation")); setFormSla(5);
    setModalOpen(true);
  }

  function handleSubmit() {
    if (!formTitle.trim()) return;
    onAddTicket({
      id: `T-${Date.now()}`, clientNumber: formClient.trim() || genClient(),
      title: formTitle.trim(), status: "new", lastMessage: "",
      updatedAt: t("toast_justNow"), slaMinutes: formSla, service: formService,
    });
    showToast(`${t("toast_ticketCreated")}: "${formTitle.trim()}"`);
    setModalOpen(false);
  }

  /* KPI config — demo deltas + sparklines (replace with real API history) */
  const kpiCards = [
    {
      value: activeCount,
      label: t("dashboard_activeTickets"),
      onClick: onGoToChats,
      delta: 12,
      spark: [4, 6, 5, 8, activeCount] as number[],
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
      ),
    },
    {
      value: tickets.length,
      label: t("dashboard_totalRequests"),
      onClick: onGoToTickets,
      delta: -3,
      spark: [10, 14, 12, 18, tickets.length] as number[],
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
        </svg>
      ),
    },
    {
      value: "18.5 ч",
      label: t("dashboard_hoursThisMonth"),
      onClick: onGoToStats,
      delta: 8,
      spark: [14, 16, 15, 18, 18] as number[],
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
    },
    {
      value: "₽ 4 750",
      label: t("dashboard_avgCheck"),
      onClick: onGoToStats,
      delta: 5,
      spark: [4000, 4200, 4100, 4500, 4750].map((v) => v / 1000),
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
        </svg>
      ),
    },
  ];

  /* Quick actions */
  const quickActions = [
    {
      label: t("dashboard_createTicket"),
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>,
      onClick: openModal,
    },
    {
      label: t("nav_chats"),
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
      onClick: onGoToChats,
    },
    {
      label: t("nav_tickets"),
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
      onClick: onGoToTickets,
    },
    {
      label: t("nav_stats"),
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
      onClick: onGoToStats,
    },
  ];

  return (
    <div style={{ padding: "0 16px 120px", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>

      {/* ── Greeting ── */}
      <div className="cascade-item" style={{ height: 52, display: "flex", alignItems: "center", fontSize: 15, color: "var(--text-hint)" }}>
        {getGreeting(t)}
      </div>

      {/* ── Financial chart card ── */}
      <div className="cascade-item" style={{ background: "linear-gradient(135deg, #1B2838, #243447)", borderRadius: 16, padding: 16, marginBottom: 16, position: "relative", animationDelay: "40ms" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
            {activeBar !== null ? CHART_DATA[activeBar].month : t("dashboard_thisMonth")}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#34c759", background: "rgba(52,199,89,0.15)", padding: "2px 8px", borderRadius: 9999, display: "inline-flex", alignItems: "center", gap: 2 }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M5 2L8 5.5H2L5 2Z" fill="#34c759" /></svg>
            +12%
          </span>
        </div>

        {/* Amount */}
        <div style={{ fontSize: 32, fontWeight: 700, color: "#fff", letterSpacing: "-0.3px", lineHeight: 1.1, transition: "opacity 0.15s" }}>
          ₽ {(activeBar !== null ? CHART_DATA[activeBar].amount : 142_500).toLocaleString("ru-RU")}
        </div>

        <div style={{ height: "0.5px", background: "rgba(255,255,255,0.1)", margin: "12px 0 10px" }} />

        {/* Bars */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 48 }}>
          {CHART_DATA.map((bar, i) => {
            const isActive = activeBar === i;
            const isLast   = i === CHART_DATA.length - 1;
            return (
              <button
                key={bar.month}
                type="button"
                aria-label={`${bar.month}: ${bar.amount.toLocaleString("ru-RU")} ₽`}
                onClick={() => {
                  if (tooltipHideTimer.current) clearTimeout(tooltipHideTimer.current);
                  setActiveBar(isActive ? null : i);
                  if (!isActive) tooltipHideTimer.current = setTimeout(() => setActiveBar(null), 3000);
                }}
                style={{
                  flex: 1, height: bar.height, borderRadius: 4, border: "none",
                  cursor: "pointer", padding: 0,
                  background: isActive ? "#2AABEE" : isLast ? "rgba(42,171,238,0.55)" : "rgba(255,255,255,0.25)",
                  transition: "background 0.18s, transform 0.15s",
                  transform: isActive ? "scaleY(1.06)" : "scaleY(1)",
                  transformOrigin: "bottom",
                  boxShadow: isActive ? "0 0 12px rgba(42,171,238,0.5)" : "none",
                }}
              />
            );
          })}
        </div>

        {/* Month labels */}
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          {CHART_DATA.map((bar, i) => (
            <div key={bar.month} style={{ flex: 1, textAlign: "center", fontSize: 10, color: activeBar === i ? "#2AABEE" : "rgba(255,255,255,0.35)", fontWeight: activeBar === i ? 600 : 400, transition: "color 0.15s" }}>
              {bar.month}
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick actions strip ── */}
      <div className="cascade-item" style={{ display: "flex", gap: 10, overflowX: "auto", scrollbarWidth: "none", marginBottom: 16, animationDelay: "80ms" }}>
        {quickActions.map((qa) => (
          <button
            key={qa.label}
            type="button"
            onClick={qa.onClick}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
              padding: "10px 14px", background: "var(--surface-card)", borderRadius: 14,
              border: "none", cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
              boxShadow: "var(--shadow-card)", transition: "opacity 0.15s",
            }}
          >
            <span style={{ color: "var(--primary)" }}>{qa.icon}</span>
            <span style={{ fontSize: 11, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{qa.label}</span>
          </button>
        ))}
      </div>

      {/* ── KPI cards 2×2 with delta + sparkline ── */}
      <div className="kpi-grid cascade-item" style={{ animationDelay: "80ms" }}>
        {kpiCards.map((card, i) => (
          <KpiCard
            key={card.label}
            value={card.value}
            label={card.label}
            delta={card.delta}
            spark={card.spark}
            icon={card.icon}
            style={{ animationDelay: `${80 + i * 40}ms` }}
            onClick={card.onClick}
          />
        ))}
      </div>

      {/* ── Response speed card ── */}
      <div className="cascade-item" style={{ background: "var(--surface-card)", borderRadius: 16, padding: "14px 16px", marginBottom: 24, boxShadow: "var(--shadow-card)", animationDelay: "160ms" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>{t("dashboard_avgResponseTime")}</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>1.2 ч</span>
        </div>
        {/* Progress bar */}
        <div style={{ height: 6, borderRadius: 3, background: "var(--surface)", overflow: "hidden", marginBottom: 8 }}>
          <div style={{ height: "100%", width: `${slaOkPercent}%`, background: "var(--primary-gradient)", borderRadius: 3, transition: "width 0.6s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: "var(--text-hint)" }}>
            {t("dashboard_slaCompleted")}: <strong style={{ color: "var(--green)" }}>{slaOkPercent}%</strong>
          </span>
          <span style={{ fontSize: 11, color: "var(--text-hint)" }}>{t("dashboard_slaGoal")}</span>
        </div>
      </div>

      {/* ── Urgent tickets ── */}
      <div className="cascade-item" style={{ animationDelay: "200ms" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.3px", color: "var(--text)" }}>
            {t("dashboard_awaitingReply")}
          </span>
          <button type="button" onClick={onGoToChats} style={{ fontSize: 15, color: "var(--primary)", cursor: "pointer", background: "none", border: "none", fontFamily: "inherit", padding: 0 }}>
            {t("dashboard_all")}
          </button>
        </div>

        {urgentTickets.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 16px", gap: 8 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="var(--green)" strokeWidth="2" />
              <path d="M8 12.5L10.5 15L16 9.5" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: 15, color: "var(--green)" }}>{t("dashboard_allProcessed")}</span>
          </div>
        ) : (
          <div style={{ background: "var(--surface-card)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
            {urgentTickets.map((ticket, idx) => {
              const statusColor = STATUS_COLOR[ticket.status] ?? "#8e8e93";
              const isCritical  = ticket.slaMinutes <= 3;

              return (
                <div key={ticket.id}>
                  <button
                    type="button"
                    onClick={() => onOpenAdminChat(ticket.id)}
                    style={{
                      display: "flex", alignItems: "center", width: "100%",
                      minHeight: 68, gap: 12, cursor: "pointer", background: "none",
                      border: "none", textAlign: "left", padding: "10px 14px",
                      fontFamily: "inherit",
                      /* Status-colored left border */
                      borderLeft: `3px solid ${statusColor}`,
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%",
                      background: AVATAR_PALETTE[hashCode(ticket.clientNumber) % AVATAR_PALETTE.length],
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, color: "#fff", fontSize: 16, fontWeight: 600,
                      position: "relative",
                    }}>
                      {ticket.clientNumber.charAt(0).toUpperCase()}
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

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
                          {ticket.title}
                        </span>
                        <span style={{ fontSize: 12, color: "var(--text-hint)", flexShrink: 0 }}>
                          {ticket.updatedAt}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, color: "var(--text-hint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
                          {ticket.lastMessage || "—"}
                        </span>
                        {ticket.slaMinutes <= 5 && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: isCritical ? "var(--destructive)" : "var(--warning)", padding: "2px 7px", borderRadius: 9999, flexShrink: 0 }}>
                            SLA
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                  {idx < urgentTickets.length - 1 && (
                    <div style={{ height: 0.5, background: "var(--divider)", marginLeft: 71 }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── FAB ── */}
      <button
        type="button"
        aria-label={t("dashboard_createTicket")}
        onClick={openModal}
        style={{
          position: "fixed", bottom: 100, right: 16,
          width: 56, height: 56, borderRadius: "50%",
          background: "var(--primary)", border: "none", cursor: "pointer", zIndex: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 16px rgba(42,171,238,0.35), 0 2px 6px rgba(0,0,0,0.1)",
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 5V19M5 12H19" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* ── Create ticket modal ── */}
      {modalOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        >
          <div style={{ background: "var(--surface-card)", borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 480, padding: "0 16px 32px", display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Handle */}
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 8, paddingBottom: 12 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--surface-input)" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-hint)", display: "block", marginBottom: 6 }}>{t("dashboard_title")}</label>
              <input type="text" placeholder={t("dashboard_requestDescription")} value={formTitle} onChange={(e) => setFormTitle(e.target.value)} autoFocus style={{ width: "100%", height: 44, background: "var(--surface)", borderRadius: 10, padding: "0 16px", border: "none", outline: "none", fontSize: 15, color: "var(--text)", fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-hint)", display: "block", marginBottom: 6 }}>{t("dashboard_client")}</label>
              <input type="text" value={formClient} onChange={(e) => setFormClient(e.target.value)} style={{ width: "100%", height: 44, background: "var(--surface)", borderRadius: 10, padding: "0 16px", border: "none", outline: "none", fontSize: 15, color: "var(--text)", fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-hint)", display: "block", marginBottom: 6 }}>{t("dashboard_service")}</label>
              <select value={formService} onChange={(e) => setFormService(e.target.value)} style={{ width: "100%", height: 44, background: "var(--surface)", borderRadius: 10, padding: "0 16px", border: "none", outline: "none", fontSize: 15, color: "var(--text)", fontFamily: "inherit", boxSizing: "border-box" }}>
                {SERVICE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-hint)", display: "block", marginBottom: 6 }}>{t("dashboard_slaMinutes")}</label>
              <input type="number" min={1} max={60} value={formSla} onChange={(e) => setFormSla(Number(e.target.value) || 5)} style={{ width: "100%", height: 44, background: "var(--surface)", borderRadius: 10, padding: "0 16px", border: "none", outline: "none", fontSize: 15, color: "var(--text)", fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
            <button type="button" onClick={() => setModalOpen(false)} style={{ textAlign: "center", fontSize: 15, color: "var(--text-hint)", cursor: "pointer", padding: "8px 0 0", background: "none", border: "none", fontFamily: "inherit", width: "100%" }}>
              {t("dashboard_cancel")}
            </button>
            <button
              type="button"
              onClick={formTitle.trim() ? handleSubmit : undefined}
              disabled={!formTitle.trim()}
              style={{ width: "100%", height: 54, background: formTitle.trim() ? "var(--primary)" : "var(--surface)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: formTitle.trim() ? "#fff" : "var(--text-hint)", fontSize: 17, fontWeight: 600, cursor: formTitle.trim() ? "pointer" : "default", border: "none", fontFamily: "inherit", transition: "background 0.2s" }}
            >
              {t("dashboard_createTicket")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
