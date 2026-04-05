import type { Channel, Service, Ad, ServiceSubTab } from "../../types";
import StarRating from "../../components/ui/StarRating";
import { formatRating } from "../../lib/adapters";
import { useLocale } from "../../lib/i18n";

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
  const { t } = useLocale();
  return (
    <div className="screen" key="client-services">
      <div className="screen__header">
        <button className="back-link" type="button" onClick={onGoBack}>
          {"← " + t("more_back")}
        </button>
        <div className="service-channel-header">
          <div
            className="channel-icon"
            style={{ background: activeChannel?.color ?? "#5288c1" }}
          >
            {activeChannel?.icon ?? "?"}
          </div>
          <div>
            <span className="badge badge--new">{activeChannel?.type ?? t("servicesPage_channel")}</span>
            <h2>{activeChannel?.name ?? t("servicesPage_channel")}</h2>
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
          {t("marketplace_servicesTab")}
        </button>
        <button
          className={`sub-tab ${serviceSubTab === "ads" ? "sub-tab--active" : ""}`}
          type="button"
          onClick={() => onSetServiceSubTab("ads")}
        >
          {t("servicesPage_ads")}
        </button>
      </div>

      {/* Rate channel button */}
      <button
        className="btn btn--ghost btn--sm"
        type="button"
        style={{ alignSelf: "flex-start" }}
        onClick={() => onOpenReview(activeChannelId)}
      >
        {t("servicesPage_rate")}
      </button>

      {serviceSubTab === "services" ? (
        <>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: 0 }}>
            {t("servicesPage_selectService")}
          </p>
          <div className="card-list">
            {activeServices.map((srv) => (
              <button
                key={srv.id}
                className="service-card"
                type="button"
                onClick={() => onOpenServiceChat(srv)}
                style={{ padding: 0, overflow: "hidden" }}
              >
                {srv.coverUrl ? (
                  <img
                    src={srv.coverUrl}
                    alt={srv.name}
                    style={{ width: "100%", height: 120, objectFit: "cover", display: "block", borderRadius: "10px 10px 0 0" }}
                  />
                ) : (
                  <div style={{ width: "100%", height: 6, background: "var(--primary)", borderRadius: "10px 10px 0 0", opacity: 0.5 }} />
                )}
                <div style={{ padding: 16 }}>
                  <div className="service-card__header">
                    <strong>{srv.name}</strong>
                    {srv.price ? (
                      <span className="price-tag">
                        {srv.price} {srv.currency === "RUB" ? "\u20BD" : srv.currency}
                      </span>
                    ) : (
                      <span className="price-tag price-tag--free">{t("services_free")}</span>
                    )}
                  </div>
                  <p>{srv.description}</p>
                  <div className="service-card__meta">
                    <span className="pill">SLA {srv.sla} {t("marketplace_sla")}</span>
                    <span className="pill">{srv.agents} {t("marketplace_agents")}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="card-list" style={{ gap: 12 }}>
          {channelAdsForActive.length === 0 ? (
            <div className="empty-state">
              {t("servicesPage_noAds")}
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
                    {t("servicesPage_contactSeller")}
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
