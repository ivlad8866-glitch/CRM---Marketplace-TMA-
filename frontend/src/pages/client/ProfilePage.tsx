import { useState } from "react";
import type { Ticket } from "../../types";
import { statusLabels, systemNotes } from "../../data/demo-data";
import { useLocale } from "../../lib/i18n";

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
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              className={`star ${rating >= star ? "star--on" : ""}`}
              onClick={() => {
                setRating(star);
                setRatingSubmitted(false);
              }}
              type="button"
              aria-label={`${star} ${t("profile_starRating")}`}
            >
              &#9733;
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
        <div className="filter-chips">
          {HISTORY_FILTERS.map((f) => (
            <button
              key={f.key}
              className={`chip ${historyFilter === f.key ? "chip--active" : ""}`}
              type="button"
              onClick={() => onHistoryFilterChange(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="ticket-list">
          {filteredHistory.map((ticket) => (
            <div key={ticket.id} className="ticket-item-wrapper">
              <button
                className="ticket-item"
                type="button"
                onClick={() => onOpenChatFromHistory(ticket.id)}
              >
                <div className="ticket-item__left">
                  <strong>{ticket.title}</strong>
                  <span>{ticket.id}</span>
                </div>
                <span className={`badge badge--${ticket.status}`}>
                  {statusLabels[ticket.status]}
                </span>
              </button>
              <button
                className="ticket-review-btn"
                type="button"
                onClick={() => onOpenReview(activeChannelId)}
              >
                {t("profile_rate")}
              </button>
            </div>
          ))}
        </div>
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
