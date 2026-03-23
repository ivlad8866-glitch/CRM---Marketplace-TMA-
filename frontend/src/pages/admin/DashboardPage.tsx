import type { Ticket } from "../../types";
import { statusLabels } from "../../data/demo-data";

type DashboardPageProps = {
  tickets: Ticket[];
  onOpenAdminChat: (ticketId: string) => void;
};

export default function DashboardPage({
  tickets,
  onOpenAdminChat,
}: DashboardPageProps) {
  return (
    <div className="screen" key="admin-dashboard">
      <div className="screen__header">
        <h2>Дашборд</h2>
      </div>
      <div className="kpi-grid">
        <div className="kpi">
          <span>Новые</span>
          <strong>12</strong>
          <small>+3 за час</small>
        </div>
        <div className="kpi">
          <span>В работе</span>
          <strong>7</strong>
          <small>2 просрочены</small>
        </div>
        <div className="kpi">
          <span>Ждем клиента</span>
          <strong>5</strong>
          <small>Среднее 18 мин</small>
        </div>
        <div className="kpi kpi--alert">
          <span>SLA</span>
          <strong>2</strong>
          <small>критические</small>
        </div>
      </div>
      <div className="section-block">
        <div className="section-block__header">
          <h3>Динамика обращений</h3>
          <span className="pill">за 7 дней</span>
        </div>
        <div className="graph">
          <div className="graph__bar" style={{ height: "45%" }} />
          <div className="graph__bar" style={{ height: "70%" }} />
          <div className="graph__bar" style={{ height: "60%" }} />
          <div className="graph__bar" style={{ height: "90%" }} />
          <div className="graph__bar" style={{ height: "55%" }} />
          <div className="graph__bar" style={{ height: "40%" }} />
          <div className="graph__bar" style={{ height: "65%" }} />
        </div>
        <div className="graph__labels">
          <span>Пн</span>
          <span>Вт</span>
          <span>Ср</span>
          <span>Чт</span>
          <span>Пт</span>
          <span>Сб</span>
          <span>Вс</span>
        </div>
      </div>

      {/* Recent tickets */}
      <div className="section-block">
        <h3>Последние тикеты</h3>
        <div className="ticket-list">
          {tickets.slice(0, 3).map((ticket) => (
            <button
              key={ticket.id}
              className="ticket-item"
              type="button"
              onClick={() => onOpenAdminChat(ticket.id)}
            >
              <div className="ticket-item__left">
                <strong>{ticket.title}</strong>
                <span>
                  {ticket.id} -- {ticket.clientNumber}
                </span>
              </div>
              <div className="ticket-item__right">
                <span className={`badge badge--${ticket.status}`}>
                  {statusLabels[ticket.status]}
                </span>
                <small>{ticket.updatedAt}</small>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
