import type { Channel } from "../../types";
import { useLocale } from "../../lib/i18n";

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
  const { t } = useLocale();
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
              aria-label={`${s} ${t("review_stars")}`}
            >
              &#9733;
            </button>
          ))}
        </div>
        <textarea
          className="rating-comment"
          placeholder={t("review_commentPlaceholder")}
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
            {t("review_submit")}
          </button>
          <button
            className="btn btn--ghost btn--block"
            type="button"
            onClick={onClose}
          >
            {t("review_cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
