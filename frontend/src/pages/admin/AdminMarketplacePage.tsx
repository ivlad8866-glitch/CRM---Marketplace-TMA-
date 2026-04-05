import { useState, useMemo, useRef } from "react";
import { useLocale } from "../../lib/i18n";
import type { TranslationKey } from "../../lib/i18n";
import type { Channel } from "../../types";

/* ── Types ──────────────────────────────────────────────────────── */

type ListingStatus = "active" | "paused" | "draft";

type Listing = {
  id: string;
  name: string;
  description: string;
  price: number | null;
  sla: number;
  agents: number;
  channelType: "Mini App" | "Bot" | "Канал" | "Провайдер";
  status: ListingStatus;
  views: number;
  leads: number;
  coverUrl: string;
  logoUrl: string;
};

type SellerProfile = {
  companyName: string;
  about: string;
  telegramLink: string;
  city: string;
  rating: number;
  reviewCount: number;
  logoUrl: string;
  bannerUrl: string;
};

type TabKey = "listings" | "analytics" | "profile";

type AdminMarketplacePageProps = {
  channels: Channel[];
  channelRatings: Record<string, { rating: number; count: number }>;
  showToast: (msg: string) => void;
};

/* ── Demo seed data ─────────────────────────────────────────────── */

const DEMO_LISTINGS: Listing[] = [
  {
    id: "l-1",
    name: "Консультация по заказу",
    description: "Помогаем клиентам оформить заказ, отслеживать доставку и решать вопросы возврата.",
    price: 0,
    sla: 5,
    agents: 4,
    channelType: "Mini App",
    status: "active",
    views: 284,
    leads: 37,
    coverUrl: "",
    logoUrl: "",
  },
  {
    id: "l-2",
    name: "Техническая поддержка",
    description: "Решение технических вопросов по продуктам. Доступно 24/7 через Telegram-бота.",
    price: 1500,
    sla: 15,
    agents: 2,
    channelType: "Bot",
    status: "active",
    views: 142,
    leads: 18,
    coverUrl: "",
    logoUrl: "",
  },
  {
    id: "l-3",
    name: "VIP-поддержка",
    description: "Персональный менеджер, SLA 3 минуты, выделенная линия.",
    price: 9900,
    sla: 3,
    agents: 1,
    channelType: "Провайдер",
    status: "paused",
    views: 56,
    leads: 4,
    coverUrl: "",
    logoUrl: "",
  },
  {
    id: "l-4",
    name: "Онбординг новых клиентов",
    description: "Автоматический сценарий знакомства с продуктом через Mini App.",
    price: null,
    sla: 10,
    agents: 3,
    channelType: "Mini App",
    status: "draft",
    views: 0,
    leads: 0,
    coverUrl: "",
    logoUrl: "",
  },
];

const DEMO_PROFILE: SellerProfile = {
  companyName: "CRM Support Pro",
  about: "Профессиональная поддержка клиентов через Telegram. Работаем с 2020 года.",
  telegramLink: "@crmsupportpro",
  city: "Москва",
  rating: 4.8,
  reviewCount: 127,
  logoUrl: "",
  bannerUrl: "",
};

/* ── Inline style constants ────────────────────────────────────── */

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  height: 44,
  borderRadius: 12,
  border: "1px solid var(--divider)",
  background: "var(--surface)",
  padding: "0 14px",
  fontSize: 15,
  color: "var(--text)",
  fontFamily: "inherit",
  outline: "none",
};

const TEXTAREA_STYLE: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 12,
  border: "1px solid var(--divider)",
  background: "var(--surface)",
  padding: "10px 14px",
  fontSize: 15,
  color: "var(--text)",
  fontFamily: "inherit",
  outline: "none",
  resize: "none",
  lineHeight: 1.5,
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--text-secondary)",
  display: "block",
  marginBottom: 6,
};

const CHIP_BASE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 11,
  fontWeight: 500,
  padding: "3px 9px",
  borderRadius: 9999,
};

const STATUS_COLORS: Record<ListingStatus, { bg: string; color: string }> = {
  active: { bg: "rgba(52,199,89,0.12)", color: "#34c759" },
  paused: { bg: "rgba(255,149,0,0.12)", color: "#ff9500" },
  draft: { bg: "rgba(142,142,147,0.14)", color: "#8e8e93" },
};

function getStatusLabel(status: ListingStatus, t: (key: TranslationKey) => string): string {
  if (status === "active") return t("adminMkt_statusActive");
  if (status === "paused") return t("adminMkt_statusPaused");
  return t("adminMkt_statusDraft");
}

const STATUS_BAR_COLORS: Record<ListingStatus, string> = {
  active: "#34c759",
  paused: "#ff9500",
  draft: "#c7c7cc",
};

const CHANNEL_TYPES: Listing["channelType"][] = ["Mini App", "Bot", "Канал", "Провайдер"];

/* ── SVG Icons (small, inline) ─────────────────────────────────── */

function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= Math.round(rating) ? "#f5a623" : "none"} stroke="#f5a623" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </span>
  );
}

/* ── CoverUpload ───────────────────────────────────────────────── */

type CoverUploadProps = {
  coverUrl: string;
  /** When true, renders a 1:1 square via padding-bottom trick (Ozon-style product card). */
  square?: boolean;
  height?: number;
  onUpload: (dataUrl: string) => void;
  showToast: (msg: string) => void;
  children?: React.ReactNode;
};

