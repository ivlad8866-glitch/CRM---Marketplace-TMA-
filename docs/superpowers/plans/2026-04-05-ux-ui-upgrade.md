# UX/UI Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the CRM Mini App UI with a scrollable 6-tab nav bar, polished Dashboard, Stats, and Profile screens — Telegram-native dark theme, smooth animations, skeleton states.

**Architecture:** Pure CSS + React changes; no new dependencies. All animation via CSS keyframes already defined in `styles.css`. Nav bar switches from `flex: 1` to fixed-width scrollable container. Dashboard, Stats, Profile get visual polish inline without extracting new files (files are manageable size: 482, 350, 160 lines).

**Tech Stack:** React 18, TypeScript, Vite, custom CSS (styles.css), Telegram WebApp API for haptic feedback.

---

## Task 1: Scrollable 6-tab nav bar (admin)

**Files:**
- Modify: `frontend/src/components/layout/BottomNav.tsx`
- Modify: `frontend/styles.css` (`.tab-bar`, `.tab-bar__btn` rules ~line 2691)

- [ ] **Step 1: Add Marketplace back to adminTabs in BottomNav.tsx**

In `frontend/src/components/layout/BottomNav.tsx`, replace the `adminTabs` array (currently 5 items, missing marketplace):

```tsx
const adminTabs: [AdminTab, string, React.FC][] = [
  ["dashboard", t("nav_home"), IconHome],
  ["chats", t("nav_chats"), IconChats],
  ["tickets", t("nav_tickets"), IconTicket],
  ["stats", t("nav_stats"), IconStats],
  ["marketplace", t("nav_marketplace"), IconMarketplace],
  ["more", t("nav_settings"), IconSettings],
];
```

- [ ] **Step 2: Make the nav bar scrollable in styles.css**

Find `.tab-bar` (~line 2691) and add `overflow-x: auto; overflow-y: hidden; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch;`:

```css
.tab-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  background: var(--surface);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding-bottom: var(--safe-bottom);
  height: calc(var(--tab-bar-height) + var(--safe-bottom));
  border-top: 0.5px solid var(--divider);
}

.tab-bar::-webkit-scrollbar {
  display: none;
}
```

- [ ] **Step 3: Fix tab-bar buttons to fixed width instead of flex: 1**

Find `.tab-bar__btn` (~line 2710) and replace `flex: 1` with `flex: 0 0 72px; scroll-snap-align: start;`:

```css
.tab-bar__btn {
  flex: 0 0 72px;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 8px 0 4px;
  background: transparent;
  border: none;
  color: var(--text-hint);
  cursor: pointer;
  font-family: inherit;
  transition: color 0.15s ease;
  position: relative;
  -webkit-tap-highlight-color: transparent;
  min-width: 0;
}
```

- [ ] **Step 4: Auto-scroll active tab into view**

In `frontend/src/components/layout/BottomNav.tsx`, add a `useEffect` that scrolls the active button into view when the tab changes. Add `useEffect, useRef` to the import and a `navRef` on the `<nav>`:

```tsx
import { useEffect, useRef } from "react";
// ... existing imports

export default function BottomNav({ role, clientTab, adminTab, adminMoreScreen, unreadCount = 0, onClientTabChange, onAdminTabChange }: BottomNavProps) {
  const { t } = useLocale();
  const navRef = useRef<HTMLElement>(null);

  const activeTab = role === "client" ? clientTab : adminTab;

  useEffect(() => {
    if (!navRef.current) return;
    const active = navRef.current.querySelector(".tab-bar__btn--active") as HTMLElement | null;
    if (active) {
      active.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeTab]);

  // ... rest of component, add ref={navRef} to <nav>
```

Then add `ref={navRef}` to the `<nav className="tab-bar" role="tablist">` element.

- [ ] **Step 5: Verify in browser**

Open http://localhost:5173, switch to admin role. Nav bar should show all 6 tabs, scroll horizontally, active tab stays centered.

- [ ] **Step 6: Commit**

```bash
cd "c:/app crm chat"
git add frontend/src/components/layout/BottomNav.tsx frontend/styles.css
git commit -m "feat(nav): scrollable 6-tab admin nav bar with auto-scroll to active"
```

