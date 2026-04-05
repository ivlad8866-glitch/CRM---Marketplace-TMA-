import { useState } from "react";
import type { Ticket } from "../../types";
import { statusLabels, systemNotes } from "../../data/demo-data";
import { useLocale } from "../../lib/i18n";

const STATUS_COLOR: Record<string, string> = {
  new: "#ff3b30", in_progress: "#2AABEE", waiting_customer: "#ff9f0a",
  resolved: "#34c759", closed: "#8e8e93", spam: "#8e8e93", duplicate: "#8e8e93",
};

type ProfilePageProps = {
  tickets: Ticket[];
  filteredHistory: Ticket[];
  historyFilter: string;
  activeChannelId: string;
  onHistoryFilterChange: (f: string) => void;
  onOpenChatFromHistory: (ticketId: string) => void;
  onOpenReview: (channelId: string) => void;
  showToast: (msg: string) => void;
};

export default function ProfilePage({
  tickets,
  filteredHistory,
  historyFilter,
  activeChannelId,
  onHistoryFilterChange,
  onOpenChatFromHistory,
  onOpenReview,
  showToast,
}: ProfilePageProps) {
  const { t } = useLocale();
  const [rating, setRating] = useState(4);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const HISTORY_FILTERS = [
    { key: "all",      label: t("profile_filterAll") },
    { key: "active",   label: t("profile_filterActive") },
    { key: "resolved", label: t("profile_filterResolved") },
  ];

  return (
    <div className="screen" key="client-profile">
      {/* Profile hero */}
      <div className="profile-card" style={{ flexDirection: 'column', alignItems: 'center', padding: '24px 16px', gap: '12px' }}>
        <div className="avatar avatar--lg">C</div>
        <div className="profile-card__info" style={{ alignItems: 'center', textAlign: 'center' }}>
          <strong>@cybercat</strong>
          <span>C-000042 &middot; ru-RU &middot; VIP</span>
        </div>
      </div>

      {/* Stats bento */}
      <div className="kpi-grid">
        <div className="kpi">
          <span>{t("profile_requests")}</span>
          <strong>{tickets.length}</strong>
        </div>
        <div className="kpi">
          <span>{t("profile_resolved")}</span>
          <strong>{tickets.filter(tick => tick.status === 'resolved' || tick.status === 'closed').length}</strong>
        </div>
      </div>

      {/* Rating */}
      <div className="section-block">
        <h3>{t("profile_rateSupport")}</h3>
        <p>{t("profile_rateDescription")}</p>
        <div className="rating">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              className="star-btn"
              style={{
                color: s <= rating ? "#ff9f0a" : "var(--text-hint)",
                animationDelay: `${s * 60}ms`,
              }}
              aria-label={`${s} ${t("review_stars")}`}
              onClick={() => setRating(s)}
            >
              ★
            </button>
          ))}
        </div>
        <textarea
          className="rating-comment"
          placeholder={t("profile_commentPlaceholder")}
          rows={3}
          value={ratingComment}
          onChange={(e) => setRatingComment(e.target.value)}
        />
        {ratingSubmitted ? (
          <div className="rating__note rating__note--success">
            {t("profile_thankYou")}
          </div>
        ) : (
          <button
            className="btn btn--primary btn--block"
            type="button"
            onClick={() => {
              setRatingSubmitted(true);
              showToast(t("profile_reviewSent"));
            }}
          >
            {t("profile_submitReview")}
          </button>
        )}
      </div>

      {/* History */}
      <div className="section-block">
        <h3>{t("profile_history")}</h3>
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--divider)", margin: "0 16px" }}>
          {HISTORY_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => onHistoryFilterChange(f.key)}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                borderBottom: historyFilter === f.key ? "2px solid var(--primary)" : "2px solid transparent",
                color: historyFilter === f.key ? "var(--primary)" : "var(--text-hint)",
                fontFamily: "inherit",
                fontSize: 14,
                fontWeight: historyFilter === f.key ? 600 : 400,
                padding: "10px 0",
                cursor: "pointer",
                transition: "color 0.2s ease, border-color 0.2s ease",
                marginBottom: -1,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        {filteredHistory.length === 0 ? (
          <div className="empty-state">{t("tickets_nothingFound")}</div>
        ) : (
          <div className="timeline">
            {filteredHistory.map((ticket) => {
              const dotColor = STATUS_COLOR[ticket.status] ?? "var(--text-hint)";
              return (
                <button
                  key={ticket.id}
                  type="button"
                  className="timeline-item"
                  style={{ background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "left", padding: "10px 0", fontFamily: "inherit" }}
                  onClick={() => onOpenChatFromHistory(ticket.id)}
                >
                  <span className="timeline-dot" style={{ color: dotColor, background: dotColor }} />
                  <div className="timeline-content">
                    <strong>{ticket.title || ticket.id}</strong>
                    <span>{ticket.updatedAt} · <span className={`badge badge--${ticket.status}`}>{statusLabels[ticket.status]}</span></span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* System notes */}
      <div className="section-block">
        <h3>{t("profile_notes")}</h3>
        <ul className="note-list">
          {systemNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
