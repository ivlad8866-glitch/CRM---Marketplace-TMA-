import type { Channel } from "../../types";

type ReviewOverlayProps = {
  channel: Channel | null;
  reviewStars: number;
  reviewComment: string;
  onSetReviewStars: (stars: number) => void;
  onSetReviewComment: (comment: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export default function ReviewOverlay({
  channel,
  reviewStars,
  reviewComment,
  onSetReviewStars,
  onSetReviewComment,
  onSubmit,
  onClose,
}: ReviewOverlayProps) {
  if (!channel) return null;
  return (
    <div className="review-overlay" onClick={onClose}>
      <div className="review-modal" onClick={(e) => e.stopPropagation()}>
        <div className="review-modal__header">
          <div
            className="channel-icon"
            style={{ background: channel.color }}
          >
            {channel.icon}
          </div>
          <strong>{channel.name}</strong>
        </div>
        <div className="review-modal__stars">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              className={`star ${reviewStars >= s ? "star--on" : ""}`}
              type="button"
              onClick={() => onSetReviewStars(s)}
              aria-label={`${s} звезд`}
            >
              &#9733;
            </button>
          ))}
        </div>
        <textarea
          className="rating-comment"
          placeholder="Ваш комментарий"
          rows={3}
          value={reviewComment}
          onChange={(e) => onSetReviewComment(e.target.value)}
        />
        <div className="review-modal__actions">
          <button
            className="btn btn--primary btn--block"
            type="button"
            disabled={reviewStars === 0}
            onClick={onSubmit}
          >
            Отправить отзыв
          </button>
          <button
            className="btn btn--ghost btn--block"
            type="button"
            onClick={onClose}
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