---

## Task 2: Dashboard — KPI cards polish

**Files:**
- Modify: `frontend/src/pages/admin/DashboardPage.tsx` (lines ~149-170, the `kpiCards` array and render)
- Modify: `frontend/styles.css` (`.kpi` rules ~line 1927)

- [ ] **Step 1: Add icon to each KPI card config**

In `DashboardPage.tsx`, update `kpiCards` to include an `icon` field (SVG string rendered via dangerouslySetInnerHTML is messy — use a component reference instead). Add icon JSX inline in the card config array (~line 149):

```tsx
const kpiCards = [
  {
    value: activeCount,
    label: t("dashboard_activeTickets"),
    onClick: onGoToChats,
    delta: 12,
    spark: [4, 6, 5, 8, activeCount],
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
  },
  {
    value: tickets.length,
    label: t("dashboard_totalRequests"),
    onClick: onGoToTickets,
    delta: -3,
    spark: [10, 14, 12, 18, tickets.length],
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
      </svg>
    ),
  },
  {
    value: "18.5 ч",
    label: t("dashboard_hoursThisMonth"),
    onClick: onGoToStats,
    delta: 8,
    spark: [14, 16, 15, 18, 18],
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  {
    value: "₽ 4 750",
    label: t("dashboard_avgCheck"),
    onClick: onGoToStats,
    delta: 5,
    spark: [4000, 4200, 4100, 4500, 4750].map((v) => v / 1000),
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
      </svg>
    ),
  },
];
```

- [ ] **Step 2: Update the KPI card render to show icon + animate on mount**

Find the section where `kpiCards.map(...)` renders (search for `kpiCards.map` in DashboardPage.tsx, ~line 280). Replace the existing map with:

```tsx
<div className="kpi-grid cascade-item" style={{ animationDelay: "80ms" }}>
  {kpiCards.map((card, i) => (
    <KpiCard
      key={card.label}
      value={card.value}
      label={card.label}
      delta={card.delta}
      spark={card.spark}
      icon={card.icon}
      style={{ animationDelay: `${80 + i * 40}ms` }}
      onClick={card.onClick}
    />
  ))}
</div>
```

- [ ] **Step 3: Update KpiCard component to accept and render icon**

In `frontend/src/components/ui/KpiCard.tsx`, add `icon?: React.ReactNode` to props and render it:

```tsx
import type { ReactNode, CSSProperties } from "react";

type KpiCardProps = {
  value: string | number;
  label: string;
  delta?: number;
  spark?: number[];
  icon?: ReactNode;
  style?: CSSProperties;
  onClick?: () => void;
};

export default function KpiCard({ value, label, delta, spark, icon, style, onClick }: KpiCardProps) {
  // ... existing Delta and Sparkline helpers stay

  return (
    <button
      type="button"
      className="kpi cascade-item"
      style={style}
      onClick={onClick}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-hint)", fontSize: 12 }}>
          {icon && <span style={{ opacity: 0.7 }}>{icon}</span>}
          {label}
        </span>
        {delta !== undefined && <Delta value={delta} />}
      </div>
      <strong>{value}</strong>
      {spark && <Sparkline values={spark} />}
    </button>
  );
}
```

- [ ] **Step 4: Style KPI cards as tappable buttons**

In `styles.css`, find `.kpi` (~line 1927) and add button reset + hover/active state:

```css
.kpi {
  padding: var(--pad-card);
  border-radius: var(--radius-lg);
  background: var(--surface-card);
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 80px;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 0.5px 0 rgba(0,0,0,0.04);
  border: none;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: transform 0.15s ease, background 0.15s ease;
  -webkit-tap-highlight-color: transparent;
  width: 100%;
}

.kpi:active {
  transform: scale(0.97);
  background: var(--surface-hover);
}
```

- [ ] **Step 5: Verify KPI cards show icons, tap animates, delta is visible**

Open http://localhost:5173 → Admin → Dashboard. Four KPI cards should each have a small icon next to the label, show delta arrows, and scale down on tap.

- [ ] **Step 6: Commit**

