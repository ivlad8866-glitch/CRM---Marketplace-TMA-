import { useRef, useCallback } from "react";
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
  const gridRef = useRef<HTMLDivElement>(null);
  const category = stickerCategories[categoryIdx];

  const handleCategoryClick = useCallback((idx: number) => {
    onCategoryChange(idx);
    gridRef.current?.scrollTo({ top: 0 });
  }, [onCategoryChange]);

  if (!open) return null;

  return (
    <div className="sticker-panel">
      <div className="sticker-panel__tabs">
        {stickerCategories.map((cat, idx) => (
          <button
            key={cat.label}
            className={`sticker-panel__tab ${idx === categoryIdx ? "sticker-panel__tab--active" : ""}`}
            type="button"
            onClick={() => handleCategoryClick(idx)}
            aria-label={cat.label}
          >
            {cat.icon}
          </button>
        ))}
      </div>
      <div className="sticker-panel__grid" ref={gridRef}>
        {category.stickers.map((s, i) => (
          <button
            key={`${s}-${i}`}
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
