import type { Channel } from "../../types";
import StarRating from "../../components/ui/StarRating";

type CatalogPageProps = {
  channels: Channel[];
  channelFilter: string;
  channelRatings: Record<string, { rating: number; count: number }>;
  onFilterChange: (filter: string) => void;
  onOpenChannelServices: (channelId: string) => void;
  onOpenReview: (channelId: string) => void;
};

export default function CatalogPage({
  channels,
  channelFilter,
  channelRatings,
  onFilterChange,
  onOpenChannelServices,
  onOpenReview,
}: CatalogPageProps) {
  return (
    <div className="screen" key="client-catalog">
      <div className="screen__header">
        <h2>Каталог каналов</h2>
        <p>Mini Apps, боты и провайдеры услуг</p>
      </div>
      <div className="filter-chips">
        {["Все", "Mini App", "Bot", "Провайдер"].map((f) => (
          <button
            key={f}
            className={`chip ${channelFilter === f ? "chip--active" : ""}`}
            type="button"
            onClick={() => onFilterChange(f)}
          >
            {f === "Bot" ? "Боты" : f === "Провайдер" ? "Провайдеры" : f}
          </button>
        ))}
      </div>
      <div className="card-list">
        {channels.map((ch) => (
          <div key={ch.id} className="channel-card-wrapper">
            <button
              className="channel-card"
              type="button"
              onClick={() => onOpenChannelServices(ch.id)}
            >
              <div className="channel-card__row">
                <div
                  className="channel-icon"
                  style={{ background: ch.color }}
                >
                  {ch.icon}
                </div>
                <div className="channel-card__body">
                  <div className="channel-card__top">
                    <span className="badge">{ch.type}</span>
                    <span className="pill">{ch.services.length} услуг</span>
                  </div>
                  <div className="channel-card__name-row">
                    <strong className="channel-card__name">{ch.name}</strong>
                    <StarRating channelId={ch.id} channelRatings={channelRatings} size="sm" />
                  </div>
                  <p className="channel-card__desc">{ch.description}</p>
                  <div className="channel-card__owner">{ch.owner}</div>
                </div>
              </div>
            </button>
            <button
              className="channel-card__review-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenReview(ch.id);
              }}
            >
              Оставить отзыв
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
