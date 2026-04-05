import { useRef, useCallback } from "react";
import { useLocale } from "../../lib/i18n";

export type AttachmentMeta = {
  url?: string;
  name?: string;
  size?: string;
};

type AttachmentSheetProps = {
  open: boolean;
  onClose: () => void;
  onSendAttachment: (kind: "photo" | "file" | "location", meta?: AttachmentMeta) => void;
  onCameraClick: () => void;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

/* ── SVG Icons ───────────────────────────────────────────────── */

function PhotoIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

/* ── Component ───────────────────────────────────────────────── */

export default function AttachmentSheet({
  open,
  onClose,
  onSendAttachment,
  onCameraClick,
}: AttachmentSheetProps) {
  const { t } = useLocale();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onSendAttachment("photo", { url, name: file.name, size: formatFileSize(file.size) });
    // Reset the input so re-selecting the same file triggers onChange again
    e.target.value = "";
  }, [onSendAttachment]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onSendAttachment("file", { url, name: file.name, size: formatFileSize(file.size) });
    e.target.value = "";
  }, [onSendAttachment]);

  const handleLocationClick = useCallback(() => {
    if (!navigator.geolocation) {
      onSendAttachment("location");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        onSendAttachment("location", {
          name: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        });
      },
      () => {
        // Fallback to Moscow coordinates on error
        onSendAttachment("location");
      },
      { timeout: 5000 }
    );
  }, [onSendAttachment]);

  if (!open) return null;

  return (
    <div className="attach-sheet-overlay" onClick={onClose}>
      <div className="attach-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Hidden file inputs */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handlePhotoSelect}
        />
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: "none" }}
          onChange={handleFileSelect}
        />

        <div className="attach-sheet__grid">
          <button
            className="attach-sheet__item"
            type="button"
            onClick={() => photoInputRef.current?.click()}
          >
            <span
              className="attach-sheet__icon"
              style={{ background: "rgba(106,179,243,0.15)", color: "var(--accent)" }}
            >
              <PhotoIcon />
            </span>
            <span>{t("attach_photo")}</span>
          </button>
          <button
            className="attach-sheet__item"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            <span
              className="attach-sheet__icon"
              style={{ background: "rgba(77,205,94,0.15)", color: "var(--green)" }}
            >
              <FileIcon />
            </span>
            <span>{t("attach_file")}</span>
          </button>
          <button
            className="attach-sheet__item"
            type="button"
            onClick={onCameraClick}
          >
            <span
              className="attach-sheet__icon"
              style={{ background: "rgba(230,126,34,0.15)", color: "#e67e22" }}
            >
              <CameraIcon />
            </span>
            <span>{t("attach_camera")}</span>
          </button>
          <button
            className="attach-sheet__item"
            type="button"
            onClick={handleLocationClick}
          >
            <span
              className="attach-sheet__icon"
              style={{ background: "rgba(155,89,182,0.15)", color: "#9b59b6" }}
            >
              <LocationIcon />
            </span>
            <span>{t("attach_location")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
