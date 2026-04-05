import { useState, useMemo } from "react";
import type { Ticket } from "../../types";
import { useLocale } from "../../lib/i18n";

type StatsPageProps = {
  tickets: Ticket[];
  role: "client" | "admin";
  /** Optional: show skeleton loading placeholders */
  loading?: boolean;
};

type DrillDown = { type: "total" | "resolved" | "sla_avg" | "sla_max" | "status"; statusKey?: string } | null;

const STATUS_COLOR: Record<string, string> = {
  new: "#ff3b30", in_progress: "#2AABEE", waiting_customer: "#ff9f0a",
  resolved: "#34c759", closed: "#8e8e93",
};

/* ── Skeleton placeholder ── */
function SkeletonBlock({ width = "100%", height = 16, radius = 8 }: { width?: string | number; height?: number; radius?: number }) {
  return (
    <div className="skeleton" style={{ width, height, borderRadius: radius }} />
  );
}

function SkeletonStats() {
  return (
    <div style={{ padding: "0 16px 32px" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 24, marginTop: 8 }}>
        {[60, 70, 90].map((w, i) => <SkeletonBlock key={i} width={w} height={32} radius={16} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ background: "var(--surface)", borderRadius: 16, padding: 16, height: 72, display: "flex", flexDirection: "column", gap: 8 }}>
            <SkeletonBlock width="60%" height={28} />
            <SkeletonBlock width="80%" height={12} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <SkeletonBlock width={8} height={8} radius={4} />
            <SkeletonBlock width={100} height={14} />
            <div style={{ flex: 1 }}><SkeletonBlock height={4} radius={2} /></div>
            <SkeletonBlock width={24} height={14} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 5-bar sparkline ── */
function Sparkline({ values, color = "var(--primary)" }: { values: number[]; color?: string }) {
  const max = Math.max(...values, 1);
  return (
    <span style={{ display: "inline-flex", alignItems: "flex-end", gap: 2, height: 20, flexShrink: 0 }}>
      {values.map((v, i) => (
        <span key={i} style={{
          width: 5,
          height: `${Math.max(3, Math.round((v / max) * 20))}px`,
          borderRadius: 2,
          background: color,
          opacity: i === values.length - 1 ? 1 : 0.28,
          display: "block",
        }} />
      ))}
    </span>
  );
}

/* ── Main component ── */

export default function StatsPage({ tickets, role, loading = false }: StatsPageProps) {
  const { t } = useLocale();

  const PERIODS = [
    { key: "week",  label: t("stats_week") },
    { key: "month", label: t("stats_month") },
    { key: "all",   label: t("stats_allTime") },
  ];

  const STATUS_CONFIG: { key: string; label: string; color: string }[] = [
    { key: "new",              label: t("statsStatus_new"),          color: "#ff3b30" },
    { key: "in_progress",      label: t("statsStatus_inProgress"),   color: "#2AABEE" },
    { key: "waiting_customer", label: t("statsStatus_waitingClient"), color: "#ff9f0a" },
    { key: "resolved",         label: t("statsStatus_resolved"),     color: "#34c759" },
    { key: "closed",           label: t("statsStatus_closed"),       color: "#8e8e93" },
  ];

  const [period,    setPeriod]    = useState<string>("all");
  const [drillDown, setDrillDown] = useState<DrillDown>(null);

  const filteredTickets = useMemo(() => {
    if (period === "all") return tickets;
    const fraction = period === "week" ? 0.3 : 0.7;
    return tickets.slice(0, Math.max(1, Math.ceil(tickets.length * fraction)));
  }, [tickets, period]);

  const total    = filteredTickets.length;
  const resolved = useMemo(() => filteredTickets.filter((t) => t.status === "resolved" || t.status === "closed").length, [filteredTickets]);
  const avgSla   = useMemo(() => total > 0 ? Math.round(filteredTickets.reduce((s, t) => s + t.slaMinutes, 0) / total) : 0, [filteredTickets, total]);
  const maxSla   = useMemo(() => total > 0 ? Math.max(...filteredTickets.map((t) => t.slaMinutes)) : 0, [filteredTickets, total]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of filteredTickets) counts[t.status] = (counts[t.status] || 0) + 1;
    return counts;
  }, [filteredTickets]);

  const maxCount = useMemo(() => Math.max(...Object.values(statusCounts), 1), [statusCounts]);

  /* Service popularity — admin only */
  const serviceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of filteredTickets) counts[t.service] = (counts[t.service] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filteredTickets]);
  const maxServiceCount = useMemo(() => Math.max(...serviceCounts.map((s) => s[1]), 1), [serviceCounts]);

  const drillTickets = useMemo(() => {
    if (!drillDown) return [];
    if (drillDown.type === "total")    return filteredTickets;
    if (drillDown.type === "resolved") return filteredTickets.filter((t) => t.status === "resolved" || t.status === "closed");
    if (drillDown.type === "sla_avg")  return [...filteredTickets].sort((a, b) => a.slaMinutes - b.slaMinutes);
    if (drillDown.type === "sla_max")  return [...filteredTickets].sort((a, b) => b.slaMinutes - a.slaMinutes);
    if (drillDown.type === "status")   return filteredTickets.filter((t) => t.status === drillDown.statusKey);
    return [];
  }, [drillDown, filteredTickets]);

  const drillLabel = useMemo(() => {
    if (!drillDown) return "";
    if (drillDown.type === "total")    return t("stats_total");
    if (drillDown.type === "resolved") return t("stats_resolved");
    if (drillDown.type === "sla_avg")  return t("stats_avgSla");
    if (drillDown.type === "sla_max")  return t("stats_maxWait");
    if (drillDown.type === "status") {
      return STATUS_CONFIG.find((s) => s.key === drillDown.statusKey)?.label ?? drillDown.statusKey ?? "";
    }
    return "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drillDown, t]);

  /* Period trend text */
  const trendText = useMemo(() => {
    if (tickets.length === 0) return null;
    const pct = total / tickets.length;
    if (pct > 0.8)  return { label: t("stats_trendUp"),   color: "#34c759" };
    if (pct < 0.35) return { label: t("stats_trendDown"), color: "#ff3b30" };
    return { label: t("stats_trendFlat"), color: "var(--text-hint)" };
  }, [total, tickets.length]);

  /* Efficiency metrics — derived from real ticket data where possible */
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
  const slaCompliance  = total > 0 ? Math.round((filteredTickets.filter((t) => t.slaMinutes > 5).length / total) * 100) : 0;

  const toggleDrill = (d: DrillDown) => {
    setDrillDown(drillDown?.type === d?.type && drillDown?.statusKey === d?.statusKey ? null : d);
  };

  /* Demo sparklines per metric (replace with real history from API) */
  const METRICS: { value: string | number; label: string; drill: DrillDown; spark: number[] }[] = [
    { value: total,                          label: t("stats_total"),    drill: { type: "total" },    spark: [8, 12, 10, 15, total] },
    { value: resolved,                       label: t("stats_resolved"), drill: { type: "resolved" }, spark: [5, 8,  7,  10, resolved] },
    { value: `${avgSla} ${t("stats_min")}`,  label: t("stats_avgSla"),   drill: { type: "sla_avg" },  spark: [9, 7, 8, 6, avgSla] },
    { value: `${maxSla} ${t("stats_min")}`,  label: t("stats_maxWait"),  drill: { type: "sla_max" },  spark: [15, 12, 18, 10, maxSla] },
  ];

  /* ── Loading state ── */
  if (loading) return <SkeletonStats />;

  /* ── Empty state ── */
  if (total === 0) {
    return (
      <div style={{ padding: "0 16px" }}>
        {/* Period pills still visible */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, marginTop: 8 }}>
          {PERIODS.map((p) => (
            <button key={p.key} type="button" onClick={() => { setPeriod(p.key); setDrillDown(null); }}
              style={{ padding: "6px 14px", borderRadius: 9999, fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer", fontFamily: "inherit", background: period === p.key ? "var(--primary)" : "var(--surface)", color: period === p.key ? "#fff" : "var(--text-secondary)", transition: "background 0.15s, color 0.15s" }}>
              {p.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 16px", textAlign: "center", gap: 12 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-hint)" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
            <rect x="9" y="3" width="6" height="4" rx="2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
          </svg>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{t("stats_noPeriodData")}</div>
          <div style={{ fontSize: 13, color: "var(--text-hint)" }}>{t("stats_choosePeriod")}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 16px 32px", overflowY: "auto" }}>

      {/* ── Period pills + trend ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 20, marginTop: 8 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {PERIODS.map((p) => (
            <button key={p.key} type="button"
              onClick={() => { setPeriod(p.key); setDrillDown(null); }}
              style={{ padding: "6px 14px", borderRadius: 9999, fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer", fontFamily: "inherit", background: period === p.key ? "var(--primary)" : "var(--surface)", color: period === p.key ? "#fff" : "var(--text-secondary)", transition: "background 0.15s, color 0.15s" }}>
              {p.label}
            </button>
          ))}
        </div>
        {trendText && (
          <span style={{ fontSize: 12, fontWeight: 500, color: trendText.color, flexShrink: 0 }}>
            {trendText.label}
          </span>
        )}
      </div>

      {/* ── 2×2 KPI cards with sparklines ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {METRICS.map((m, i) => {
          const isActive = drillDown?.type === m.drill?.type;
          return (
            <button key={m.label} type="button" className="cascade-item"
              onClick={() => toggleDrill(m.drill)}
              style={{
                background: isActive ? "var(--primary)" : "var(--surface-card)",
                borderRadius: 16, padding: "14px 14px 12px",
                display: "flex", flexDirection: "column",
                animationDelay: `${i * 40}ms`,
                border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                boxShadow: "var(--shadow-card)", transition: "background 0.2s",
              }}>
              {/* Value + sparkline row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.5px", lineHeight: 1.1, color: isActive ? "#fff" : "var(--text)" }}>
                  {m.value}
                </span>
                {!isActive && <Sparkline values={m.spark} />}
              </div>
              <span style={{ fontSize: 11, color: isActive ? "rgba(255,255,255,0.8)" : "var(--text-hint)" }}>
                {m.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Efficiency row (admin only) ── */}
      {role === "admin" && (
        <div className="cascade-item" style={{ background: "var(--surface-card)", borderRadius: 16, padding: "14px 16px", marginBottom: 16, boxShadow: "var(--shadow-card)", animationDelay: "160ms" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 12 }}>
            {t("stats_efficiency")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
            {[
              { value: "1.2 ч",           label: t("stats_firstReply") },
              { value: `${resolutionRate}%`, label: t("stats_resolved") },
              { value: `${slaCompliance}%`,  label: t("stats_slaFive") },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: "center", borderRight: i < 2 ? "0.5px solid var(--divider)" : "none", padding: "0 8px" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", lineHeight: 1.2 }}>{item.value}</div>
                <div style={{ fontSize: 11, color: "var(--text-hint)", marginTop: 3, lineHeight: 1.3 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Drill-down ticket list ── */}
      {drillDown && drillTickets.length > 0 && (
        <div className="cascade-item" style={{ background: "var(--surface-card)", borderRadius: 16, overflow: "hidden", marginBottom: 16, boxShadow: "var(--shadow-card)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px 8px" }}>
            <span style={{ fontWeight: 600, fontSize: 15, color: "var(--text)" }}>{drillLabel} ({drillTickets.length})</span>
            <button type="button" onClick={() => setDrillDown(null)} aria-label={t("stats_close")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-hint)", fontSize: 20, lineHeight: 1, padding: 4 }}>
              ×
            </button>
          </div>
          {drillTickets.map((ticket, idx) => (
            <div key={ticket.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLOR[ticket.status] ?? "#8e8e93", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ticket.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-hint)", marginTop: 2 }}>{ticket.id} · SLA {ticket.slaMinutes} {t("stats_min")}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: ticket.slaMinutes <= 3 ? "var(--destructive)" : ticket.slaMinutes <= 7 ? "var(--warning)" : "var(--surface-input)", padding: "2px 7px", borderRadius: 9999, flexShrink: 0 }}>
                  {ticket.slaMinutes} {t("stats_min")}
                </span>
              </div>
              {idx < drillTickets.length - 1 && <div style={{ height: 0.5, background: "var(--divider)", marginLeft: 34 }} />}
            </div>
          ))}
        </div>
      )}

      {/* ── Status breakdown ── */}
      <div className="cascade-item" style={{ animationDelay: "200ms", marginBottom: 16 }}>
        <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.3px", color: "var(--text)", display: "block", marginBottom: 14 }}>
          {t("stats_byStatus")}
        </span>
        {STATUS_CONFIG.map(({ key, label, color }) => {
          const count = statusCounts[key] || 0;
          if (count === 0) return null;
          const pct = (count / maxCount) * 100;
          const isActive = drillDown?.type === "status" && drillDown.statusKey === key;
          return (
            <button key={key} type="button"
              onClick={() => toggleDrill({ type: "status", statusKey: key })}
              style={{
                display: "flex", alignItems: "center", gap: 10, marginBottom: 12,
                width: "100%", background: isActive ? `${color}14` : "none",
                border: "none", cursor: "pointer", borderRadius: 8,
                padding: isActive ? "6px 8px" : "2px 0",
                fontFamily: "inherit", transition: "background 0.15s",
              }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: "var(--text)", width: 120, textAlign: "left", flexShrink: 0 }}>{label}</span>
              <div style={{ flex: 1, height: 6, background: "var(--surface)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.4s ease" }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", width: 28, textAlign: "right", flexShrink: 0 }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Service popularity (admin only) ── */}
      {role === "admin" && serviceCounts.length >= 2 && (
        <div className="cascade-item" style={{ animationDelay: "240ms" }}>
          <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.3px", color: "var(--text)", display: "block", marginBottom: 14 }}>
            {t("stats_popularServices")}
          </span>
          {serviceCounts.map(([service, count]) => (
            <div key={service} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: "var(--text)", width: 110, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "left" }}>
                {service}
              </span>
              <div style={{ flex: 1, height: 8, background: "var(--surface)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${(count / maxServiceCount) * 100}%`, height: "100%", background: "var(--primary-gradient)", borderRadius: 4, transition: "width 0.5s ease" }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", width: 24, textAlign: "right", flexShrink: 0 }}>{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
