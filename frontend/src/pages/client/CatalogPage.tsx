import { useState, useMemo, useCallback, useEffect } from "react";
import type { Channel, Service } from "../../types";
import { useLocale } from "../../lib/i18n";

/* ================================================================
   Types & Props
   ================================================================ */

type CatalogPageProps = {
  channels: Channel[];
  channelFilter: string;
  channelRatings: Record<string, { rating: number; count: number }>;
  onFilterChange: (filter: string) => void;
  onOpenChannelServices: (channelId: string) => void;
  onOpenReview: (channelId: string) => void;
  showToast: (msg: string) => void;
};

type FlatService = Service & {
  channelId: string;
  channelName: string;
  channelColor: string;
  channelType: string;
  channelRating: number;
  channelReviewCount: number;
};

type SortKey = "rating" | "price_asc" | "price_desc" | "new";

/* ================================================================
   Demo reviews
   ================================================================ */

const DEMO_REVIEWS: Record<string, { author: string; stars: number; text: string; date: string }[]> = {
  default: [
    { author: "Алексей М.", stars: 5, text: "Отличный сервис, очень быстро ответили!", date: "28 мар" },
    { author: "Наталья К.", stars: 4, text: "Хорошая поддержка, решили вопрос за 10 минут.", date: "25 мар" },
    { author: "Дмитрий В.", stars: 5, text: "Рекомендую! Работают через Telegram — очень удобно.", date: "20 мар" },
  ],
};

/* ================================================================
   Helpers: Stars / StarIcon
   ================================================================ */

function StarIcon({ filled, size = 12 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "#f5a623" : "none"} stroke="#f5a623" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function Stars({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} filled={i <= Math.round(rating)} size={size} />
      ))}
    </span>
  );
}

/* ================================================================
   Main Component
   ================================================================ */

