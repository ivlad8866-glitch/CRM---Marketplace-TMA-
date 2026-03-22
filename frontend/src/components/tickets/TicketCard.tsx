import type { Ticket } from "../../types";
import { statusLabels } from "../../data/demo-data";

type TicketCardProps = {
  ticket: Ticket;
  isActive?: boolean;
  showPreview?: boolean;
  showSla?: boolean;
  onClick: () => void;
};

export default function TicketCard({
  ticket,
  isActive,
  showPreview,
  showSla,
  onClick,
}: TicketCardProps) {
  return (
    <button
      className={`ticket-item ${isActive ? "ticket-item--active" : ""}`}
      type="button"
      onClick={onClick}
    >
      <div className="ticket-item__left">
        <strong>{ticket.title}</strong>
        <span>
          {ticket.id} -- {ticket.clientNumber}
        </span>
        {showPreview && (
          <span className="ticket-item__preview">
            {ticket.lastMessage}
          </span>
        )}
      </div>
      <div className="ticket-item__right">
        <span className={`badge badge--${ticket.status}`}>
          {statusLabels[ticket.status]}
        </span>
        {showSla && (
          <span className="pill pill--sm">{ticket.slaMinutes} мин</span>
        )}
        <small>{ticket.updatedAt}</small>
      </div>
    </button>
  );
}
