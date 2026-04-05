import { useState, useRef, useEffect } from "react";
import type { Ticket, Folder } from "../../types";
import { demoChannels } from "../../data/demo-data";
import { useLocale } from "../../lib/i18n";

type AdminChatListPageProps = {
  tickets: Ticket[];
  folders: Folder[];
  chatListQuery: string;
  onQueryChange: (q: string) => void;
  onOpenChat: (ticketId: string, channelId: string, serviceName: string) => void;
  onMoveToFolder: (ticketId: string, folderId: string | null) => void;
};

const AVATAR_COLORS = ["#2AABEE", "#FF9500", "#34c759", "#9b59b6", "#e67e22", "#ff3b30"];
const STATUS_DOT: Record<string, string> = { new: "#ff3b30", in_progress: "#2AABEE", waiting_customer: "#ff9f0a", resolved: "#34c759", closed: "#8e8e93" };
type FilterKey = "all" | "new" | "in_progress" | "resolved";
function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return Math.abs(h); }

type MenuAnchor = { top: number; right: number };

export default function AdminChatListPage({ tickets, folders, chatListQuery, onQueryChange, onOpenChat, onMoveToFolder }: AdminChatListPageProps) {
  const { t } = useLocale();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [activeFolder, setActiveFolder] = useState<string | null>(null);

  // Folder picker dropdown state
  const [folderMenuTicketId, setFolderMenuTicketId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<MenuAnchor>({ top: 0, right: 0 });

  // Drag-and-drop state
  const [draggingTicketId, setDraggingTicketId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: "all", label: t("dashboard_all") },
    { key: "new", label: t("chatList_new") },
    { key: "in_progress", label: t("chatList_inProgress") },
    { key: "resolved", label: t("chatList_resolved") },
  ];
  const q = chatListQuery.trim().toLowerCase();

  const items = tickets.filter((t) => {
    if (activeFolder) {
      const folder = folders.find((f) => f.id === activeFolder);
      if (!folder?.ticketIds.includes(t.id)) return false;
    }
    if (filter !== "all" && t.status !== filter) return false;
    if (q && !t.title.toLowerCase().includes(q) && !t.clientNumber.toLowerCase().includes(q) && !t.lastMessage.toLowerCase().includes(q)) return false;
    return true;
  });

  // Close folder menu on outside click (handled by backdrop)
  const openFolderMenu = (ticketId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (folderMenuTicketId === ticketId) {
      setFolderMenuTicketId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuAnchor({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
    setFolderMenuTicketId(ticketId);
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, ticketId: string) => {
    setDraggingTicketId(ticketId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("ticketId", ticketId);
  };

  const handleDragEnd = () => {
    setDraggingTicketId(null);
    setDragOverFolderId(null);
  };

  const handleFolderDragOver = (e: React.DragEvent<HTMLButtonElement>, folderId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverFolderId(folderId);
  };

  const handleFolderDragLeave = () => {
    setDragOverFolderId(null);
  };

  const handleFolderDrop = (e: React.DragEvent<HTMLButtonElement>, folderId: string) => {
    e.preventDefault();
    const ticketId = e.dataTransfer.getData("ticketId");
    if (ticketId) {
      onMoveToFolder(ticketId, folderId);
    }
    setDraggingTicketId(null);
    setDragOverFolderId(null);
  };

  const handleRemoveFolderDrop = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const ticketId = e.dataTransfer.getData("ticketId");
    if (ticketId) onMoveToFolder(ticketId, null);
    setDraggingTicketId(null);
    setDragOverFolderId(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg)", position: "relative" }}>

      {/* Backdrop to close dropdown */}
      {folderMenuTicketId !== null && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 199 }}
          onClick={() => setFolderMenuTicketId(null)}
        />
      )}

      {/* Folder dropdown — rendered at root level, above everything */}
      {folderMenuTicketId !== null && (
        <div
          style={{
            position: "fixed",
            top: menuAnchor.top,
            right: menuAnchor.right,
            zIndex: 200,
            background: "var(--surface-card)",
            borderRadius: 12,
            boxShadow: "0 4px 24px rgba(0,0,0,0.22)",
            minWidth: 190,
            overflow: "hidden",
            border: "0.5px solid var(--divider)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ padding: "8px 14px 6px", fontSize: 12, color: "var(--text-hint)", fontWeight: 500 }}>
            {t("folder_moveToFolder")}
          </div>
          {/* Remove from all folders option */}
          {folders.some((f) => f.ticketIds.includes(folderMenuTicketId)) && (
            <button
              type="button"
              onClick={() => { onMoveToFolder(folderMenuTicketId, null); setFolderMenuTicketId(null); }}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px", background: "none", border: "none", borderTop: "0.5px solid var(--divider)", cursor: "pointer", fontSize: 14, color: "var(--destructive)", fontFamily: "inherit", textAlign: "left" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              {t("folder_removeFromFolders")}
            </button>
          )}
          {folders.map((folder, fi) => {
            const inFolder = folder.ticketIds.includes(folderMenuTicketId);
            return (
              <button
                key={folder.id}
                type="button"
                onClick={() => { onMoveToFolder(folderMenuTicketId, folder.id); setFolderMenuTicketId(null); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "10px 14px",
                  background: inFolder ? "var(--surface)" : "none",
                  border: "none",
                  borderTop: fi === 0 ? "0.5px solid var(--divider)" : "none",
                  cursor: "pointer", fontSize: 14,
                  color: "var(--text)", fontFamily: "inherit", textAlign: "left",
                  transition: "background 0.12s",
                }}
              >
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: folder.color, flexShrink: 0, display: "inline-block" }} />
                <span style={{ flex: 1 }}>{folder.name}</span>
                {inFolder && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Search */}
      <div style={{ padding: "8px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", height: 36, background: "var(--surface)", borderRadius: 10, padding: "0 10px", marginBottom: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-hint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginRight: 8 }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input placeholder={t("chatList_search")} value={chatListQuery} onChange={(e) => onQueryChange(e.target.value)} style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 15, color: "var(--text)", lineHeight: "36px", fontFamily: "inherit" }} />
        </div>
      </div>

      {/* Status filter pills */}
      <div style={{ display: "flex", gap: 8, padding: "0 16px", marginBottom: 8, overflowX: "auto", flexShrink: 0 }}>
        {FILTERS.map((f) => (
          <button key={f.key} type="button" onClick={() => setFilter(f.key)} style={{ padding: "6px 14px", borderRadius: 9999, fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, fontFamily: "inherit", background: filter === f.key ? "var(--primary)" : "var(--surface)", color: filter === f.key ? "#fff" : "var(--text-secondary)", transition: "background 0.15s, color 0.15s" }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Folder tabs — droppable targets */}
      {folders.length > 0 && (
        <div style={{ display: "flex", gap: 8, padding: "0 16px", marginBottom: 8, overflowX: "auto", flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setActiveFolder(null)}
            onDragOver={(e) => { e.preventDefault(); setDragOverFolderId("__none__"); }}
            onDragLeave={() => setDragOverFolderId(null)}
            onDrop={handleRemoveFolderDrop}
            style={{
              padding: "4px 12px", borderRadius: 9999, fontSize: 12, fontWeight: 500,
              border: dragOverFolderId === "__none__" ? "1.5px dashed var(--destructive)" : "1.5px solid transparent",
              cursor: draggingTicketId ? "copy" : "pointer", whiteSpace: "nowrap", flexShrink: 0, fontFamily: "inherit",
              background: activeFolder === null ? "var(--text-secondary)" : "var(--surface)",
              color: activeFolder === null ? "#fff" : "var(--text-secondary)",
              transition: "background 0.15s, border-color 0.15s",
            }}
          >
            {t("folder_allFolders")}
          </button>
          {folders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => setActiveFolder(activeFolder === folder.id ? null : folder.id)}
              onDragOver={(e) => handleFolderDragOver(e, folder.id)}
              onDragLeave={handleFolderDragLeave}
              onDrop={(e) => handleFolderDrop(e, folder.id)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "4px 12px", borderRadius: 9999, fontSize: 12, fontWeight: 500,
                border: dragOverFolderId === folder.id ? `1.5px dashed ${folder.color}` : "1.5px solid transparent",
                cursor: draggingTicketId ? "copy" : "pointer", whiteSpace: "nowrap", flexShrink: 0, fontFamily: "inherit",
                background: activeFolder === folder.id ? folder.color : dragOverFolderId === folder.id ? `${folder.color}22` : "var(--surface)",
                color: activeFolder === folder.id ? "#fff" : "var(--text-secondary)",
                transition: "background 0.15s, border-color 0.15s",
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: activeFolder === folder.id ? "#fff" : folder.color, flexShrink: 0, display: "inline-block" }} />
              {folder.name}
              <span style={{ opacity: 0.7 }}>({folder.ticketIds.length})</span>
            </button>
          ))}
        </div>
      )}

      {/* Drag hint */}
      {draggingTicketId && folders.length > 0 && (
        <div style={{ margin: "0 16px 8px", padding: "6px 12px", borderRadius: 8, background: "var(--primary)", color: "#fff", fontSize: 12, textAlign: "center", opacity: 0.9 }}>
          {t("folder_dragHint")}
        </div>
      )}

      {/* Ticket list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {items.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "64px 32px", textAlign: "center" }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="var(--text-hint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}><path d="M8 36V12a4 4 0 014-4h24a4 4 0 014 4v16a4 4 0 01-4 4H16l-8 8z" /></svg>
            <div style={{ fontSize: 15, color: "var(--text-hint)", marginBottom: 4 }}>{t("chatList_noRequests")}</div>
            <div style={{ fontSize: 12, color: "var(--text-hint)", marginBottom: 16, maxWidth: 240 }}>{t("chatList_shareLink")}</div>
            <button
              type="button"
              style={{ padding: "8px 20px", borderRadius: 9999, background: "var(--primary)", color: "#fff", fontSize: 15, fontWeight: 500, border: "none", cursor: "pointer", fontFamily: "inherit" }}
              onClick={() => { navigator.clipboard.writeText(window.location.href).catch(() => {}); }}
            >{t("chatList_copyLink")}</button>
          </div>
        ) : items.map((ticket, idx) => {
          const ticketFolder = folders.find((f) => f.ticketIds.includes(ticket.id)) ?? null;
          const isDragging = draggingTicketId === ticket.id;

          return (
            <div
              key={ticket.id}
              className="cascade-item"
              draggable={folders.length > 0}
              onDragStart={(e) => handleDragStart(e, ticket.id)}
              onDragEnd={handleDragEnd}
              style={{
                animationDelay: `${idx * 30}ms`,
                opacity: isDragging ? 0.45 : 1,
                transition: "opacity 0.15s",
                cursor: folders.length > 0 ? "grab" : undefined,
              }}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                {/* Drag handle indicator */}
                {folders.length > 0 && (
                  <div style={{ width: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, paddingLeft: 4 }}>
                    <svg width="10" height="14" viewBox="0 0 10 14" fill="var(--text-hint)" style={{ opacity: 0.4 }}>
                      <circle cx="3" cy="2.5" r="1.2" /><circle cx="7" cy="2.5" r="1.2" />
                      <circle cx="3" cy="7" r="1.2" /><circle cx="7" cy="7" r="1.2" />
                      <circle cx="3" cy="11.5" r="1.2" /><circle cx="7" cy="11.5" r="1.2" />
                    </svg>
                  </div>
                )}

                {/* Main row button */}
                <button
                  type="button"
                  className="pressable"
                  onClick={() => onOpenChat(ticket.id, demoChannels[0].id, ticket.title)}
                  style={{ display: "flex", alignItems: "center", flex: 1, height: 72, padding: folders.length > 0 ? "0 0 0 6px" : "0 0 0 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", minWidth: 0 }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: AVATAR_COLORS[hash(ticket.id) % AVATAR_COLORS.length], display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff", fontSize: 18, fontWeight: 600 }}>
                    {ticket.title.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, marginLeft: 12, overflow: "hidden", minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0, gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_DOT[ticket.status] ?? "#8e8e93", flexShrink: 0 }} />
                        {ticketFolder && (
                          <div
                            style={{ width: 8, height: 8, borderRadius: "50%", background: ticketFolder.color, flexShrink: 0, border: "1px solid var(--surface)" }}
                            title={ticketFolder.name}
                          />
                        )}
                        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ticket.title}</span>
                      </div>
                      <span style={{ fontSize: 12, color: ticket.slaMinutes <= 3 ? "var(--destructive)" : "var(--text-hint)", flexShrink: 0, marginLeft: 8 }}>{ticket.updatedAt}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                      <span style={{ fontSize: 15, color: "var(--text-hint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1, minWidth: 0 }}>{ticket.lastMessage}</span>
                      {ticket.status === "new" && <span style={{ minWidth: 20, height: 20, borderRadius: 10, background: "var(--primary)", color: "#fff", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px", flexShrink: 0, marginLeft: 8 }}>1</span>}
                      {ticket.status === "waiting_customer" && <span style={{ minWidth: 20, height: 20, borderRadius: 10, background: "#ff9f0a", color: "#fff", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px", flexShrink: 0, marginLeft: 8 }}>!</span>}
                    </div>
                  </div>
                </button>

                {/* Folder picker button */}
                {folders.length > 0 && (
                  <button
                    type="button"
                    aria-label={t("folder_moveToFolder")}
                    onClick={(e) => openFolderMenu(ticket.id, e)}
                    style={{
                      width: 40, height: 72, display: "flex", alignItems: "center", justifyContent: "center",
                      background: "none", border: "none", cursor: "pointer", flexShrink: 0,
                      color: ticketFolder ? ticketFolder.color : "var(--text-hint)",
                      transition: "color 0.15s",
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={ticketFolder ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: ticketFolder ? 1 : 0.5 }}>
                      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                    </svg>
                  </button>
                )}
              </div>

              {idx < items.length - 1 && <div style={{ height: 0.5, background: "var(--divider)", marginLeft: folders.length > 0 ? 82 : 76 }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