```bash
cd "c:/app crm chat"
git add frontend/src/pages/admin/DashboardPage.tsx frontend/src/components/ui/KpiCard.tsx frontend/styles.css
git commit -m "feat(dashboard): KPI cards with icons, tap animation, cascade entrance"
```

---

## Task 3: Dashboard — chart gradient fill + SLA color bar on tickets

**Files:**
- Modify: `frontend/src/pages/admin/DashboardPage.tsx`
- Modify: `frontend/styles.css`

- [ ] **Step 1: Add gradient fill under chart bars**

In `DashboardPage.tsx`, find the chart bars render (the `CHART_DATA.map(...)` button block, ~line 230). Add a gradient overlay div below the bars row:

```tsx
{/* Gradient fill under bars */}
<div style={{
  position: "absolute",
  left: 16,
  right: 16,
  bottom: 48, // above month labels
  height: 48,
  background: "linear-gradient(to top, rgba(42,171,238,0.12), transparent)",
  borderRadius: 4,
  pointerEvents: "none",
}} />
```

Place this div inside the chart card div, just after the bars `<div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 48 }}>...</div>`.

- [ ] **Step 2: Add SLA color bar to urgent ticket list**

Find where urgent tickets are rendered (~line 329, the tickets.slice loop). For each ticket row, add a 3px colored left border based on `slaMinutes`:

```tsx
{tickets
  .filter((tk) => tk.status === "new" || tk.status === "in_progress")
  .slice(0, 5)
  .map((ticket) => {
    const slaColor = ticket.slaMinutes <= 5
      ? "#ff3b30"
      : ticket.slaMinutes <= 15
      ? "#ff9f0a"
      : "#34c759";
    return (
      <button
        key={ticket.id}
        type="button"
        className="ticket-row cascade-item"
        style={{ borderLeft: `3px solid ${slaColor}`, paddingLeft: 10 }}
        onClick={() => onOpenAdminChat(ticket.id)}
      >
        <span className="ticket-row__title">{ticket.title || ticket.id}</span>
        <span className="ticket-row__meta">{ticket.lastMessage || "—"}</span>
        <span className="pill pill--sm" style={{ color: slaColor, background: `${slaColor}18` }}>
          {ticket.slaMinutes} {t("common_min")}
        </span>
      </button>
    );
  })}
```

- [ ] **Step 3: Add ripple effect to quick action buttons**

Find the quick actions render (~line 260). Add `position: "relative", overflow: "hidden"` to each action button style and add a CSS class `quick-action` with the ripple pseudo-element in styles.css:

```css
.quick-action {
  position: relative;
  overflow: hidden;
}

.quick-action::after {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--primary);
  opacity: 0;
  border-radius: inherit;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.quick-action:active::after {
  opacity: 0.12;
  transition: opacity 0s;
}
```

In the JSX, add `className="quick-action"` to each action button.

- [ ] **Step 4: Verify gradient, SLA bars, and ripple**

Open Dashboard. Chart card should have a subtle blue gradient fill under the bars. Ticket list items should have colored left borders. Quick action buttons should flash on tap.

- [ ] **Step 5: Commit**

```bash
cd "c:/app crm chat"
git add frontend/src/pages/admin/DashboardPage.tsx frontend/styles.css
git commit -m "feat(dashboard): chart gradient fill, SLA color bars, quick action ripple"
```

---

## Task 4: Stats page — animated bar charts + period slide transition

**Files:**
- Modify: `frontend/src/pages/shared/StatsPage.tsx`
- Modify: `frontend/styles.css`

- [ ] **Step 1: Add CSS keyframe for bar grow animation**

In `styles.css`, add after the existing `@keyframes` blocks:

```css
@keyframes bar-grow {
  from { transform: scaleY(0); opacity: 0; }
  to   { transform: scaleY(1); opacity: 1; }
}

.bar-grow {
  transform-origin: bottom;
  animation: bar-grow 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
```

- [ ] **Step 2: Replace sparkline KPI cards in Stats with animated bar columns**

In `StatsPage.tsx`, find the `Sparkline` component (~line 54). Replace it with an `AnimatedBar` component:

