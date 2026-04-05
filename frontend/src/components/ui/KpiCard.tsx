/**
 * KpiCard — reusable KPI widget
 *
 * Usage:
 *   <KpiCard
 *     value={42}
 *     label="Активных тикетов"
 *     icon={<svg .../>}
 *     delta={12}                       // +12% vs prev period
 *     spark={[8, 10, 9, 12, 42]}       // 5-point sparkline
 *     onClick={() => navigate("...")}
 *     accent="#2AABEE"                 // optional color override
 *   />
 */

type KpiCardProps = {
  value: number | string;
  label: string;
  icon?: React.ReactNode;
  /** Percent change vs previous period. Positive = green, negative = red. */
  delta?: number;
  /** 5 values for the mini sparkline (last = current). */
  spark?: number[];
  onClick?: () => void;
  /** Override accent color for icon bg / sparkline. Default: var(--primary) */
  accent?: string;
  /** Extra style on root element */
  style?: React.CSSProperties;
};

/* ── Tiny arrow delta ── */
function DeltaIndicator({ value }: { value: number }) {
  const up    = value >= 0;
  const color = up ? "#34c759" : "#ff3b30";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 11, fontWeight: 600, color }}>
      <svg width="9" height="9" viewBox="0 0 10 10" fill={color} aria-hidden="true">
        {up
          ? <polygon points="5,1 9,8 1,8" />
          : <polygon points="5,9 9,2 1,2" />}
      </svg>
      {Math.abs(value)}%
    </span>
  );
}

/* ── 5-bar sparkline ── */
function Sparkline({ values, accent = "#2AABEE" }: { values: number[]; accent?: string }) {
  const max = Math.max(...values, 1);
  return (
    <span style={{ display: "inline-flex", alignItems: "flex-end", gap: 2, height: 22, flexShrink: 0 }}>
      {values.map((v, i) => (
        <span
          key={i}
          style={{
            width: 5,
            height: `${Math.max(3, Math.round((v / max) * 22))}px`,
            borderRadius: 2,
            background: accent,
            opacity: i === values.length - 1 ? 1 : 0.28,
            display: "block",
            transition: "height 0.4s ease",
          }}
        />
      ))}
    </span>
  );
}

/* ── Main KpiCard ── */
export default function KpiCard({
  value, label, icon, delta, spark, onClick, accent = "var(--primary)", style,
}: KpiCardProps) {
  const isClickable = Boolean(onClick);

  const card = (
    <div style={{
      background: "var(--surface-card)",
      borderRadius: 16,
      padding: "14px 14px 12px",
      boxShadow: "var(--shadow-card)",
      display: "flex",
      flexDirection: "column",
      gap: 0,
      ...style,
    }}>
      {/* Top row: icon + sparkline */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        {icon ? (
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: `${accent}18`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: accent, flexShrink: 0,
          }}>
            {icon}
          </div>
        ) : <div />}
        {spark && <Sparkline values={spark} accent={accent} />}
      </div>

      {/* Value */}
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px", lineHeight: 1.1, color: "var(--text)", marginBottom: 4 }}>
        {value}
      </div>

      {/* Label */}
      <div style={{ fontSize: 12, color: "var(--text-hint)", lineHeight: 1.3, marginBottom: delta !== undefined ? 6 : 0 }}>
        {label}
      </div>

      {/* Delta */}
      {delta !== undefined && <DeltaIndicator value={delta} />}
    </div>
  );

  if (!isClickable) return card;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "none", border: "none", padding: 0,
        cursor: "pointer", textAlign: "left", fontFamily: "inherit",
        display: "block", width: "100%",
        transition: "opacity 0.15s",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.82"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
    >
      {card}
    </button>
  );
}