function CoverUpload({ coverUrl, square = false, height = 160, onUpload, showToast, children }: CoverUploadProps) {
  const { t } = useLocale();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onUpload(reader.result as string);
      showToast(t("adminMkt_coverUploaded"));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  /*
   * Square mode: outer div has position:relative + paddingBottom:100% (= width),
   * inner div is position:absolute inset:0 — classic CSS aspect-ratio 1:1 trick.
   * Works in all browsers without the aspect-ratio CSS property.
   */
  const outerStyle: React.CSSProperties = square
    ? { position: "relative", width: "100%", paddingBottom: "100%", cursor: "pointer" }
    : { position: "relative", width: "100%", height, overflow: "hidden", cursor: "pointer" };

  const innerStyle: React.CSSProperties = square
    ? { position: "absolute", inset: 0, overflow: "hidden" }
    : { width: "100%", height: "100%" };

  return (
    <div style={outerStyle}
      onClick={() => fileRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-label={t("adminMkt_coverLabel")}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
    >
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile}
        style={{ display: "none" }} aria-hidden="true" />
      <div style={innerStyle}>
      {coverUrl ? (
        <img src={coverUrl} alt={t("services_coverAlt")} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : (
        <div style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #e8f4fd 0%, #d1ecf9 50%, #b8e3f5 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--primary)" }}>{t("adminMkt_coverLabel")}</span>
        </div>
      )}
      {children}
      </div>
    </div>
  );
}

/* ── ListingCard (Ozon-style compact 2-col grid card) ──────────── */

type ListingCardProps = {
  listing: Listing;
  profile: SellerProfile;
  menuOpenId: string | null;
  onMenuToggle: (id: string | null) => void;
  onEdit: (l: Listing) => void;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
  onPromote: (id: string) => void;
  onCoverUpload: (id: string, dataUrl: string) => void;
  onOpenDetail: (l: Listing) => void;
  showToast: (msg: string) => void;
  t: (key: TranslationKey) => string;
};

function ListingCard({
  listing, profile, menuOpenId, onMenuToggle, onEdit,
  onToggleStatus, onDelete, onPromote, onCoverUpload, onOpenDetail, showToast, t,
}: ListingCardProps) {
  /* ── Pause/play button style by status ── */
  const toggleBtnStyle = useMemo((): React.CSSProperties => {
    const base: React.CSSProperties = {
      flex: 1,
      height: 32,
      borderRadius: 8,
      fontSize: 12,
      fontWeight: 600,
      border: "none",
      cursor: "pointer",
      fontFamily: "inherit",
    };
    if (listing.status === "active") {
      return { ...base, background: "rgba(255,149,0,0.1)", color: "#ff9500" };
    }
    if (listing.status === "paused") {
      return { ...base, background: "rgba(52,199,89,0.1)", color: "#34c759" };
    }
    /* draft */
    return { ...base, background: "var(--surface)", color: "var(--text-hint)" };
  }, [listing.status]);

  const toggleBtnLabel = useMemo(() => {
    if (listing.status === "active") return t("adminMkt_pause");
    if (listing.status === "paused") return t("adminMkt_activate");
    return t("adminMkt_statusDraft");
  }, [listing.status, t]);

  return (
    <div style={{
      background: "var(--surface-card)",
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      position: "relative",
    }}>
      {/* ── Status color bar (3px, very top) ── */}
      <div style={{
        height: 3,
        background: STATUS_BAR_COLORS[listing.status],
        width: "100%",
      }} />

      {/* ── Square cover image ── */}
      <div style={{ position: "relative" }}>
        <CoverUpload
          coverUrl={listing.coverUrl}
          square
          onUpload={(url) => onCoverUpload(listing.id, url)}
          showToast={showToast}
        >
          {/* Status badge — top-right inside cover */}
          <div
            style={{ position: "absolute", top: 6, right: 6 }}
            onClick={(e) => e.stopPropagation()}
          >
            <span style={{
              display: "inline-block",
              background: STATUS_COLORS[listing.status].bg,
              color: STATUS_COLORS[listing.status].color,
              fontSize: 10,
              fontWeight: 600,
              padding: "1px 6px",
              borderRadius: 9999,
              backdropFilter: "blur(4px)",
              lineHeight: 1.4,
            }}>
              {getStatusLabel(listing.status, t)}
            </span>
          </div>

          {/* Channel type badge — top-left inside cover */}
          <div
            style={{
              position: "absolute",
              top: 6,
              left: 6,
              background: "rgba(42,171,238,0.88)",
              color: "#fff",
              fontSize: 10,
              fontWeight: 600,
              padding: "1px 6px",
              borderRadius: 9999,
              backdropFilter: "blur(4px)",
              lineHeight: 1.4,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {listing.channelType}
          </div>
        </CoverUpload>
      </div>

      {/* ── Card body ── */}
      <div style={{ padding: 8, position: "relative" }}>
        {/* ··· menu button — absolute top-right of card body */}
        <div style={{ position: "absolute", top: 4, right: 4, zIndex: 10 }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMenuToggle(menuOpenId === listing.id ? null : listing.id); }}
            aria-label={t("adminMkt_menuLabel")}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--text-hint)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>

          {/* Context menu dropdown */}
          {menuOpenId === listing.id && (
            <div onClick={(e) => e.stopPropagation()} style={{
              position: "absolute",
              top: 30,
              right: 0,
              zIndex: 30,
              background: "var(--bg)",
              borderRadius: 12,
              boxShadow: "0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)",
              minWidth: 160,
              overflow: "hidden",
            }}>
              {[
                {
                  label: t("adminMkt_editListing"),
                  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
                  action: () => { onEdit(listing); onMenuToggle(null); },
                  color: "var(--text)",
                },
                {
                  label: listing.status === "active" ? t("adminMkt_pause") : t("adminMkt_activate"),
                  icon: listing.status === "active"
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>,
                  action: () => onToggleStatus(listing.id),
                  color: listing.status === "active" ? "#ff9500" : "#34c759",
                },
                {
                  label: t("adminMkt_promote"),
                  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>,
                  action: () => onPromote(listing.id),
                  color: "var(--primary)",
                },
                {
                  label: t("adminMkt_delete"),
                  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg>,
                  action: () => onDelete(listing.id),
                  color: "#ff3b30",
                },
              ].map((item, i, arr) => (
                <button key={i} type="button" onClick={item.action} style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  padding: "10px 14px", background: "none", border: "none",
                  cursor: "pointer", fontFamily: "inherit", fontSize: 13,
                  fontWeight: 500, color: item.color,
                  borderBottom: i < arr.length - 1 ? "0.5px solid var(--divider)" : "none",
                  textAlign: "left",
                }}>
                  <span style={{ color: item.color, display: "flex" }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Clickable title area (opens bottom sheet) ── */}
        <div
          onClick={() => onOpenDetail(listing)}
          style={{ cursor: "pointer" }}
          role="button"
          tabIndex={0}
          aria-label={`${t("adminMkt_detailLabel")}: ${listing.name}`}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpenDetail(listing); }}
        >
          {/* 1. Seller row: avatar + company name */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <div style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              flexShrink: 0,
              overflow: "hidden",
              background: listing.logoUrl ? "transparent" : "var(--primary-gradient)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              {listing.logoUrl ? (
                <img src={listing.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 9, fontWeight: 700, color: "#fff" }}>
                  {(profile.companyName || "C").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <span style={{
              fontSize: 11,
              color: "var(--text-hint)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              lineHeight: 1.2,
              flex: 1,
              minWidth: 0,
              paddingRight: 28,
            }}>
              {profile.companyName}
            </span>
          </div>

          {/* 2. Service name (2 lines max) */}
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text)",
            lineHeight: 1.3,
            marginBottom: 4,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            maxHeight: "2.6em",
          }}>
            {listing.name}
          </div>

          {/* 3. Stars row (compact) */}
          <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 4 }}>
            <Stars rating={profile.rating} size={10} />
            <span style={{ fontSize: 11, color: "var(--text-hint)", lineHeight: 1 }}>
              {profile.rating.toFixed(1)}
            </span>
          </div>

          {/* 4. Price */}
          <div style={{ marginBottom: 8 }}>
            {listing.price === 0 || listing.price == null ? (
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--green)" }}>{t("services_free")}</span>
            ) : (
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                {listing.price.toLocaleString("ru-RU")} ₽
              </span>
            )}
          </div>
        </div>

        {/* 5. Two action buttons row */}
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(listing); }}
            aria-label={t("adminMkt_editLabel")}
            style={{
              flex: 1,
              height: 32,
              borderRadius: 8,
              background: "var(--surface)",
              color: "var(--primary)",
              fontSize: 12,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {t("adminMkt_editShort")}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleStatus(listing.id); }}
            aria-label={listing.status === "active" ? t("adminMkt_pauseLabel") : t("adminMkt_activateLabel")}
            style={toggleBtnStyle}
          >
            {toggleBtnLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── ListingDetailSheet (bottom sheet overlay) ─────────────────── */

type ListingDetailSheetProps = {
  listing: Listing;
  profile: SellerProfile;
  onClose: () => void;
  onEdit: (l: Listing) => void;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
  onPromote: (id: string) => void;
  t: (key: TranslationKey) => string;
};

function ListingDetailSheet({
  listing, profile, onClose, onEdit, onToggleStatus, onDelete, onPromote, t,
}: ListingDetailSheetProps) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 40 }}>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
        }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "75vh",
        background: "var(--bg)",
        borderRadius: "20px 20px 0 0",
        overflowY: "auto",
        zIndex: 41,
      }}>
        {/* Handle bar */}
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 0" }}>
          <div style={{
            width: 40,
            height: 4,
            background: "var(--divider)",
            borderRadius: 2,
          }} />
        </div>

        {/* Cover image */}
        <div style={{
          width: "100%",
          height: 200,
          overflow: "hidden",
          marginTop: 10,
        }}>
          {listing.coverUrl ? (
            <img
              src={listing.coverUrl}
              alt={t("adminMkt_coverAlt")}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <div style={{
              width: "100%",
              height: "100%",
              background: "linear-gradient(135deg, #e8f4fd 0%, #d1ecf9 50%, #b8e3f5 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-hint)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: "14px 16px 32px" }}>
          {/* Seller info row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              flexShrink: 0,
              overflow: "hidden",
              background: listing.logoUrl ? "transparent" : "var(--primary-gradient)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              {listing.logoUrl ? (
                <img src={listing.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
                  {(profile.companyName || "C").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {profile.companyName}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                <Stars rating={profile.rating} size={11} />
                <span style={{ fontSize: 11, color: "var(--text-hint)" }}>
                  {profile.rating.toFixed(1)} · {profile.reviewCount} {t("adminMkt_reviews")}
                </span>
              </div>
            </div>
          </div>

          {/* Title */}
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", lineHeight: 1.3, marginBottom: 8 }}>
            {listing.name}
          </div>

          {/* Price chips */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {listing.price === 0 || listing.price == null ? (
              <span style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--green)",
              }}>{t("services_free")}</span>
            ) : (
              <span style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text)",
              }}>
                {listing.price.toLocaleString("ru-RU")} ₽
              </span>
            )}
            <span style={{
              ...CHIP_BASE,
              background: STATUS_COLORS[listing.status].bg,
              color: STATUS_COLORS[listing.status].color,
              fontWeight: 600,
            }}>
              {getStatusLabel(listing.status, t)}
            </span>
            <span style={{
              ...CHIP_BASE,
              background: "rgba(42,171,238,0.08)",
              color: "var(--primary)",
            }}>
              {listing.channelType}
            </span>
          </div>

          {/* Description */}
          {listing.description && (
            <div style={{
              fontSize: 14,
              color: "var(--text-secondary)",
              lineHeight: 1.55,
              marginBottom: 16,
            }}>
              {listing.description}
            </div>
          )}

          {/* Stats (views / leads) */}
          <div style={{
            display: "flex",
            gap: 16,
            padding: "12px 0",
            borderTop: "0.5px solid var(--divider)",
            borderBottom: "0.5px solid var(--divider)",
            marginBottom: 16,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-hint)" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
              </svg>
              <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{listing.views.toLocaleString("ru-RU")}</span>
              <span>{t("adminMkt_views")}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-hint)" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
              <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{listing.leads}</span>
              <span>{t("adminMkt_leads")}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              type="button"
              onClick={() => { onEdit(listing); onClose(); }}
              aria-label={t("adminMkt_editLabel")}
              style={{
                width: "100%",
                height: 46,
                borderRadius: 12,
                border: "1.5px solid var(--primary)",
                background: "transparent",
                color: "var(--primary)",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {t("adminMkt_editListing")}
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => { onToggleStatus(listing.id); onClose(); }}
                aria-label={listing.status === "active" ? t("adminMkt_pauseLabel") : t("adminMkt_activateLabel")}
                style={{
                  flex: 1,
                  height: 46,
                  borderRadius: 12,
                  border: "none",
                  background: listing.status === "active" ? "rgba(255,149,0,0.12)" : "rgba(52,199,89,0.12)",
                  color: listing.status === "active" ? "#ff9500" : "#34c759",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {listing.status === "active" ? t("adminMkt_pause") : t("adminMkt_activate")}
              </button>
              <button
                type="button"
                onClick={() => { onPromote(listing.id); onClose(); }}
                aria-label={t("adminMkt_promoteLabel")}
                style={{
                  flex: 1,
                  height: 46,
                  borderRadius: 12,
                  border: "none",
                  background: "rgba(42,171,238,0.1)",
                  color: "var(--primary)",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {t("adminMkt_promote")}
              </button>
            </div>
            <button
              type="button"
              onClick={() => { onDelete(listing.id); onClose(); }}
              aria-label={t("adminMkt_deleteLabel")}
              style={{
                width: "100%",
                height: 46,
                borderRadius: 12,
                border: "none",
                background: "rgba(255,59,48,0.08)",
                color: "#ff3b30",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {t("adminMkt_delete")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── ListingForm (full-screen overlay) ─────────────────────────── */

type ListingFormProps = {
  initial: Partial<Listing> | null;
  onSave: (l: Omit<Listing, "id" | "views" | "leads">) => void;
  onClose: () => void;
  showToast: (m: string) => void;
};

function ListingForm({ initial, onSave, onClose, showToast }: ListingFormProps) {
  const { t } = useLocale();
  const [name, setName] = useState(initial?.name ?? "");
  const [desc, setDesc] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price) : "");
  const [sla, setSla] = useState(initial?.sla != null ? String(initial.sla) : "");
  const [agents, setAgents] = useState(initial?.agents != null ? String(initial.agents) : "2");
  const [channelType, setChannelType] = useState<Listing["channelType"]>(initial?.channelType ?? "Bot");
  const [status, setStatus] = useState<ListingStatus>(initial?.status ?? "active");
  const [coverUrl, setCoverUrl] = useState(initial?.coverUrl ?? "");
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl ?? "");
  const logoRef = useRef<HTMLInputElement>(null);

  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleSave() {
    if (!name.trim()) { showToast(t("adminMkt_fillName")); return; }
    onSave({
      name: name.trim(),
      description: desc.trim(),
      price: price.trim() ? Number(price) : null,
      sla: sla.trim() ? Number(sla) : 15,
      agents: agents.trim() ? Number(agents) : 2,
      channelType,
      status,
      coverUrl,
      logoUrl,
    });
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: "0.5px solid var(--divider)" }}>
        <button type="button" onClick={onClose} aria-label={t("adminMkt_backLabel")}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", padding: 0, display: "flex" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span style={{ fontSize: 17, fontWeight: 600, color: "var(--text)" }}>
          {initial?.id ? t("adminMkt_editListing") : t("adminMkt_addListing")}
        </span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0 }}>
        {/* Cover upload at top */}
        <CoverUpload coverUrl={coverUrl} height={200} onUpload={setCoverUrl} showToast={showToast} />

        <div style={{ padding: "16px 16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Logo upload */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoFile}
              style={{ display: "none" }} aria-hidden="true" />
            <div
              onClick={() => logoRef.current?.click()}
              role="button" tabIndex={0} aria-label={t("adminMkt_uploadLogoLabel")}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") logoRef.current?.click(); }}
              style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0, cursor: "pointer",
                overflow: "hidden", position: "relative",
                background: logoUrl ? "transparent" : "var(--primary-gradient)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              )}
            </div>
            <span style={{ fontSize: 13, color: "var(--text-hint)" }}>{t("adminMkt_logoLabel")}</span>
          </div>

          {/* Name */}
          <div>
            <label style={LABEL_STYLE}>{t("adminMkt_nameLabel")} *</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder={t("adminMkt_namePlaceholder")} style={INPUT_STYLE} />
          </div>

          {/* Description */}
          <div>
            <label style={LABEL_STYLE}>{t("adminMkt_descLabel")}</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3}
              placeholder={t("adminMkt_descPlaceholder")} style={TEXTAREA_STYLE} />
          </div>

          {/* Price + SLA row */}
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={LABEL_STYLE}>{t("adminMkt_priceLabel")}</label>
              <input value={price} onChange={(e) => setPrice(e.target.value)}
                type="number" min="0" placeholder={t("adminMkt_pricePlaceholder")} style={INPUT_STYLE} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={LABEL_STYLE}>{t("adminMkt_slaLabel")}</label>
              <input value={sla} onChange={(e) => setSla(e.target.value)}
                type="number" min="1" placeholder="15" style={INPUT_STYLE} />
            </div>
          </div>

          {/* Agents */}
          <div>
            <label style={LABEL_STYLE}>{t("adminMkt_agentsLabel")}</label>
            <input value={agents} onChange={(e) => setAgents(e.target.value)}
              type="number" min="1" placeholder="2" style={INPUT_STYLE} />
          </div>

          {/* Channel type */}
          <div>
            <label style={{ ...LABEL_STYLE, marginBottom: 8 }}>{t("adminMkt_typeLabel")}</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {CHANNEL_TYPES.map((ct) => (
                <button key={ct} type="button" onClick={() => setChannelType(ct)}
                  style={{
                    padding: "7px 14px", borderRadius: 9999, fontSize: 13, fontWeight: 500,
                    border: "none", cursor: "pointer", fontFamily: "inherit",
                    background: channelType === ct ? "var(--primary)" : "var(--surface)",
                    color: channelType === ct ? "#fff" : "var(--text-secondary)",
                    transition: "background 0.15s, color 0.15s",
                  }}
                >
                  {ct}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label style={{ ...LABEL_STYLE, marginBottom: 8 }}>{t("adminMkt_statusLabel")}</label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["active", "paused", "draft"] as ListingStatus[]).map((s) => (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  style={{
                    padding: "7px 14px", borderRadius: 9999, fontSize: 13, fontWeight: 500,
                    border: "none", cursor: "pointer", fontFamily: "inherit",
                    background: status === s ? "var(--primary)" : "var(--surface)",
                    color: status === s ? "#fff" : "var(--text-secondary)",
                    transition: "background 0.15s, color 0.15s",
                  }}
                >
                  {getStatusLabel(s, t)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 16px", borderTop: "0.5px solid var(--divider)", display: "flex", gap: 10 }}>
        <button type="button" onClick={onClose} aria-label={t("adminMkt_cancelAriaLabel")}
          style={{
            flex: 1, height: 48, borderRadius: 14, border: "none",
            background: "var(--surface)", color: "var(--text-secondary)",
            fontSize: 16, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          {t("common_cancel")}
        </button>
        <button type="button" onClick={handleSave} aria-label={t("common_save")}
          style={{
            flex: 2, height: 48, borderRadius: 14, border: "none",
            background: "var(--primary-gradient)", color: "#fff",
            fontSize: 16, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            boxShadow: "0 4px 16px rgba(42,171,238,0.35)",
          }}
        >
          {t("common_save")}
        </button>
      </div>
    </div>
  );
}

/* ── AnalyticsTab ──────────────────────────────────────────────── */

type AnalyticsTabProps = {
  listings: Listing[];
  profile: SellerProfile;
  onNavigateToListings: (filter?: ListingStatus) => void;
  onEditListing: (l: Listing) => void;
};

function AnalyticsTab({ listings, profile, onNavigateToListings, onEditListing }: AnalyticsTabProps) {
  const totalViews = useMemo(() => listings.reduce((s, l) => s + l.views, 0), [listings]);
  const totalLeads = useMemo(() => listings.reduce((s, l) => s + l.leads, 0), [listings]);
  const maxViews = useMemo(() => Math.max(...listings.map((l) => l.views), 1), [listings]);

  const statusBreakdown = useMemo(() => ({
    active: listings.filter((l) => l.status === "active").length,
    paused: listings.filter((l) => l.status === "paused").length,
    draft: listings.filter((l) => l.status === "draft").length,
  }), [listings]);

  /* Funnel: impressions (views * 3 estimate) -> views -> leads */
  const funnelImpressions = useMemo(() => Math.round(totalViews * 3.2), [totalViews]);
  const funnelViewPct = useMemo(() => funnelImpressions > 0 ? Math.round((totalViews / funnelImpressions) * 100) : 0, [totalViews, funnelImpressions]);
  const funnelLeadPct = useMemo(() => totalViews > 0 ? Math.round((totalLeads / totalViews) * 100) : 0, [totalLeads, totalViews]);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 40px", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* KPI Grid 2x2 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { label: t("adminMkt_totalListings"), value: String(listings.length), icon: "grid", action: () => onNavigateToListings() },
          { label: t("adminMkt_totalViews"), value: totalViews.toLocaleString("ru-RU"), icon: "eye", action: () => onNavigateToListings() },
          { label: t("adminMkt_totalLeads"), value: String(totalLeads), icon: "users", action: () => onNavigateToListings() },
          { label: t("adminMkt_avgRating"), value: profile.rating.toFixed(1), icon: "star", action: () => {} },
        ].map((kpi, i) => (
          <button key={i} type="button" onClick={kpi.action} aria-label={kpi.label}
            style={{
              background: "var(--surface-card)", borderRadius: 14, padding: "14px 12px",
              boxShadow: "var(--shadow-card)", border: "none", cursor: "pointer",
              textAlign: "left", fontFamily: "inherit",
              display: "flex", flexDirection: "column", gap: 6,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {kpi.icon === "grid" && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                </svg>
              )}
              {kpi.icon === "eye" && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                </svg>
              )}
              {kpi.icon === "users" && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                </svg>
              )}
              {kpi.icon === "star" && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#f5a623" stroke="#f5a623" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              )}
              <span style={{ fontSize: 11, color: "var(--text-hint)" }}>{kpi.label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1.1 }}>
              {kpi.value}
            </div>
            {kpi.icon === "star" && <Stars rating={profile.rating} size={11} />}
          </button>
        ))}
      </div>

      {/* Per-listing bar chart */}
      <div style={{
        background: "var(--surface-card)", borderRadius: 14, padding: 14,
        boxShadow: "var(--shadow-card)",
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 12 }}>
          {t("adminMkt_viewsByListing")}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {listings.map((listing) => {
            const pct = maxViews > 0 ? Math.max((listing.views / maxViews) * 100, 2) : 2;
            return (
              <button key={listing.id} type="button" onClick={() => onEditListing(listing)}
                aria-label={`${t("adminMkt_editListingAriaLabel")} ${listing.name}`}
                style={{
                  background: "none", border: "none", padding: 0, cursor: "pointer",
                  fontFamily: "inherit", textAlign: "left", display: "block", width: "100%",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{
                    fontSize: 13, fontWeight: 500, color: "var(--text)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    maxWidth: "60%",
                  }}>
                    {listing.name}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-hint)", flexShrink: 0 }}>
                    {listing.views} / {listing.leads} {t("adminMkt_applicationsLabel")}
                  </span>
                </div>
                <div style={{
                  height: 8, borderRadius: 4, background: "var(--surface)", overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%",
                    width: `${pct}%`,
                    background: "var(--primary-gradient)",
                    borderRadius: 4,
                    transition: "width 0.6s ease",
                  }} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conversion funnel */}
      <div style={{
        background: "var(--surface-card)", borderRadius: 14, padding: 14,
        boxShadow: "var(--shadow-card)",
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 14 }}>
          {t("adminMkt_conversionFunnel")}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
          {[
            { label: t("adminMkt_impressions"), value: funnelImpressions, pct: 100, color: "rgba(42,171,238,0.15)", textColor: "var(--primary)" },
            { label: t("adminMkt_viewsLabel"), value: totalViews, pct: funnelViewPct, color: "rgba(42,171,238,0.25)", textColor: "var(--primary)" },
            { label: t("adminMkt_applicationsLabel"), value: totalLeads, pct: funnelLeadPct, color: "rgba(52,199,89,0.2)", textColor: "var(--green)" },
          ].map((step, i) => {
            const widthPct = Math.max(30, 100 - i * 25);
            return (
              <div key={i} style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{
                  width: `${widthPct}%`,
                  background: step.color,
                  borderRadius: i === 0 ? "10px 10px 0 0" : i === 2 ? "0 0 10px 10px" : 0,
                  padding: "10px 14px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  transition: "width 0.4s ease",
                }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: step.textColor }}>
                    {step.label}
                  </span>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
                      {step.value.toLocaleString("ru-RU")}
                    </span>
                    {i > 0 && (
                      <span style={{ fontSize: 11, color: "var(--text-hint)", marginLeft: 4 }}>
                        {step.pct}%
                      </span>
                    )}
                  </div>
                </div>
                {i < 2 && (
                  <svg width="12" height="10" viewBox="0 0 12 10" style={{ margin: "-1px 0", color: "var(--text-hint)" }}>
                    <polygon points="6,10 0,0 12,0" fill="currentColor" opacity="0.15" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Status breakdown */}
      <div style={{
        background: "var(--surface-card)", borderRadius: 14, padding: 14,
        boxShadow: "var(--shadow-card)",
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>
          {t("adminMkt_byStatus")}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["active", "paused", "draft"] as ListingStatus[]).map((s) => (
            <button key={s} type="button"
              onClick={() => onNavigateToListings(s)}
              aria-label={`${t("adminMkt_filterLabel")}: ${getStatusLabel(s, t)}`}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 9999, border: "none",
                background: STATUS_COLORS[s].bg, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: STATUS_COLORS[s].color,
              }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: STATUS_COLORS[s].color }}>
                {getStatusLabel(s, t)}: {statusBreakdown[s]}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── ProfileTab ────────────────────────────────────────────────── */

type ProfileTabProps = {
  profile: SellerProfile;
  profileName: string;
  profileAbout: string;
  profileLink: string;
  profileCity: string;
  logoUrl: string;
  bannerUrl: string;
  listingsCount: number;
  activeCount: number;
  onNameChange: (v: string) => void;
  onAboutChange: (v: string) => void;
  onLinkChange: (v: string) => void;
  onCityChange: (v: string) => void;
  onLogoUpload: (dataUrl: string) => void;
  onBannerUpload: (dataUrl: string) => void;
  onSave: () => void;
  showToast: (msg: string) => void;
  t: (key: TranslationKey) => string;
};

function ProfileTab({
  profile, profileName, profileAbout, profileLink, profileCity,
  logoUrl, bannerUrl, listingsCount, activeCount,
  onNameChange, onAboutChange, onLinkChange, onCityChange,
  onLogoUpload, onBannerUpload, onSave, showToast, t,
}: ProfileTabProps) {
  const logoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onLogoUpload(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleBannerFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onBannerUpload(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "0 0 40px", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Banner upload area */}
      <input ref={bannerRef} type="file" accept="image/*" onChange={handleBannerFile}
        style={{ display: "none" }} aria-hidden="true" />
      <div
        onClick={() => bannerRef.current?.click()}
        role="button" tabIndex={0} aria-label={t("adminMkt_uploadBannerLabel")}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") bannerRef.current?.click(); }}
        style={{
          width: "100%", height: 120, cursor: "pointer", position: "relative",
          overflow: "hidden",
          background: bannerUrl ? "transparent" : "linear-gradient(135deg, #1a8fd1 0%, #2AABEE 50%, #42c5ff 100%)",
        }}
      >
        {bannerUrl && (
          <img src={bannerUrl} alt={t("adminMkt_bannerAlt")} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        )}
        <div style={{
          position: "absolute", bottom: 8, right: 12,
          background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)",
          color: "#fff", fontSize: 11, fontWeight: 500,
          padding: "3px 10px", borderRadius: 9999,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          {t("adminMkt_changeBannerBtn")}
        </div>
      </div>

      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Avatar (centered, overlapping banner) */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: -40 }}>
          <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoFile}
            style={{ display: "none" }} aria-hidden="true" />
          <div
            onClick={() => logoRef.current?.click()}
            role="button" tabIndex={0} aria-label={t("adminMkt_uploadAvatarLabel")}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") logoRef.current?.click(); }}
            style={{
              width: 80, height: 80, borderRadius: 22, cursor: "pointer",
              overflow: "hidden", position: "relative", flexShrink: 0,
              background: logoUrl ? "transparent" : "var(--primary-gradient)",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "3px solid var(--bg)",
              boxShadow: "0 4px 16px rgba(42,171,238,0.3)",
            }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt={t("adminMkt_avatarAlt")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 32, fontWeight: 700, color: "#fff" }}>
                {(profileName || "C").charAt(0).toUpperCase()}
              </span>
            )}
            {/* Camera overlay */}
            <div style={{
              position: "absolute", inset: 0,
              background: "rgba(0,0,0,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: 0, transition: "opacity 0.15s",
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = "1"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = "0"; }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
          </div>
        </div>

        {/* Form card */}
        <div style={{
          background: "var(--surface-card)", borderRadius: 16, padding: 16,
          boxShadow: "var(--shadow-card)",
        }}>
          {/* Company name */}
          <div style={{ marginBottom: 14 }}>
            <label style={LABEL_STYLE}>{t("adminMkt_profileName")}</label>
            <input value={profileName} onChange={(e) => onNameChange(e.target.value)}
              placeholder={t("adminMkt_companyNamePlaceholder")} style={INPUT_STYLE} />
          </div>

          {/* About */}
          <div style={{ marginBottom: 14 }}>
            <label style={LABEL_STYLE}>{t("adminMkt_profileDesc")}</label>
            <textarea value={profileAbout} onChange={(e) => onAboutChange(e.target.value)}
              rows={4} placeholder={t("adminMkt_aboutPlaceholder")}
              style={TEXTAREA_STYLE} />
          </div>

          {/* Telegram link */}
          <div style={{ marginBottom: 14 }}>
            <label style={LABEL_STYLE}>{t("adminMkt_telegramLink")}</label>
            <input value={profileLink} onChange={(e) => onLinkChange(e.target.value)}
              placeholder="@username" style={INPUT_STYLE} />
          </div>

          {/* City */}
          <div style={{ marginBottom: 20 }}>
            <label style={LABEL_STYLE}>{t("adminMkt_city")}</label>
            <input value={profileCity} onChange={(e) => onCityChange(e.target.value)}
              placeholder={t("adminMkt_cityPlaceholder")} style={INPUT_STYLE} />
          </div>

          <button type="button" onClick={onSave} aria-label={t("adminMkt_saveProfileLabel")}
            style={{
              width: "100%", height: 48, borderRadius: 14, border: "none",
              background: "var(--primary-gradient)", color: "#fff",
              fontSize: 16, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              boxShadow: "0 4px 16px rgba(42,171,238,0.35)",
            }}
          >
            {t("adminMkt_profileSave")}
          </button>
        </div>

        {/* Live preview card */}
        <div style={{
          background: "var(--surface-card)", borderRadius: 16, padding: 16,
          boxShadow: "var(--shadow-card)",
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 12 }}>
            {t("adminMkt_profilePreview")}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 12, borderBottom: "0.5px solid var(--divider)", marginBottom: 10 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0, overflow: "hidden",
              background: logoUrl ? "transparent" : "var(--primary-gradient)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {logoUrl ? (
                <img src={logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>
                  {(profileName || "C").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {profileName || t("adminMkt_yourCompany")}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                <Stars rating={profile.rating} size={11} />
                <span style={{ fontSize: 11, color: "var(--text-hint)" }}>{profile.rating.toFixed(1)} · {profile.reviewCount} {t("adminMkt_reviews")}</span>
              </div>
            </div>
          </div>

          {profileAbout && (
            <div style={{ fontSize: 13, color: "var(--text-hint)", lineHeight: 1.5, marginBottom: 10 }}>
              {profileAbout}
            </div>
          )}

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 500, background: "rgba(42,171,238,0.1)", color: "var(--primary)", padding: "3px 9px", borderRadius: 9999 }}>
              {listingsCount} {t("adminMkt_listingsCount")}
            </span>
            <span style={{ fontSize: 11, fontWeight: 500, background: "rgba(52,199,89,0.1)", color: "#34c759", padding: "3px 9px", borderRadius: 9999 }}>
              {activeCount} {t("adminMkt_activeListings")}
            </span>
            {profileCity && (
              <span style={{ fontSize: 11, fontWeight: 500, background: "rgba(142,142,147,0.1)", color: "var(--text-secondary)", padding: "3px 9px", borderRadius: 9999 }}>
                {profileCity}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────── */

export default function AdminMarketplacePage({ showToast }: AdminMarketplacePageProps) {
  const { t } = useLocale();

  /* ── State ── */
  const [tab, setTab] = useState<TabKey>("listings");
  const [listings, setListings] = useState<Listing[]>(DEMO_LISTINGS);
  const [editingListing, setEditingListing] = useState<Listing | null | "new">(null);
  const [profile, setProfile] = useState<SellerProfile>(DEMO_PROFILE);
  const [profileName, setProfileName] = useState(DEMO_PROFILE.companyName);
  const [profileAbout, setProfileAbout] = useState(DEMO_PROFILE.about);
  const [profileLink, setProfileLink] = useState(DEMO_PROFILE.telegramLink);
  const [profileCity, setProfileCity] = useState(DEMO_PROFILE.city);
  const [logoUrl, setLogoUrl] = useState(DEMO_PROFILE.logoUrl);
  const [bannerUrl, setBannerUrl] = useState(DEMO_PROFILE.bannerUrl);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ListingStatus | null>(null);
  const [detailListing, setDetailListing] = useState<Listing | null>(null);

  /* ── Derived ── */
  const filteredListings = useMemo(() => {
    if (!statusFilter) return listings;
    return listings.filter((l) => l.status === statusFilter);
  }, [listings, statusFilter]);

  const stats = useMemo(() => ({
    total: listings.length,
    views: listings.reduce((s, l) => s + l.views, 0),
    leads: listings.reduce((s, l) => s + l.leads, 0),
    rating: profile.rating,
  }), [listings, profile.rating]);

  const activeCount = useMemo(() => listings.filter((l) => l.status === "active").length, [listings]);

  /* ── Handlers ── */
  function saveListing(data: Omit<Listing, "id" | "views" | "leads">) {
    if (editingListing === "new") {
      const newL: Listing = { ...data, id: `l-${Date.now()}`, views: 0, leads: 0 };
      setListings((prev) => [newL, ...prev]);
    } else if (editingListing) {
      setListings((prev) => prev.map((l) => l.id === editingListing.id ? { ...l, ...data } : l));
    }
    showToast(t("adminMkt_saved"));
    setEditingListing(null);
  }

  function toggleStatus(id: string) {
    setListings((prev) => prev.map((l) => {
      if (l.id !== id) return l;
      const next = l.status === "active" ? "paused" : "active";
      showToast(next === "paused" ? t("adminMkt_paused") : t("adminMkt_activated"));
      return { ...l, status: next };
    }));
    setMenuOpenId(null);
  }

  function deleteListing(id: string) {
    if (!window.confirm(t("adminMkt_deleteConfirm"))) return;
    setListings((prev) => prev.filter((l) => l.id !== id));
    showToast(t("adminMkt_deleted"));
    setMenuOpenId(null);
  }

  function promoteListing(id: string) {
    void id;
    showToast(t("adminMkt_promoted"));
    setMenuOpenId(null);
  }

  function handleCoverUpload(id: string, dataUrl: string) {
    setListings((prev) => prev.map((l) => l.id === id ? { ...l, coverUrl: dataUrl } : l));
  }

  function saveProfile() {
    setProfile((p) => ({
      ...p,
      companyName: profileName.trim() || p.companyName,
      about: profileAbout.trim(),
      telegramLink: profileLink.trim(),
      city: profileCity.trim(),
      logoUrl,
      bannerUrl,
    }));
    showToast(t("adminMkt_profileSaved"));
  }

  function navigateToListings(filter?: ListingStatus) {
    setStatusFilter(filter ?? null);
    setTab("listings");
  }

  /* ── Form overlay ── */
  if (editingListing !== null) {
    return (
      <ListingForm
        initial={editingListing === "new" ? null : editingListing}
        onSave={saveListing}
        onClose={() => setEditingListing(null)}
        showToast={showToast}
      />
    );
  }

  /* ── Tab data ── */
  const TABS: { key: TabKey; label: string }[] = [
    { key: "listings", label: t("adminMkt_tabListings") },
    { key: "analytics", label: t("adminMkt_analyticsTab") },
    { key: "profile", label: t("adminMkt_tabProfile") },
  ];

  return (
    <div
      style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--surface)", position: "relative" }}
      onClick={() => { if (menuOpenId) setMenuOpenId(null); }}
    >
      {/* ── Header area ── */}
      <div style={{ background: "var(--bg)", padding: "16px 16px 0" }}>
        {/* Avatar + name + stats row */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, flexShrink: 0, overflow: "hidden",
            background: logoUrl ? "transparent" : "var(--primary-gradient)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(42,171,238,0.3)",
          }}>
            {logoUrl ? (
              <img src={logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {profile.companyName}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
              <Stars rating={profile.rating} />
              <span style={{ fontSize: 12, color: "var(--text-hint)" }}>{profile.rating.toFixed(1)} · {profile.reviewCount} {t("adminMkt_reviews")}</span>
            </div>
          </div>
        </div>

        {/* Quick stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, background: "var(--surface)", borderRadius: 14, padding: "10px 0", marginBottom: 14 }}>
          {[
            { label: t("adminMkt_totalListings"), value: stats.total },
            { label: t("adminMkt_totalViews"), value: stats.views.toLocaleString("ru-RU") },
            { label: t("adminMkt_totalLeads"), value: stats.leads },
            { label: t("adminMkt_avgRating"), value: stats.rating.toFixed(1) },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center", borderRight: i < 3 ? "0.5px solid var(--divider)" : "none" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", lineHeight: 1.2 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "var(--text-hint)", marginTop: 2, lineHeight: 1.3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tab bar (underline style) */}
        <div style={{ display: "flex", gap: 0 }}>
          {TABS.map((tabItem) => (
            <button key={tabItem.key} type="button"
              onClick={() => { setTab(tabItem.key); if (tabItem.key === "listings") setStatusFilter(null); }}
              aria-label={tabItem.label}
              style={{
                flex: 1, height: 40, border: "none", background: "transparent",
                cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                color: tab === tabItem.key ? "var(--primary)" : "var(--text-hint)",
                borderBottom: tab === tabItem.key ? "2px solid var(--primary)" : "2px solid transparent",
                transition: "color 0.15s, border-color 0.15s",
              }}
            >
              {tabItem.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab: Listings (Ozon-style 2-column grid) ── */}
      {tab === "listings" && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* Status filter pills (if filter active) */}
          {statusFilter && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 10px 0" }}>
              <span style={{ fontSize: 13, color: "var(--text-hint)" }}>{t("adminMkt_filterLabel")}:</span>
              <span style={{
                ...CHIP_BASE,
                background: STATUS_COLORS[statusFilter].bg,
                color: STATUS_COLORS[statusFilter].color,
                fontWeight: 600,
              }}>
                {getStatusLabel(statusFilter, t)}
              </span>
              <button type="button" onClick={() => setStatusFilter(null)} aria-label={t("adminMkt_clearFilterLabel")}
                style={{
                  width: 24, height: 24, borderRadius: "50%", border: "none",
                  background: "var(--surface)", cursor: "pointer", display: "flex",
                  alignItems: "center", justifyContent: "center",
                  color: "var(--text-hint)", fontSize: 14,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}

          {filteredListings.length === 0 ? (
            /* ── Empty state ── */
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "60px 24px",
              textAlign: "center",
              gap: 14,
            }}>
              <div style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "var(--surface-card)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-hint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 01-8 0" />
                </svg>
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>
                {t("adminMkt_noListings")}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-hint)", lineHeight: 1.5 }}>
                {t("adminMkt_addFirst")}
              </div>
              <button type="button" onClick={() => setEditingListing("new")} aria-label={t("adminMkt_addListingLabel")}
                style={{
                  marginTop: 8, height: 46, padding: "0 24px", borderRadius: 14,
                  border: "none", background: "var(--primary-gradient)", color: "#fff",
                  fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  boxShadow: "0 4px 16px rgba(42,171,238,0.35)",
                }}
              >
                {t("adminMkt_addListing")}
              </button>
            </div>
          ) : (
            /* ── 2-column Ozon-style product grid ── */
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              padding: "10px 10px 88px",
            }}>
              {filteredListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  profile={profile}
                  menuOpenId={menuOpenId}
                  onMenuToggle={setMenuOpenId}
                  onEdit={setEditingListing}
                  onToggleStatus={toggleStatus}
                  onDelete={deleteListing}
                  onPromote={promoteListing}
                  onCoverUpload={handleCoverUpload}
                  onOpenDetail={setDetailListing}
                  showToast={showToast}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Analytics ── */}
      {tab === "analytics" && (
        <AnalyticsTab
          listings={listings}
          profile={profile}
          onNavigateToListings={navigateToListings}
          onEditListing={setEditingListing}
        />
      )}

      {/* ── Tab: Profile ── */}
      {tab === "profile" && (
        <ProfileTab
          profile={profile}
          profileName={profileName}
          profileAbout={profileAbout}
          profileLink={profileLink}
          profileCity={profileCity}
          logoUrl={logoUrl}
          bannerUrl={bannerUrl}
          listingsCount={stats.total}
          activeCount={activeCount}
          onNameChange={setProfileName}
          onAboutChange={setProfileAbout}
          onLinkChange={setProfileLink}
          onCityChange={setProfileCity}
          onLogoUpload={setLogoUrl}
          onBannerUpload={setBannerUrl}
          onSave={saveProfile}
          showToast={showToast}
          t={t}
        />
      )}

      {/* ── FAB: Add listing ── */}
      {tab === "listings" && (
        <button type="button" onClick={() => setEditingListing("new")}
          className="fab"
          aria-label={t("adminMkt_addListing")}
          style={{
            position: "fixed", bottom: 80, right: 20,
            width: 52, height: 52, borderRadius: "50%",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--primary-gradient)",
            boxShadow: "0 6px 24px rgba(42,171,238,0.4), 0 2px 8px rgba(0,0,0,0.12)",
            zIndex: 20, transition: "transform 0.15s, box-shadow 0.15s",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      )}

      {/* ── Bottom sheet: Listing detail ── */}
      {detailListing && (
        <ListingDetailSheet
          listing={detailListing}
          profile={profile}
          onClose={() => setDetailListing(null)}
          onEdit={setEditingListing}
          onToggleStatus={toggleStatus}
          onDelete={deleteListing}
          onPromote={promoteListing}
          t={t}
        />
      )}
    </div>
  );
}
