import type { Ticket } from "../../types";
import { statusLabels, demoChannels } from "../../data/demo-data";

type AdminChatListPageProps = {
  tickets: Ticket[];
  chatListQuery: string;
  onQueryChange: (q: string) => void;
  onOpenChat: (ticketId: string, channelId: string, serviceName: string) => void;
};

export default function AdminChatListPage({
  tickets,
  chatListQuery,
  onQueryChange,
  onOpenChat,
}: AdminChatListPageProps) {
  const query = chatListQuery.trim().toLowerCase();
  const chatItems = tickets.filter((t) =>
    !query ||
    t.title.toLowerCase().includes(query) ||
    t.clientNumber.toLowerCase().includes(query) ||
    t.lastMessage.toLowerCase().includes(query)
  );

  return (
    <div className="screen" key="admin-chats">
      <div className="screen__header">
        <h2>Чаты</h2>
      </div>
      <div className="search-bar">
        <input
          placeholder="Поиск..."
          value={chatListQuery}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>
      <div className="chat-list">
        {chatItems.length === 0 && (
          <div className="empty-state">Нет активных чатов</div>
        )}
        {chatItems.map((ticket) => (
          <button
            key={ticket.id}
            className="chat-list-item"
            type="button"
            onClick={() => onOpenChat(ticket.id, demoChannels[0].id, ticket.title)}
          >
            <div className="avatar">{ticket.clientNumber.replace("C-", "").slice(0, 2)}</div>
            <div className="chat-list-item__body">
              <div className="chat-list-item__top">
                <span className="chat-list-item__name">{ticket.clientNumber}</span>
                <span className="chat-list-item__time">{ticket.updatedAt}</span>
              </div>
              <div className="chat-list-item__bottom">
                <span className="chat-list-item__preview">
                  <strong>{ticket.title}: </strong>{ticket.lastMessage}
                </span>
                <span className={`badge badge--${ticket.status}`} style={{ flexShrink: 0, fontSize: 11 }}>
                  {statusLabels[ticket.status]}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