```tsx
function AnimatedBar({ values, color = "var(--primary)", delay = 0 }: { values: number[]; color?: string; delay?: number }) {
  const max = Math.max(...values, 1);
  return (
    <span style={{ display: "inline-flex", alignItems: "flex-end", gap: 3, height: 24, flexShrink: 0 }}>
      {values.map((v, i) => (
        <span
          key={i}
          className="bar-grow"
          style={{
            width: 6,
            height: `${Math.max(3, Math.round((v / max) * 24))}px`,
            borderRadius: 3,
            background: color,
            opacity: i === values.length - 1 ? 1 : 0.3,
            display: "block",
            animationDelay: `${delay + i * 40}ms`,
          }}
        />
      ))}
    </span>
  );
}
```

Then replace all `<Sparkline` usages in StatsPage with `<AnimatedBar`.

- [ ] **Step 3: Add slide transition to period pills**

In `StatsPage.tsx`, find where `PERIODS` are rendered (the period pill buttons). Wrap them in a container with `position: relative` and add a sliding underline indicator:

```tsx
<div style={{ display: "flex", gap: 8, position: "relative", padding: "8px 16px" }}>
  {PERIODS.map((p) => (
    <button
      key={p.key}
      type="button"
      className={`chip ${period === p.key ? "chip--active" : ""}`}
      style={{ transition: "all 0.2s cubic-bezier(0.2, 0, 0, 1)" }}
      onClick={() => setPeriod(p.key)}
    >
      {p.label}
    </button>
  ))}
</div>
```

The existing `chip--active` CSS already handles the highlight — ensure `transition: all 0.2s` is on `.chip` in styles.css (it already exists at ~line 517).

- [ ] **Step 4: Add slide-up panel for drill-down instead of inline expand**

In `StatsPage.tsx`, find where `drillDown !== null` renders the ticket list (~line 270). Wrap it in a bottom sheet overlay:

```tsx
{drillDown !== null && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 50,
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-end",
    }}
    onClick={() => setDrillDown(null)}
  >
    <div
      style={{
        background: "var(--surface)",
        borderRadius: "20px 20px 0 0",
        padding: "16px 16px 32px",
        maxHeight: "70vh",
        overflowY: "auto",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.3)",
        animation: "sheet-up 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) both",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--divider)", margin: "0 auto 16px" }} />
      {/* existing drill-down content */}
    </div>
  </div>
)}
```

Add the `sheet-up` keyframe to `styles.css`:

```css
@keyframes sheet-up {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
```

- [ ] **Step 5: Verify Stats page**

Open Stats tab. KPI sparklines should animate bar-by-bar on appearance. Tapping a KPI card should slide up a panel from the bottom. Period pills should highlight with smooth transition.

- [ ] **Step 6: Commit**

```bash
cd "c:/app crm chat"
git add frontend/src/pages/shared/StatsPage.tsx frontend/styles.css
git commit -m "feat(stats): animated bar charts, slide-up drill-down panel, period transitions"
```

---

## Task 5: Profile page — timeline history + animated stars

**Files:**
- Modify: `frontend/src/pages/client/ProfilePage.tsx`
- Modify: `frontend/styles.css`

- [ ] **Step 1: Add timeline CSS for ticket history**

In `styles.css`, add after the profile section:

```css
.timeline {
  position: relative;
  padding: 0 16px;
}

.timeline::before {
  content: "";
  position: absolute;
  left: 28px;
  top: 8px;
  bottom: 8px;
  width: 1.5px;
  background: var(--divider);
}

.timeline-item {
  display: flex;
  gap: 12px;
  padding: 10px 0;
  position: relative;
}

.timeline-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 5px;
  border: 2px solid var(--bg);
  box-shadow: 0 0 0 1.5px currentColor;
}

.timeline-content {
  flex: 1;
  min-width: 0;
}

.timeline-content strong {
  font-size: 14px;
  font-weight: 600;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.timeline-content span {
  font-size: 12px;
  color: var(--text-hint);
  display: block;
  margin-top: 2px;
}
```

- [ ] **Step 2: Replace ticket history list with timeline style**

In `ProfilePage.tsx`, find where `filteredHistory.map(...)` renders tickets (~line 100+). Replace with:

```tsx
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
```

Add `STATUS_COLOR` constant at top of `ProfilePage.tsx`:

