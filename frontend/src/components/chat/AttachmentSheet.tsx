type AttachmentSheetProps = {
  open: boolean;
  onClose: () => void;
  onSendAttachment: (kind: "photo" | "file" | "location") => void;
  onCameraClick: () => void;
};

export default function AttachmentSheet({
  open,
  onClose,
  onSendAttachment,
  onCameraClick,
}: AttachmentSheetProps) {
  if (!open) return null;
  return (
    <div className="attach-sheet-overlay" onClick={onClose}>
      <div className="attach-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="attach-sheet__grid">
          <button
            className="attach-sheet__item"
            type="button"
            onClick={() => onSendAttachment("photo")}
          >
            <span className="attach-sheet__icon" style={{ background: "rgba(106,179,243,0.2)", color: "var(--accent)" }}>{"\u{1F4F7}"}</span>
            <span>Фото</span>
          </button>
          <button
            className="attach-sheet__item"
            type="button"
            onClick={() => onSendAttachment("file")}
          >
            <span className="attach-sheet__icon" style={{ background: "rgba(77,205,94,0.2)", color: "var(--green)" }}>{"\u{1F4C4}"}</span>
            <span>Файл</span>
          </button>
          <button
            className="attach-sheet__item"
            type="button"
            onClick={onCameraClick}
          >
            <span className="attach-sheet__icon" style={{ background: "rgba(230,126,34,0.2)", color: "#e67e22" }}>{"\u{1F4F9}"}</span>
            <span>Камера</span>
          </button>
          <button
            className="attach-sheet__item"
            type="button"
            onClick={() => onSendAttachment("location")}
          >
            <span className="attach-sheet__icon" style={{ background: "rgba(155,89,182,0.2)", color: "#9b59b6" }}>{"\u{1F4CD}"}</span>
            <span>Геолокация</span>
          </button>
        </div>
      </div>
    </div>
  );
}
