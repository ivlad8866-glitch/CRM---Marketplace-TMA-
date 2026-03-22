import { useState } from "react";
import type { Ticket } from "../../types";
import { statusLabels, systemNotes } from "../../data/demo-data";

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
  const [rating, setRating] = useState(4);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  return (
    <div className="screen" key="client-profile">
      <div className="screen__header">
        <h2>Профиль</h2>
      </div>

      {/* User info */}
      <div className="profile-card">
        <div className="avatar avatar--lg">C</div>
        <div className="profile-card__info">
          <strong>@cybercat</strong>
          <span>C-000042 -- ru-RU -- VIP</span>
        </div>
      </div>

      {/* Rating */}
      <div className="section-block">
        <h3>Оцените поддержку</h3>
        <p>Ваш отзыв помогает нам стать лучше.</p>
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
              aria-label={`${star} звезд`}
            >
              &#9733;
            </button>
          ))}
        </div>
        <textarea
          className="rating-comment"
          placeholder="Комментарий для команды"
          rows={3}
          value={ratingComment}
          onChange={(e) => setRatingComment(e.target.value)}
        />
        {ratingSubmitted ? (
          <div className="rating__note rating__note--success">
            Спасибо за отзыв!
          </div>
        ) : (
          <button
            className="btn btn--primary btn--block"
            type="button"
            onClick={() => {
              setRatingSubmitted(true);
              showToast("Отзыв отправлен!");
            }}
          >
            Отправить отзыв
          </button>
        )}
      </div>

      {/* History */}
      <div className="section-block">
        <h3>История обращений</h3>
        <div className="filter-chips">
          {["Все", "Активные", "Решенные"].map((f) => (
            <button
              key={f}
              className={`chip ${historyFilter === f ? "chip--active" : ""}`}
              type="button"
              onClick={() => onHistoryFilterChange(f)}
            >
              {f}
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
                Оценить
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* System notes */}
      <div className="section-block">
        <h3>Заметки</h3>
        <ul className="note-list">
          {systemNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
