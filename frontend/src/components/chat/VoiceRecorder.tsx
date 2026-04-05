import { useMemo } from "react";
import { formatVoiceTime } from "../../lib/adapters";
import { useLocale } from "../../lib/i18n";

type VoiceRecorderProps = {
  recordingTime: number;
  waveformLevel: number;
  isLocked: boolean;
  isCancelHinted: boolean;
  onCancel: () => void;
  onSend: () => void;
  onLock: () => void;
};

/* ── Inline SVG Icons ───────────────────────────────────── */

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}

function SendArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

/* ── Waveform Bars ──────────────────────────────────────── */

const BAR_COUNT = 20;

function WaveformBars({ level }: { level: number }) {
  // Generate bar heights based on current amplitude level
  // Each bar has a base height plus amplitude-driven variation
  const bars = useMemo(() => {
    return Array.from({ length: BAR_COUNT }, (_, i) => {
      // Create a varied pattern using sin with different phase offsets
      const base = 0.15 + Math.sin(i * 0.7 + 1.2) * 0.08 + (i % 3) * 0.04;
      return base;
    });
  }, []);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "2px",
        height: "28px",
        flex: 1,
        justifyContent: "center",
      }}
    >
      {bars.map((baseHeight, i) => {
        // Scale bar height by current amplitude level
        const heightPct = Math.max(12, (baseHeight + level * 0.7) * 100);
        return (
          <span
            key={i}
            style={{
              width: "3px",
              height: `${Math.min(heightPct, 100)}%`,
              minHeight: "4px",
              borderRadius: "2px",
              background: "var(--destructive)",
              opacity: 0.3 + level * 0.5,
              transition: "height 0.1s ease, opacity 0.1s ease",
              flexShrink: 0,
            }}
          />
        );
      })}
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────── */

export default function VoiceRecorder({
  recordingTime,
  waveformLevel,
  isLocked,
  isCancelHinted,
  onCancel,
  onSend,
  onLock,
}: VoiceRecorderProps) {
  const { t } = useLocale();
  /* ── Locked mode: stop / send / cancel buttons ─────── */
  if (isLocked) {
    return (
      <div
        className="composer composer--recording"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "0 12px",
          minHeight: "52px",
          background: "var(--surface-card)",
        }}
      >
        {/* Cancel (trash) button */}
        <button
          type="button"
          onClick={onCancel}
          aria-label={t("voiceRec_cancelRecord")}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "var(--radius-full)",
            border: "none",
            background: "rgba(255, 59, 48, 0.1)",
            color: "var(--destructive)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            transition: "transform 0.15s ease",
          }}
        >
          <TrashIcon />
        </button>

        {/* Pulsing dot + time */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "var(--radius-full)",
              background: "var(--destructive)",
              flexShrink: 0,
              animation: "recordPulse 1s ease-in-out infinite",
            }}
          />
          <span
            style={{
              fontSize: "15px",
              fontVariantNumeric: "tabular-nums",
              color: "var(--text)",
              fontWeight: 500,
              minWidth: "40px",
            }}
          >
            {formatVoiceTime(recordingTime)}
          </span>
        </div>

        {/* Waveform */}
        <WaveformBars level={waveformLevel} />

        {/* Stop button (square) */}
        <button
          type="button"
          onClick={onSend}
          aria-label={t("voiceRec_stopSend")}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "var(--radius-full)",
            border: "none",
            background: "var(--destructive)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            transition: "transform 0.15s ease",
          }}
        >
          <StopIcon />
        </button>

        {/* Send button (arrow) */}
        <button
          type="button"
          onClick={onSend}
          aria-label={t("voiceRec_send")}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "var(--radius-full)",
            border: "none",
            background: "var(--primary)",
            color: "var(--text-on-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            transition: "transform 0.15s ease",
          }}
        >
          <SendArrowIcon />
        </button>
      </div>
    );
  }

  /* ── Default hold-to-record mode ───────────────────── */
  return (
    <div
      className="composer composer--recording"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "0 12px",
        minHeight: "52px",
        background: "var(--surface-card)",
      }}
    >
      {/* Pulsing red dot + time */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "var(--radius-full)",
            background: "var(--destructive)",
            flexShrink: 0,
            animation: "recordPulse 1s ease-in-out infinite",
          }}
        />
        <span
          style={{
            fontSize: "15px",
            fontVariantNumeric: "tabular-nums",
            color: "var(--text)",
            fontWeight: 500,
            minWidth: "40px",
          }}
        >
          {formatVoiceTime(recordingTime)}
        </span>
      </div>

      {/* Waveform visualization */}
      <WaveformBars level={waveformLevel} />

      {/* Slide to cancel hint */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          flexShrink: 0,
          opacity: isCancelHinted ? 1 : 0.6,
          transition: "opacity 0.2s ease",
          color: isCancelHinted ? "var(--destructive)" : "var(--text-hint)",
          fontSize: "13px",
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            display: "inline-block",
            animation: isCancelHinted ? "none" : "slideHint 1.5s ease-in-out infinite",
          }}
        >
          {"<"}
        </span>
        <span>{isCancelHinted ? t("voiceRec_releaseToCancel") : t("voiceRec_slideToCancel")}</span>
      </div>

      {/* Lock button */}
      <button
        type="button"
        onClick={onLock}
        aria-label={t("voiceRec_lock")}
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "var(--radius-full)",
          border: "1px solid var(--divider)",
          background: "var(--surface)",
          color: "var(--text-hint)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          flexShrink: 0,
          transition: "transform 0.15s ease, background 0.15s ease",
        }}
      >
        <LockIcon />
      </button>
    </div>
  );
}