export default function CatalogPage({
  channels,
  channelFilter,
  channelRatings,
  onFilterChange,
  onOpenChannelServices,
  onOpenReview,
  showToast,
}: CatalogPageProps) {
  const { t } = useLocale();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("rating");
  const [tgOnly, setTgOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Record<string, "services" | "reviews">>({});
  const [showSort, setShowSort] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);

  /* ── Flatten channels into services ── */
  const allServices = useMemo<FlatService[]>(() => {
    const result: FlatService[] = [];
    for (const ch of channels) {
      const ratingInfo = channelRatings[ch.id] ?? { rating: ch.rating ?? 4.5, count: ch.reviewCount ?? 0 };
      for (const svc of ch.services) {
        result.push({
          ...svc,
          channelId: ch.id,
          channelName: ch.name,
          channelColor: ch.color,
          channelType: ch.type,
          channelRating: ratingInfo.rating,
          channelReviewCount: ratingInfo.count,
        });
      }
    }
    return result;
  }, [channels, channelRatings]);

  /* ── Filtered & sorted list ── */
  const filtered = useMemo(() => {
    let list = allServices;
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.channelName.toLowerCase().includes(q));
    if (channelFilter !== "all") list = list.filter((s) => s.channelType === channelFilter);
    if (tgOnly) list = list.filter((s) => s.channelType === "Mini App" || s.channelType === "Bot");
    switch (sortKey) {
      case "price_asc": list = [...list].sort((a, b) => (a.price ?? 0) - (b.price ?? 0)); break;
      case "price_desc": list = [...list].sort((a, b) => (b.price ?? 0) - (a.price ?? 0)); break;
      case "rating": list = [...list].sort((a, b) => b.channelRating - a.channelRating); break;
      case "new": list = [...list].reverse(); break;
    }
    return list;
  }, [allServices, search, channelFilter, tgOnly, sortKey]);

  /* ── Category & sort constants ── */
  const CATEGORIES = [
    { key: "all", label: t("marketplace_allCategories") },
    { key: "Mini App", label: t("marketplace_miniApp") },
    { key: "Bot", label: t("marketplace_bot") },
    { key: "Канал", label: t("marketplace_channel") },
    { key: "Провайдер", label: t("marketplace_provider") },
  ];

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: "rating", label: t("marketplace_sortRating") },
    { key: "price_asc", label: t("marketplace_sortPrice") + " ↑" },
    { key: "price_desc", label: t("marketplace_sortPrice") + " ↓" },
    { key: "new", label: t("marketplace_sortNew") },
  ];

  /* ── Bottom sheet open/close with animation ── */
  const openSheet = useCallback((cardId: string) => {
    setExpandedId(cardId);
    // Small delay so the DOM renders before the CSS transition triggers
    requestAnimationFrame(() => setSheetVisible(true));
  }, []);

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
    // Wait for the slide-down transition then unmount
    setTimeout(() => setExpandedId(null), 280);
  }, []);

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (expandedId) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [expandedId]);

  /* ── Helper: get active tab for a card ── */
  function getTabForCard(id: string): "services" | "reviews" {
    return activeTab[id] ?? "services";
  }

  /* ── Find the expanded service ── */
  const expandedService = useMemo(() => {
    if (!expandedId) return null;
    return allServices.find((s) => `${s.channelId}-${s.id}` === expandedId) ?? null;
  }, [expandedId, allServices]);

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--surface)" }}>

      {/* ── Sticky header ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "var(--bg)",
        paddingBottom: 0,
      }}>
        {/* Title row + sort button */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px" }}>
          <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.4px", color: "var(--text)" }}>
            {t("marketplace_title")}
          </span>
          <button
            type="button"
            onClick={() => setShowSort((v) => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              background: showSort ? "var(--primary)" : "var(--surface)",
              border: "none", borderRadius: 9999, padding: "6px 12px",
              fontSize: 12, fontWeight: 600,
              color: showSort ? "#fff" : "var(--text-secondary)",
              cursor: "pointer", transition: "background 0.15s, color 0.15s",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="8" y1="12" x2="20" y2="12" />
              <line x1="12" y1="18" x2="20" y2="18" />
            </svg>
            {t("marketplace_sortBy")}
          </button>
        </div>

        {/* Sort dropdown (pills) */}
        {showSort && (
          <div style={{ display: "flex", gap: 6, padding: "0 16px 10px", flexWrap: "wrap" }}>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => { setSortKey(opt.key); setShowSort(false); }}
                style={{
                  padding: "5px 12px", borderRadius: 9999, fontSize: 12, fontWeight: 500,
                  border: "none", cursor: "pointer", fontFamily: "inherit",
                  background: sortKey === opt.key ? "var(--primary)" : "var(--surface)",
                  color: sortKey === opt.key ? "#fff" : "var(--text-secondary)",
                  transition: "background 0.15s",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Search bar */}
        <div style={{ padding: "0 16px 10px" }}>
          <div style={{
            display: "flex", alignItems: "center", height: 40,
            background: "var(--surface)", borderRadius: 12, padding: "0 12px", gap: 8,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-hint)" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              placeholder={t("marketplace_search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1, border: "none", outline: "none", background: "transparent",
                fontSize: 15, color: "var(--text)", fontFamily: "inherit",
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-hint)", padding: 0, display: "flex" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Horizontal scrollable filter chips: TG-only toggle + categories */}
        <div style={{
          display: "flex", gap: 8, padding: "0 16px 12px",
          overflowX: "auto", flexShrink: 0, scrollbarWidth: "none",
        }}>
          {/* TG toggle */}
          <button
            type="button"
            onClick={() => setTgOnly((v) => !v)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "6px 12px", borderRadius: 9999, fontSize: 12, fontWeight: 600,
              border: "none", cursor: "pointer", flexShrink: 0, fontFamily: "inherit",
              background: tgOnly ? "#2AABEE" : "var(--surface)",
              color: tgOnly ? "#fff" : "var(--text-secondary)",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill={tgOnly ? "#fff" : "#2AABEE"}>
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.04 9.607c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.16 14.36l-2.963-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.13.66.226z" />
            </svg>
            {t("marketplace_tgOnly")}
          </button>
          {/* Category chips */}
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => onFilterChange(c.key)}
              style={{
                padding: "6px 14px", borderRadius: 9999, fontSize: 12, fontWeight: 500,
                border: "none", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                fontFamily: "inherit",
                background: channelFilter === c.key ? "var(--primary)" : "var(--surface)",
                color: channelFilter === c.key ? "#fff" : "var(--text-secondary)",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Results count ── */}
      <div style={{ padding: "8px 16px 4px", fontSize: 12, color: "var(--text-hint)" }}>
        {filtered.length > 0 ? `${filtered.length} ${t("servicesPage_resultsCount")}` : ""}
      </div>

      {/* ── 2-column product grid ── */}
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        {filtered.length === 0 ? (
          /* Empty state */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "56px 16px", textAlign: "center", gap: 12 }}>
            <svg width="56" height="56" viewBox="0 0 48 48" fill="none" stroke="var(--text-hint)" strokeWidth="1.5" strokeLinecap="round">
              <rect x="8" y="12" width="32" height="24" rx="4" />
              <line x1="8" y1="20" x2="40" y2="20" />
              <line x1="16" y1="28" x2="32" y2="28" />
            </svg>
            <div style={{ fontSize: 15, color: "var(--text-hint)" }}>{t("marketplace_empty")}</div>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            padding: "0 12px 80px",
          }}>
            {filtered.map((svc, idx) => {
              const cardId = `${svc.channelId}-${svc.id}`;
              const ratingDisplay = svc.channelRating > 0 ? svc.channelRating.toFixed(1) : "—";
              const isFree = !svc.price;
              const initial = svc.channelName.charAt(0).toUpperCase();

              return (
                /* ── Product card (Ozon style) ── */
                <div
                  key={cardId}
                  className="cascade-item"
                  style={{
                    background: "var(--surface-card)",
                    borderRadius: 12,
                    overflow: "hidden",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    animationDelay: `${idx * 30}ms`,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                  }}
                  onClick={() => openSheet(cardId)}
                >
                  {/* ── Square cover image area ── */}
                  <div style={{ position: "relative", width: "100%", paddingBottom: "100%", overflow: "hidden" }}>
                    <div style={{ position: "absolute", inset: 0 }}>
                      {svc.coverUrl ? (
                        <img
                          src={svc.coverUrl}
                          alt={svc.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                      ) : (
                        /* Gradient placeholder with large initial */
                        <div style={{
                          width: "100%", height: "100%",
                          background: `linear-gradient(135deg, ${svc.channelColor}, ${svc.channelColor}88)`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <span style={{ fontSize: 48, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
                            {initial}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Seller avatar (small circle, bottom-left of image, overlapping) */}
                    <div style={{
                      position: "absolute", bottom: -8, left: 8,
                      width: 22, height: 22, borderRadius: "50%",
                      background: svc.channelColor,
                      border: "2px solid var(--surface-card)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontSize: 10, fontWeight: 700,
                      zIndex: 2,
                    }}>
                      {initial}
                    </div>

                    {/* Channel type badge (top-right) */}
                    <div style={{
                      position: "absolute", top: 6, right: 6,
                      background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
                      color: "#fff", fontSize: 10, fontWeight: 600,
                      padding: "2px 6px", borderRadius: 6,
                      lineHeight: 1.4,
                    }}>
                      {svc.channelType}
                    </div>
                  </div>

                  {/* ── Card body ── */}
                  <div style={{ padding: 8, display: "flex", flexDirection: "column", flex: 1 }}>
                    {/* Service name (2 lines max) */}
                    <div style={{
                      fontSize: 14, fontWeight: 600, lineHeight: 1.3,
                      color: "var(--text)",
                      marginBottom: 4,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}>
                      {svc.name}
                    </div>

                    {/* Stars + rating text */}
                    <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 4 }}>
                      <Stars rating={svc.channelRating} size={10} />
                      <span style={{ fontSize: 11, color: "var(--text-hint)", lineHeight: 1 }}>
                        {ratingDisplay} ({svc.channelReviewCount})
                      </span>
                    </div>

                    {/* Price */}
                    <div style={{
                      fontSize: 15, fontWeight: 700, marginBottom: 6,
                      color: isFree ? "var(--green)" : "var(--text)",
                      marginTop: "auto",
                    }}>
                      {isFree ? t("marketplace_free") : `${(svc.price ?? 0).toLocaleString("ru-RU")} ₽`}
                    </div>

                    {/* "Подключить" button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenChannelServices(svc.channelId);
                      }}
                      style={{
                        width: "100%", height: 34,
                        borderRadius: 10, border: "none",
                        background: "var(--primary)", color: "#fff",
                        fontSize: 13, fontWeight: 600,
                        cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      {t("marketplace_connect")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================================================================
         Bottom Sheet Overlay (detail view for expanded card)
         ================================================================ */}
      {expandedId && expandedService && (() => {
        const svc = expandedService;
        const cardId = `${svc.channelId}-${svc.id}`;
        const cardTab = getTabForCard(cardId);
        const reviews = DEMO_REVIEWS[svc.id] ?? DEMO_REVIEWS.default;
        const ratingDisplay = svc.channelRating > 0 ? svc.channelRating.toFixed(1) : "—";
        const isFree = !svc.price;
        const initial = svc.channelName.charAt(0).toUpperCase();

        return (
          /* Fixed overlay */
          <div style={{
            position: "fixed", inset: 0, zIndex: 40,
            pointerEvents: "auto",
          }}>
            {/* Dark backdrop */}
            <div
              style={{
                position: "absolute", inset: 0,
                background: "rgba(0,0,0,0.4)",
                opacity: sheetVisible ? 1 : 0,
                transition: "opacity 0.28s ease",
              }}
              onClick={closeSheet}
            />

            {/* Sheet */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              height: "72vh",
              background: "var(--bg)",
              borderRadius: "20px 20px 0 0",
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              transform: sheetVisible ? "translateY(0)" : "translateY(100%)",
              transition: "transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)",
              boxShadow: "0 -4px 24px rgba(0,0,0,0.12)",
            }}>
              {/* Handle bar */}
              <div style={{
                display: "flex", justifyContent: "center",
                padding: "10px 0 0",
                position: "sticky", top: 0, zIndex: 1,
                background: "var(--bg)", borderRadius: "20px 20px 0 0",
              }}>
                <div style={{
                  width: 40, height: 4, borderRadius: 2,
                  background: "var(--text-hint)", opacity: 0.4,
                }} />
              </div>

              {/* ── Cover image (16:9-ish, 180px) ── */}
              {svc.coverUrl ? (
                <img
                  src={svc.coverUrl}
                  alt={svc.name}
                  style={{
                    width: "100%", height: 180, objectFit: "cover", display: "block",
                  }}
                />
              ) : (
                <div style={{
                  width: "100%", height: 180,
                  background: `linear-gradient(135deg, ${svc.channelColor}, ${svc.channelColor}88)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 64, fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>
                    {initial}
                  </span>
                </div>
              )}

              <div style={{ padding: "12px 16px 24px" }}>
                {/* ── Seller row: avatar 40px + name + stars ── */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: svc.channelColor,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 16, fontWeight: 700,
                  }}>
                    {initial}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 600, color: "var(--text)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {svc.channelName}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <Stars rating={svc.channelRating} />
                      <span style={{ fontSize: 11, color: "var(--text-hint)" }}>
                        {ratingDisplay} · {svc.channelReviewCount} {t("marketplace_reviews")}
                      </span>
                    </div>
                  </div>
                  {/* Type badge */}
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    background: "rgba(42,171,238,0.1)", color: "#2AABEE",
                    fontSize: 11, fontWeight: 600, padding: "2px 8px",
                    borderRadius: 9999, whiteSpace: "nowrap",
                  }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="#2AABEE">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.04 9.607c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.16 14.36l-2.963-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.13.66.226z" />
                    </svg>
                    {svc.channelType}
                  </span>
                </div>

                {/* ── Title ── */}
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", lineHeight: 1.3, marginBottom: 4 }}>
                  {svc.name}
                </div>

                {/* ── Price ── */}
                <div style={{
                  fontSize: 20, fontWeight: 700, marginBottom: 10,
                  color: isFree ? "var(--green)" : "var(--text)",
                }}>
                  {isFree
                    ? t("marketplace_free")
                    : `${(svc.price ?? 0).toLocaleString("ru-RU")} ${svc.currency === "RUB" ? "₽" : svc.currency ?? "₽"}`}
                </div>

                {/* ── Description ── */}
                <div style={{
                  fontSize: 13, color: "var(--text-hint)", lineHeight: 1.5, marginBottom: 12,
                  display: "-webkit-box", WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical", overflow: "hidden",
                }}>
                  {svc.description}
                </div>

                {/* ── SLA + Agents chips ── */}
                <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    background: "rgba(42,171,238,0.08)", color: "var(--primary)",
                    fontSize: 11, fontWeight: 500, padding: "3px 9px", borderRadius: 9999,
                  }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                    {svc.sla} {t("marketplace_sla")}
                  </span>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    background: "rgba(52,199,89,0.08)", color: "var(--green)",
                    fontSize: 11, fontWeight: 500, padding: "3px 9px", borderRadius: 9999,
                  }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 00-3-3.87" />
                      <path d="M16 3.13a4 4 0 010 7.75" />
                    </svg>
                    {svc.agents} {t("marketplace_agents")}
                  </span>
                  {svc.slug && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(`#service/${svc.slug}`).catch(() => {});
                        showToast(t("services_copied"));
                      }}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        background: "var(--surface)", color: "var(--text-hint)",
                        fontSize: 11, fontWeight: 500, padding: "3px 9px", borderRadius: 9999,
                        border: "none", cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                      </svg>
                      Ссылка
                    </button>
                  )}
                </div>

                {/* ── Tab switcher: Услуги | Отзывы ── */}
                <div style={{
                  display: "flex", gap: 0,
                  background: "var(--surface)", borderRadius: 10, padding: 3, marginBottom: 12,
                }}>
                  {(["services", "reviews"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab((prev) => ({ ...prev, [cardId]: tab }))}
                      style={{
                        flex: 1, padding: "7px 0", border: "none", cursor: "pointer",
                        fontSize: 12, fontWeight: 600, fontFamily: "inherit", borderRadius: 8,
                        background: cardTab === tab ? "var(--surface-card)" : "transparent",
                        color: cardTab === tab ? "var(--primary)" : "var(--text-hint)",
                        transition: "background 0.15s, color 0.15s",
                        boxShadow: cardTab === tab ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                      }}
                    >
                      {tab === "services" ? t("marketplace_servicesTab") : t("marketplace_reviewsTab")}
                    </button>
                  ))}
                </div>

                {/* ── Tab content ── */}
                {cardTab === "services" ? (
                  <button
                    type="button"
                    onClick={() => onOpenChannelServices(svc.channelId)}
                    style={{
                      width: "100%", height: 44,
                      background: "var(--primary-gradient)", color: "#fff",
                      border: "none", borderRadius: 12,
                      fontSize: 15, fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit",
                      boxShadow: "0 4px 16px rgba(42,171,238,0.35)",
                      transition: "opacity 0.15s",
                    }}
                  >
                    {t("marketplace_connect")}
                  </button>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {reviews.length === 0 ? (
                      <div style={{ padding: "16px 0", textAlign: "center", fontSize: 13, color: "var(--text-hint)" }}>
                        {t("marketplace_noReviews")}
                      </div>
                    ) : (
                      reviews.map((r, ri) => (
                        <div key={ri} style={{ background: "var(--surface)", borderRadius: 12, padding: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{
                                width: 28, height: 28, borderRadius: "50%",
                                background: svc.channelColor,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                color: "#fff", fontSize: 11, fontWeight: 700,
                              }}>
                                {r.author.charAt(0)}
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                                {r.author}
                              </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Stars rating={r.stars} />
                              <span style={{ fontSize: 11, color: "var(--text-hint)" }}>{r.date}</span>
                            </div>
                          </div>
                          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                            {r.text}
                          </div>
                        </div>
                      ))
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenReview(svc.channelId)}
                      style={{
                        width: "100%", height: 40,
                        background: "var(--surface)", color: "var(--primary)",
                        border: "none", borderRadius: 10,
                        fontSize: 13, fontWeight: 600,
                        cursor: "pointer", fontFamily: "inherit",
                        transition: "background 0.15s",
                      }}
                    >
                      {t("marketplace_writeReview")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
