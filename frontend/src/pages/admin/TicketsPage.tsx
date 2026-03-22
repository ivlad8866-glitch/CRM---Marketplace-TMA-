import type { Ticket, TicketStatus } from "../../types";
import TicketList from "../../components/tickets/TicketList";

type TicketsPageProps = {
  filteredTickets: Ticket[];
  activeTicketId: string;
  ticketQuery: string;
  ticketFilter: TicketStatus | "all" | "overdue";
  ticketSort: "sla" | "status";
  onQueryChange: (q: string) => void;
  onFilterChange: (f: TicketStatus | "all" | "overdue") => void;
  onSortChange: (s: "sla" | "status") => void;
  onOpenAdminChat: (ticketId: string) => void;
};

export default function TicketsPage(props: TicketsPageProps) {
  return (
    <TicketList
      tickets={props.filteredTickets}
      activeTicketId={props.activeTicketId}
      ticketQuery={props.ticketQuery}
      ticketFilter={props.ticketFilter}
      ticketSort={props.ticketSort}
      onQueryChange={props.onQueryChange}
      onFilterChange={props.onFilterChange}
      onSortChange={props.onSortChange}
      onOpenChat={props.onOpenAdminChat}
    />
  );
}
