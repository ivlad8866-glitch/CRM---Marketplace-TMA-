import { stickerCategories } from "../../data/stickers";

type StickerPickerProps = {
  open: boolean;
  categoryIdx: number;
  onCategoryChange: (idx: number) => void;
  onSendSticker: (emoji: string) => void;
};

export default function StickerPicker({
  open,
  categoryIdx,
  onCategoryChange,
  onSendSticker,
}: StickerPickerProps) {
  if (!open) return null;
  const category = stickerCategories[categoryIdx];
  return (
    <div className="sticker-panel">
      <div className="sticker-panel__tabs">
        {stickerCategories.map((cat, idx) => (
          <button
            key={cat.label}
            className={`sticker-panel__tab ${idx === categoryIdx ? "sticker-panel__tab--active" : ""}`}
            type="button"
            onClick={() => onCategoryChange(idx)}
            aria-label={cat.label}
          >
            {cat.icon}
          </button>
        ))}
      </div>
      <div className="sticker-panel__grid">
        {category.stickers.map((s) => (
          <button
            key={s}
            className="sticker-panel__item"
            type="button"
            onClick={() => onSendSticker(s)}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
