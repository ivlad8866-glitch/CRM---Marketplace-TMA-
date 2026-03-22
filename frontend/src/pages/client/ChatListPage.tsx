import type { Ticket, Channel } from "../../types";
import { demoChannels } from "../../data/demo-data";

type ChatListPageProps = {
  tickets: Ticket[];
  chatListQuery: string;
  onQueryChange: (q: string) => void;
  onOpenChat: (ticketId: string, channelId: string, serviceName: string) => void;
};

export default function ChatListPage({
  tickets,
  chatListQuery,
  onQueryChange,
  onOpenChat,
}: ChatListPageProps) {
  const query = chatListQuery.trim().toLowerCase();
  const chatItems = tickets.map((ticket) => {
    const ch = demoChannels.find((c) =>
      c.services.some((s) => s.name === ticket.service)
    ) ?? demoChannels[0];
    return { ticket, channel: ch };
  }).filter((item) =>
    !query ||
    item.ticket.title.toLowerCase().includes(query) ||
    item.channel.name.toLowerCase().includes(query) ||
    item.ticket.lastMessage.toLowerCase().includes(query)
  );

  return (
    <div className="screen" key="client-chats">
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
        {chatItems.map(({ ticket, channel }) => (
          <button
            key={ticket.id}
            className="chat-list-item"
            type="button"
            onClick={() => onOpenChat(ticket.id, channel.id, ticket.title)}
          >
            <div
              className="channel-icon"
              style={{ background: channel.color }}
            >
              {channel.icon}
            </div>
            <div className="chat-list-item__body">
              <div className="chat-list-item__top">
                <span className="chat-list-item__name">{channel.name}</span>
                <span className="chat-list-item__time">{ticket.updatedAt}</span>
              </div>
              <div className="chat-list-item__bottom">
                <span className="chat-list-item__preview">
                  <strong>{ticket.service}: </strong>{ticket.lastMessage}
                </span>
                {ticket.status === "new" && (
                  <span className="chat-list-item__badge">1</span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
