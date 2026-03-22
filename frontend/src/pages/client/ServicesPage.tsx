import type { Channel, Service, Ad, ServiceSubTab } from "../../types";
import StarRating from "../../components/ui/StarRating";
import { formatRating } from "../../lib/adapters";

type ServicesPageProps = {
  activeChannel: Channel;
  activeChannelId: string;
  activeServices: Service[];
  channelAdsForActive: Ad[];
  serviceSubTab: ServiceSubTab;
  channelRatings: Record<string, { rating: number; count: number }>;
  onGoBack: () => void;
  onSetServiceSubTab: (tab: ServiceSubTab) => void;
  onOpenServiceChat: (service: Service) => void;
  onOpenReview: (channelId: string) => void;
  onOpenAdFromChat: (channelId: string, title: string) => void;
};

export default function ServicesPage({
  activeChannel,
  activeChannelId,
  activeServices,
  channelAdsForActive,
  serviceSubTab,
  channelRatings,
  onGoBack,
  onSetServiceSubTab,
  onOpenServiceChat,
  onOpenReview,
  onOpenAdFromChat,
}: ServicesPageProps) {
  return (
    <div className="screen" key="client-services">
      <div className="screen__header">
        <button className="back-link" type="button" onClick={onGoBack}>
          &#8592; Назад
        </button>
        <div className="service-channel-header">
          <div
            className="channel-icon"
            style={{ background: activeChannel?.color ?? "#5288c1" }}
          >
            {activeChannel?.icon ?? "?"}
          </div>
          <div>
            <span className="badge badge--new">{activeChannel?.type ?? "Канал"}</span>
            <h2>{activeChannel?.name ?? "Канал"}</h2>
            <StarRating channelId={activeChannelId} channelRatings={channelRatings} />
          </div>
        </div>
      </div>

      {/* Sub-tabs: Услуги | Реклама */}
      <div className="sub-tabs">
        <button
          className={`sub-tab ${serviceSubTab === "services" ? "sub-tab--active" : ""}`}
          type="button"
          onClick={() => onSetServiceSubTab("services")}
        >
          Услуги
        </button>
        <button
          className={`sub-tab ${serviceSubTab === "ads" ? "sub-tab--active" : ""}`}
          type="button"
          onClick={() => onSetServiceSubTab("ads")}
        >
          Реклама
        </button>
      </div>

      {/* Rate channel button */}
      <button
        className="btn btn--ghost btn--sm"
        type="button"
        style={{ alignSelf: "flex-start" }}
        onClick={() => onOpenReview(activeChannelId)}
      >
        Оценить
      </button>

      {serviceSubTab === "services" ? (
        <>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: 0 }}>
            Выберите услугу, чтобы перейти в чат поддержки.
          </p>
          <div className="card-list">
            {activeServices.map((srv) => (
              <button
                key={srv.id}
                className="service-card"
                type="button"
                onClick={() => onOpenServiceChat(srv)}
              >
                <div className="service-card__header">
                  <strong>{srv.name}</strong>
                  {srv.price ? (
                    <span className="price-tag">
                      {srv.price} {srv.currency === "RUB" ? "\u20BD" : srv.currency}
                    </span>
                  ) : (
                    <span className="price-tag price-tag--free">Бесплатно</span>
                  )}
                </div>
                <p>{srv.description}</p>
                <div className="service-card__meta">
                  <span className="pill">SLA {srv.sla} мин</span>
                  <span className="pill">{srv.agents} агентов</span>
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="card-list" style={{ gap: 12 }}>
          {channelAdsForActive.length === 0 ? (
            <div className="empty-state">
              У канала пока нет рекламных объявлений.
            </div>
          ) : (
            channelAdsForActive.map((ad) => {
              const info = channelRatings[ad.channelId] ?? {
                rating: 0,
                count: 0,
              };
              return (
                <div key={ad.id} className="ad-card">
                  <div className="ad-card__header">
                    <div
                      className="channel-icon channel-icon--sm"
                      style={{ background: ad.channelColor }}
                    >
                      {ad.channelIcon}
                    </div>
                    <span className="ad-card__channel">{ad.channelName}</span>
                    {ad.price && (
                      <span className="price-tag">
                        {ad.price}{" "}
                        {ad.currency === "RUB" ? "\u20BD" : ad.currency}
                      </span>
                    )}
                  </div>
                  <strong className="ad-card__title">{ad.title}</strong>
                  <p className="ad-card__desc">{ad.description}</p>
                  <div className="ad-card__rating">
                    <span className="star-inline star-inline--sm">
                      {formatRating(info.rating, info.count)}
                    </span>
                  </div>
                  <button
                    className="btn btn--primary btn--block"
                    type="button"
                    onClick={() => onOpenAdFromChat(ad.channelId, ad.title)}
                  >
                    Связаться с продавцом
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
