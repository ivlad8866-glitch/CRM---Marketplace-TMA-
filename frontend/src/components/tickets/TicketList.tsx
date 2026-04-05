import type { Ticket, TicketStatus } from "../../types";
import TicketCard from "./TicketCard";
import { ListSkeleton } from "../ui/Skeleton";
import { useLocale } from "../../lib/i18n";

type TicketListProps = {
  tickets: Ticket[];
  activeTicketId: string;
  ticketQuery: string;
  ticketFilter: TicketStatus | "all" | "overdue";
  ticketSort: "sla" | "status";
  loading?: boolean;
  onQueryChange: (q: string) => void;
  onFilterChange: (f: TicketStatus | "all" | "overdue") => void;
  onSortChange: (s: "sla" | "status") => void;
  onOpenChat: (ticketId: string) => void;
};

export default function TicketList({
  tickets,
  activeTicketId,
  ticketQuery,
  ticketFilter,
  ticketSort,
  loading,
  onQueryChange,
  onFilterChange,
  onSortChange,
  onOpenChat,
}: TicketListProps) {
  const { t } = useLocale();
  return (
    <div className="screen" key="admin-tickets">
      <div className="screen__header">
        <h2>{t("tickets_title")}</h2>
        <p>{t("tickets_queue")}</p>
      </div>

      {/* Search */}
      <div className="search-bar">
        <input
          placeholder={t("tickets_searchPlaceholder")}
          value={ticketQuery}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="filter-chips">
        {(
          [
            ["all", t("tickets_all")],
            ["new", t("tickets_new")],
            ["waiting_customer", t("tickets_waiting")],
            ["overdue", t("tickets_overdue")],
          ] as [TicketStatus | "all" | "overdue", string][]
        ).map(([value, label]) => (
          <button
            key={value}
            className={`chip ${ticketFilter === value ? "chip--active" : ""}`}
            type="button"
            onClick={() => onFilterChange(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="filter-chips">
        <button
          className={`chip chip--sm ${ticketSort === "sla" ? "chip--active" : ""}`}
          type="button"
          onClick={() => onSortChange("sla")}
        >
          {t("tickets_sortBySla")}
        </button>
        <button
          className={`chip chip--sm ${ticketSort === "status" ? "chip--active" : ""}`}
          type="button"
          onClick={() => onSortChange("status")}
        >
          {t("tickets_sortByStatus")}
        </button>
      </div>

      {/* Ticket list */}
      <div className="ticket-list">
        {tickets.length === 0 && loading && <ListSkeleton count={4} />}
        {tickets.length === 0 && !loading && (
          <div className="empty-state">{t("tickets_nothingFound")}</div>
        )}
        {tickets.map((ticket) => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            isActive={activeTicketId === ticket.id}
            showPreview
            showSla
            onClick={() => onOpenChat(ticket.id)}
          />
        ))}
      </div>
    </div>
  );
}