```tsx
const STATUS_COLOR: Record<string, string> = {
  new: "#ff3b30", in_progress: "#2AABEE", waiting_customer: "#ff9f0a",
  resolved: "#34c759", closed: "#8e8e93", spam: "#8e8e93", duplicate: "#8e8e93",
};
```

- [ ] **Step 3: Add animated star rating on mount**

In `ProfilePage.tsx`, find the star rating section. Add a CSS animation so stars scale in on appearance. Add this to `styles.css`:

```css
@keyframes star-pop {
  0%   { transform: scale(0); opacity: 0; }
  70%  { transform: scale(1.3); }
  100% { transform: scale(1); opacity: 1; }
}

.star-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  font-size: 28px;
  line-height: 1;
  transition: transform 0.15s ease;
  -webkit-tap-highlight-color: transparent;
  animation: star-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.star-btn:active {
  transform: scale(0.85);
}
```

In `ProfilePage.tsx`, find the star buttons render and add `className="star-btn"` with `animationDelay`:

```tsx
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
```

- [ ] **Step 4: Add pill-tabs with animated underline to history filter**

In `ProfilePage.tsx`, find the `HISTORY_FILTERS` render (the filter buttons). Replace with pill-tab style:

```tsx
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
```

- [ ] **Step 5: Verify Profile page**

Open Profile tab (client role). Ticket history should appear as a vertical timeline with colored dots. Star rating should animate in one by one. Filter tabs should have a sliding underline.

- [ ] **Step 6: Commit**

```bash
cd "c:/app crm chat"
git add frontend/src/pages/client/ProfilePage.tsx frontend/styles.css
git commit -m "feat(profile): timeline ticket history, animated star rating, pill-tab filters"
```

---

## Task 6: Global — page transition animation + haptic feedback

**Files:**
- Modify: `frontend/styles.css`
- Modify: `frontend/App.tsx`
- Modify: `frontend/src/components/layout/BottomNav.tsx`

- [ ] **Step 1: Add page fade+slide-up transition CSS**

In `styles.css`, find the existing `.screen` rule and add/update the entrance animation. Add a new keyframe:

```css
@keyframes page-enter {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.screen {
  animation: page-enter 0.22s cubic-bezier(0.2, 0, 0, 1) both;
}
```

Search for existing `.screen` definition (~line 386) and add the animation property there. If a `.cascade-item` animation already exists, ensure `.screen` has its own entrance that doesn't conflict.

- [ ] **Step 2: Add Telegram haptic feedback on tab change**

In `frontend/src/components/layout/BottomNav.tsx`, wrap the tab-change handlers to fire haptic before calling the prop:

```tsx
function haptic() {
  window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light");
}

// In the button onClick:
onClick={() => {
  haptic();
  if (role === "client") onClientTabChange(tab as ClientTab);
  else onAdminTabChange(tab as AdminTab);
}}
```

Replace the existing `onClick` in the tabs map with this pattern.

- [ ] **Step 3: Add haptic feedback on KPI card tap in DashboardPage**

In `DashboardPage.tsx`, add haptic to `KpiCard` clicks. Find the `kpiCards.map` render and wrap each `onClick`:

```tsx
onClick={() => {
  window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light");
  card.onClick?.();
}}
```

- [ ] **Step 4: Verify transitions and haptics**

Open app on a device / Telegram (haptics only work in real Telegram WebApp). On simulator, just verify that switching tabs produces a smooth fade+slide-up of the new screen. No jarring cuts.

- [ ] **Step 5: Final commit**

```bash
cd "c:/app crm chat"
git add frontend/styles.css frontend/App.tsx frontend/src/components/layout/BottomNav.tsx frontend/src/pages/admin/DashboardPage.tsx
git commit -m "feat(ux): page fade-slide transitions, Telegram haptic feedback on nav and KPI taps"
```

---

## Task 7: Push all changes to GitHub

- [ ] **Step 1: Verify everything builds**

```bash
cd "c:/app crm chat/frontend"
pnpm build 2>&1 | tail -20
```

Expected: `✓ built in X.XXs` with no errors.

- [ ] **Step 2: Push to origin**

```bash
cd "c:/app crm chat"
git push origin master
```

Expected: `master -> master` with no errors.
