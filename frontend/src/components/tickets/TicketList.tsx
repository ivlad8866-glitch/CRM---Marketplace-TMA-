import type { Ticket, TicketStatus } from "../../types";
import TicketCard from "./TicketCard";

type TicketListProps = {
  tickets: Ticket[];
  activeTicketId: string;
  ticketQuery: string;
  ticketFilter: TicketStatus | "all" | "overdue";
  ticketSort: "sla" | "status";
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
  onQueryChange,
  onFilterChange,
  onSortChange,
  onOpenChat,
}: TicketListProps) {
  return (
    <div className="screen" key="admin-tickets">
      <div className="screen__header">
        <h2>Тикеты</h2>
        <p>Очередь обращений</p>
      </div>

      {/* Search */}
      <div className="search-bar">
        <input
          placeholder="Поиск по номеру, клиенту, заголовку"
          value={ticketQuery}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="filter-chips">
        {(
          [
            ["all", "Все"],
            ["new", "Новые"],
            ["waiting_customer", "Ожидание"],
            ["overdue", "Просрочены"],
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
          По SLA
        </button>
        <button
          className={`chip chip--sm ${ticketSort === "status" ? "chip--active" : ""}`}
          type="button"
          onClick={() => onSortChange("status")}
        >
          По статусу
        </button>
      </div>

      {/* Ticket list */}
      <div className="ticket-list">
        {tickets.length === 0 && (
          <div className="empty-state">Ничего не найдено</div>
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
