import type { ReactNode, CSSProperties } from "react";

type KpiCardProps = {
  value: string | number;
  label: string;
  delta?: number;
  spark?: number[];
  icon?: ReactNode;
  style?: CSSProperties;
  onClick?: () => void;
};

function Delta({ value }: { value: number }) {
  const up = value >= 0;
  const color = up ? "#34c759" : "#ff3b30";
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color, display: "inline-flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
      <svg width="8" height="8" viewBox="0 0 8 8" fill={color} aria-hidden="true">
        {up
          ? <path d="M4 1L7 5H1L4 1Z" />
          : <path d="M4 7L1 3H7L4 7Z" />}
      </svg>
      {Math.abs(value)}%
    </span>
  );
}

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

export default function KpiCard({ value, label, delta, spark, icon, style, onClick }: KpiCardProps) {
  return (
    <button
      type="button"
      className="kpi"
      style={style}
      onClick={onClick}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-hint)", fontSize: 12 }}>
          {icon && <span style={{ opacity: 0.7, display: "flex", alignItems: "center" }}>{icon}</span>}
          {label}
        </span>
        {delta !== undefined && <Delta value={delta} />}
      </div>
      <strong>{value}</strong>
      {spark && <Sparkline values={spark} />}
    </button>
  );
}
