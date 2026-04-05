import { useState, useRef } from "react";
import type { AdminMoreScreen, Folder } from "../../types";
import { demoTemplates } from "../../data/demo-data";
import { IS_DEV } from "../../lib/adapters";
import { useLocale, setLocale } from "../../lib/i18n";
import { apiClient } from "../../lib/api-client";
import { useAuthStore } from "../../stores/auth.store";

/* ----------------------------------------------------------------
   Types
   ---------------------------------------------------------------- */

type ServiceDraft = {
  id: string;
  name: string;
  description: string;
  coverUrl: string;
  slug: string;
  price: string;
  currency: string;
  sla: string;
  startParam: string;
  shortName: string;
};

type TeamMember = {
  id: string;
  name: string;
  role: string;
  online: boolean;
};

type TemplateDraft = {
  id: string;
  title: string;
  text: string;
};

type MorePageProps = {
  adminMoreScreen: AdminMoreScreen;
  themeMode: "day" | "night";
  accentColor: string;
  onSetAdminMoreScreen: (screen: AdminMoreScreen) => void;
  onSetThemeMode: (mode: "day" | "night") => void;
  onSetAccentColor: (color: string) => void;
  showToast: (msg: string) => void;
  folders: Folder[];
  onSetFolders: React.Dispatch<React.SetStateAction<Folder[]>>;
};

/* ----------------------------------------------------------------
   Defaults
   ---------------------------------------------------------------- */

const EMPTY_SERVICE_DRAFT: ServiceDraft = {
  id: "",
  name: "",
  description: "",
  coverUrl: "",
  slug: "",
  price: "",
  currency: "RUB",
  sla: "",
  startParam: "",
  shortName: "",
};

function generateSlug(name: string, id: string): string {
  const base = name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u0400-\u04ff-]/g, "")
    .slice(0, 30);
  const shortId = id.slice(-6);
  return `${base}-${shortId}`;
}

const defaultServices: ServiceDraft[] = [
  {
    id: "s-1",
    name: "Консультация",
    description: "Вопросы по заказу, доставке, статусу.",
    coverUrl: "",
    slug: generateSlug("Консультация", "s-1"),
    price: "",
    currency: "RUB",
    sla: "4",
    startParam: "consult_42",
    shortName: "support",
  },
  {
    id: "s-2",
    name: "Возвраты",
    description: "Проверка платежей и возврат средств.",
    coverUrl: "",
    slug: generateSlug("Возвраты", "s-2"),
    price: "",
    currency: "RUB",
    sla: "6",
    startParam: "refund_18",
    shortName: "refund",
  },
];

const defaultTeam: TeamMember[] = [
  { id: "t-1", name: "Маруся", role: "Agent", online: true },
  { id: "t-2", name: "Игорь", role: "Admin", online: false },
];

/* ----------------------------------------------------------------
   Helpers
   ---------------------------------------------------------------- */

let idCounter = Date.now();
const nextId = (prefix: string) => `${prefix}-${++idCounter}`;

const formatPrice = (price: string, currency: string, t: (key: any) => string): string => {
  const num = Number(price);
  if (!price || num === 0) return t("services_free");
  const symbols: Record<string, string> = { RUB: "\u20BD", USD: "$", EUR: "\u20AC" };
  return `${num} ${symbols[currency] || currency}`;
};

/* ================================================================
   Component
   ================================================================ */

const FOLDER_COLORS = ["#2AABEE", "#34c759", "#ff9f0a", "#ff3b30", "#9b59b6", "#e67e22"];

type FolderDraft = { id: string; name: string; color: string; keywords: string };
const EMPTY_FOLDER_DRAFT: FolderDraft = { id: "", name: "", color: FOLDER_COLORS[0], keywords: "" };

export default function MorePage({
  adminMoreScreen,
  themeMode,
  accentColor,
  onSetAdminMoreScreen,
  onSetThemeMode,
  onSetAccentColor,
  showToast,
  folders,
  onSetFolders,
}: MorePageProps) {
  const { locale, t } = useLocale();

  const { activeWorkspaceId } = useAuthStore();

  /* ---- Shared state ---- */
  const [copied, setCopied] = useState<string | null>(null);

  /* ---- Cover upload state ---- */
  const coverFileRef = useRef<HTMLInputElement>(null);
  const [coverUploading, setCoverUploading] = useState(false);

  /* ---- Services state ---- */
  const [services, setServices] = useState<ServiceDraft[]>(defaultServices);
  const [serviceDraft, setServiceDraft] = useState<ServiceDraft>(EMPTY_SERVICE_DRAFT);
  const [serviceFormOpen, setServiceFormOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  /* ---- Templates state ---- */
  const [templates, setTemplates] = useState<TemplateDraft[]>(
    demoTemplates.map((t) => ({ ...t })),
  );
  const [macroDraft, setMacroDraft] = useState<TemplateDraft>(templates[0]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0].id);

  /* ---- Team state ---- */
  const [team, setTeam] = useState<TeamMember[]>(defaultTeam);
  const [inviteFormOpen, setInviteFormOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("Agent");

  /* ---- Folders state ---- */
  const [folderDraft, setFolderDraft] = useState<FolderDraft>(EMPTY_FOLDER_DRAFT);
  const [folderFormOpen, setFolderFormOpen] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);

  /* ---- Clipboard helper ---- */
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      showToast(t("services_copied"));
      window.setTimeout(() => setCopied(null), 1400);
    } catch {
      setCopied("error");
      window.setTimeout(() => setCopied(null), 1400);
    }
  };

  /* ---- Cover image upload helper ---- */
  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!activeWorkspaceId) { showToast(t("more_noWorkspace")); return; }

    setCoverUploading(true);
    try {
      // Step 1: get presigned PUT URL from backend
      const { uploadUrl, downloadUrl } = await apiClient<{ uploadUrl: string; downloadUrl: string; storageKey: string }>(
        `/workspaces/${activeWorkspaceId}/services/cover-upload-url`,
        { method: "POST", body: { mimeType: file.type, fileName: file.name } },
      );

      // Step 2: upload file directly to MinIO (no server proxy)
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!uploadRes.ok) throw new Error("Upload failed");

      // Step 3: store the presigned GET URL as the cover
      setServiceDraft((prev) => ({ ...prev, coverUrl: downloadUrl }));
      showToast(t("services_coverUploaded"));
    } catch {
      showToast(t("services_coverUploadError"));
    } finally {
      setCoverUploading(false);
      if (coverFileRef.current) coverFileRef.current.value = "";
    }
  };

  /* ---- Service form helpers ---- */
  const openNewServiceForm = () => {
    setServiceDraft({ ...EMPTY_SERVICE_DRAFT, id: nextId("s") });
    setEditingServiceId(null);
    setServiceFormOpen(true);
  };

  const openEditServiceForm = (svc: ServiceDraft) => {
    setServiceDraft({ ...svc });
    setEditingServiceId(svc.id);
    setServiceFormOpen(true);
  };

  const closeServiceForm = () => {
    setServiceDraft(EMPTY_SERVICE_DRAFT);
    setEditingServiceId(null);
    setServiceFormOpen(false);
  };

  const saveService = () => {
    if (!serviceDraft.name.trim()) {
      showToast(t("services_fillName"));
      return;
    }
    if (editingServiceId) {
      setServices((prev) =>
        prev.map((s) => (s.id === editingServiceId ? { ...serviceDraft } : s)),
      );
      showToast(t("services_updated"));
    } else {
      const slug = generateSlug(serviceDraft.name, serviceDraft.id);
      setServices((prev) => [...prev, { ...serviceDraft, slug }]);
      showToast(t("services_added"));
    }
    closeServiceForm();
  };

  const deleteService = (id: string) => {
    if (!window.confirm(t("services_deleteConfirm"))) return;
    setServices((prev) => prev.filter((s) => s.id !== id));
    if (editingServiceId === id) closeServiceForm();
    showToast(t("services_deleted"));
  };

  /* ---- Template helpers ---- */
  const selectTemplate = (tpl: TemplateDraft) => {
    setSelectedTemplateId(tpl.id);
    setMacroDraft({ ...tpl });
  };

  const addTemplate = () => {
    const newTpl: TemplateDraft = {
      id: nextId("macro"),
      title: "",
      text: "",
    };
    setTemplates((prev) => [...prev, newTpl]);
    selectTemplate(newTpl);
    showToast(t("templates_created"));
  };

  const saveTemplate = () => {
    if (!macroDraft.title.trim()) {
      showToast(t("templates_fillName"));
      return;
    }
    setTemplates((prev) =>
      prev.map((tpl) => (tpl.id === selectedTemplateId ? { ...macroDraft } : tpl)),
    );
    showToast(t("templates_saved"));
  };

  const deleteTemplate = () => {
    if (templates.length <= 1) {
      showToast(t("templates_cantDeleteLast"));
      return;
    }
    const remaining = templates.filter((tpl) => tpl.id !== selectedTemplateId);
    setTemplates(remaining);
    selectTemplate(remaining[0]);
    showToast(t("templates_deleted"));
  };

  /* ---- Team helpers ---- */
  const addTeamMember = () => {
    if (!inviteName.trim()) {
      showToast(t("team_fillName"));
      return;
    }
    const member: TeamMember = {
      id: nextId("t"),
      name: inviteName.trim(),
      role: inviteRole,
      online: false,
    };
    setTeam((prev) => [...prev, member]);
    setInviteName("");
    setInviteRole("Agent");
    setInviteFormOpen(false);
    showToast(t("team_agentAdded"));
  };

  const removeTeamMember = (id: string) => {
    if (id === "t-2") {
      showToast(t("team_cantDeleteSelf"));
      return;
    }
    if (!window.confirm(t("team_deleteConfirm"))) return;
    setTeam((prev) => prev.filter((m) => m.id !== id));
    showToast(t("team_memberDeleted"));
  };

  /* ---- Folder helpers ---- */
  const openNewFolderForm = () => {
    setFolderDraft({ ...EMPTY_FOLDER_DRAFT, id: nextId("f") });
    setEditingFolderId(null);
    setFolderFormOpen(true);
  };

  const openEditFolderForm = (folder: Folder) => {
    setFolderDraft({ id: folder.id, name: folder.name, color: folder.color, keywords: folder.keywords.join(", ") });
    setEditingFolderId(folder.id);
    setFolderFormOpen(true);
  };

  const closeFolderForm = () => {
    setFolderDraft(EMPTY_FOLDER_DRAFT);
    setEditingFolderId(null);
    setFolderFormOpen(false);
  };

  const saveFolder = () => {
    if (!folderDraft.name.trim()) { showToast(t("folder_fillName")); return; }
    const keywords = folderDraft.keywords.split(",").map((k) => k.trim()).filter(Boolean);
    if (editingFolderId) {
      onSetFolders((prev) => prev.map((f) => f.id === editingFolderId ? { ...f, name: folderDraft.name.trim(), color: folderDraft.color, keywords } : f));
      showToast(t("folder_updated"));
    } else {
      onSetFolders((prev) => [...prev, { id: folderDraft.id, name: folderDraft.name.trim(), color: folderDraft.color, keywords, ticketIds: [] }]);
      showToast(t("folder_created"));
    }
    closeFolderForm();
  };

  const deleteFolder = (id: string) => {
    if (!window.confirm(t("folder_deleteConfirm"))) return;
    onSetFolders((prev) => prev.filter((f) => f.id !== id));
    if (editingFolderId === id) closeFolderForm();
    showToast(t("folder_deleted"));
  };

  /* ==============================================================
     MENU
     ============================================================== */
  if (adminMoreScreen === "menu") {
    return (
      <div className="screen" key="admin-more-menu">
        <div className="screen__header">
          <h2>{t("more_management")}</h2>
        </div>
        <div className="menu-list">
          <button
            className="menu-item"
            type="button"
            onClick={() => onSetAdminMoreScreen("services")}
          >
            <span className="menu-item__icon">&#128279;</span>
            <span>{t("more_servicesAndLinks")}</span>
            <span className="menu-item__arrow">&#8250;</span>
          </button>
          <button
            className="menu-item"
            type="button"
            onClick={() => onSetAdminMoreScreen("templates")}
          >
            <span className="menu-item__icon">&#128196;</span>
            <span>{t("more_templates")}</span>
            <span className="menu-item__arrow">&#8250;</span>
          </button>
          <button
            className="menu-item"
            type="button"
            onClick={() => onSetAdminMoreScreen("team")}
          >
            <span className="menu-item__icon">&#128101;</span>
            <span>{t("more_team")}</span>
            <span className="menu-item__arrow">&#8250;</span>
          </button>
          <button
            className="menu-item"
            type="button"
            onClick={() => onSetAdminMoreScreen("settings")}
          >
            <span className="menu-item__icon">&#9881;</span>
            <span>{t("more_settings")}</span>
            <span className="menu-item__arrow">&#8250;</span>
          </button>
          <button
            className="menu-item"
            type="button"
            onClick={() => onSetAdminMoreScreen("folders")}
          >
            <span className="menu-item__icon">&#128193;</span>
            <span>{t("more_folders")}</span>
            <span className="menu-item__arrow">&#8250;</span>
          </button>
        </div>
      </div>
    );
  }

  /* ==============================================================
     SERVICES
     ============================================================== */
  if (adminMoreScreen === "services") {
    return (
      <div className="screen" key="admin-services">
        <div className="screen__header">
          <button
            className="back-link"
            type="button"
            onClick={() => onSetAdminMoreScreen("menu")}
          >
            &#8592; {t("more_back")}
          </button>
          <h2>{t("more_servicesAndLinks")}</h2>
        </div>

        {/* Service list */}
        <div className="section-block">
          <h3>{t("services_existing")}</h3>
          <div className="card-list">
            {services.map((svc) => (
              <div key={svc.id} className="service-item">
                <div>
                  <strong>{svc.name}</strong>
                  {svc.description && (
                    <span style={{ display: "block", opacity: 0.7, fontSize: "0.85em" }}>
                      {svc.description}
                    </span>
                  )}
                  <span className="mono" style={{ display: "block", marginTop: 2 }}>
                    {formatPrice(svc.price, svc.currency, t)}
                    {svc.sla ? ` \u00B7 SLA: ${svc.sla} ${t("common_min")}` : ""}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    className="btn btn--ghost btn--sm"
                    type="button"
                    onClick={() => openEditServiceForm(svc)}
                  >
                    {t("services_edit")}
                  </button>
                  <button
                    className="btn btn--ghost btn--sm"
                    type="button"
                    onClick={() => deleteService(svc.id)}
                  >
                    {t("services_delete")}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Links for each service */}
          {services.map((svc) => (
            <div key={`links-${svc.id}`} className="link-list" style={{ marginTop: 12 }}>
              {svc.slug && (
                <div className="link-card">
                  <div className="link-card__info">
                    <strong>{t("services_directLink")} &mdash; {svc.name}</strong>
                    <span className="mono">#service/{svc.slug}</span>
                  </div>
                  <button
                    className="btn btn--ghost btn--sm"
                    type="button"
                    onClick={() => copyToClipboard(`#service/${svc.slug}`)}
                  >
                    {copied === `#service/${svc.slug}` ? "OK" : t("services_copy")}
                  </button>
                </div>
              )}
              <div className="link-card">
                <div className="link-card__info">
                  <strong>Main Mini App &mdash; {svc.name}</strong>
                  <span className="mono">
                    t.me/your_bot?startapp={svc.startParam}&amp;mode=compact
                  </span>
                </div>
                <button
                  className="btn btn--ghost btn--sm"
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `t.me/your_bot?startapp=${svc.startParam}&mode=compact`,
                    )
                  }
                >
                  {copied === `t.me/your_bot?startapp=${svc.startParam}&mode=compact`
                    ? "OK"
                    : t("services_copy")}
                </button>
              </div>
              <div className="link-card">
                <div className="link-card__info">
                  <strong>Direct Mini App &mdash; {svc.name}</strong>
                  <span className="mono">
                    t.me/your_bot/{svc.shortName}?startapp={svc.startParam}&amp;mode=compact
                  </span>
                </div>
                <button
                  className="btn btn--ghost btn--sm"
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `t.me/your_bot/${svc.shortName}?startapp=${svc.startParam}&mode=compact`,
                    )
                  }
                >
                  {copied ===
                  `t.me/your_bot/${svc.shortName}?startapp=${svc.startParam}&mode=compact`
                    ? "OK"
                    : t("services_copy")}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add / Edit form */}
        <div className="section-block">
          {!serviceFormOpen ? (
            <button
              className="btn btn--primary btn--block"
              type="button"
              onClick={openNewServiceForm}
            >
              + {t("services_add")}
            </button>
          ) : (
            <>
              <h3>{editingServiceId ? t("services_editTitle") : t("services_newTitle")}</h3>

              <div className="form-field">
                <label>{t("services_nameLabel")}</label>
                <input
                  value={serviceDraft.name}
                  onChange={(e) =>
                    setServiceDraft((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder={t("services_namePlaceholder")}
                />
              </div>

              <div className="form-field">
                <label>{t("services_descriptionLabel")}</label>
                <textarea
                  value={serviceDraft.description}
                  rows={3}
                  onChange={(e) =>
                    setServiceDraft((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder={t("services_descriptionPlaceholder")}
                />
              </div>

              <div className="form-field">
                <label>{t("services_coverLabel")}</label>

                {/* Preview */}
                {serviceDraft.coverUrl && (
                  <img
                    src={serviceDraft.coverUrl}
                    alt={t("services_coverAlt")}
                    style={{ width: "100%", maxHeight: 140, objectFit: "cover", borderRadius: 8, marginBottom: 8, display: "block" }}
                  />
                )}

                {/* Hidden file input */}
                <input
                  ref={coverFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  style={{ display: "none" }}
                  onChange={handleCoverFileChange}
                />

                {/* Buttons */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    disabled={coverUploading}
                    onClick={() => coverFileRef.current?.click()}
                  >
                    {coverUploading
                      ? t("services_uploading")
                      : serviceDraft.coverUrl
                        ? t("services_replacePhoto")
                        : t("services_uploadPhoto")}
                  </button>
                  {serviceDraft.coverUrl && !coverUploading && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => setServiceDraft((prev) => ({ ...prev, coverUrl: "" }))}
                    >
                      {t("services_removePhoto")}
                    </button>
                  )}
                </div>
              </div>

              <div className="form-field">
                <label>{t("services_priceLabel")}</label>
                <input
                  type="number"
                  value={serviceDraft.price}
                  onChange={(e) =>
                    setServiceDraft((prev) => ({ ...prev, price: e.target.value }))
                  }
                  placeholder={t("services_pricePlaceholder")}
                  min="0"
                />
              </div>

              <div className="form-field">
                <label>{t("services_currencyLabel")}</label>
                <select
                  value={serviceDraft.currency}
                  onChange={(e) =>
                    setServiceDraft((prev) => ({ ...prev, currency: e.target.value }))
                  }
                >
                  <option value="RUB">RUB</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>

              <div className="form-field">
                <label>{t("services_slaLabel")}</label>
                <input
                  type="number"
                  value={serviceDraft.sla}
                  onChange={(e) =>
                    setServiceDraft((prev) => ({ ...prev, sla: e.target.value }))
                  }
                  placeholder={t("services_slaPlaceholder")}
                  min="0"
                />
              </div>

              {serviceDraft.slug && (
                <div className="form-field">
                  <label>{t("services_uniqueLink")}</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      value={`#service/${serviceDraft.slug}`}
                      readOnly
                      style={{ flex: 1, opacity: 0.7 }}
                    />
                    <button
                      className="btn btn--ghost btn--sm"
                      type="button"
                      onClick={() => copyToClipboard(`#service/${serviceDraft.slug}`)}
                    >
                      {copied === `#service/${serviceDraft.slug}` ? "OK" : t("services_copy")}
                    </button>
                  </div>
                </div>
              )}

              <div className="form-field">
                <label>start_param</label>
                <input
                  value={serviceDraft.startParam}
                  onChange={(e) =>
                    setServiceDraft((prev) => ({ ...prev, startParam: e.target.value }))
                  }
                  placeholder="consult_42"
                />
              </div>

              <div className="form-field">
                <label>short_name</label>
                <input
                  value={serviceDraft.shortName}
                  onChange={(e) =>
                    setServiceDraft((prev) => ({ ...prev, shortName: e.target.value }))
                  }
                  placeholder="support"
                />
              </div>

              <div className="template-actions">
                <button
                  className="btn btn--primary"
                  type="button"
                  onClick={saveService}
                >
                  {t("services_save")}
                </button>
                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={closeServiceForm}
                >
                  {t("services_cancel")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ==============================================================
     TEMPLATES
     ============================================================== */
  if (adminMoreScreen === "templates") {
    return (
      <div className="screen" key="admin-templates">
        <div className="screen__header">
          <button
            className="back-link"
            type="button"
            onClick={() => onSetAdminMoreScreen("menu")}
          >
            &#8592; {t("more_back")}
          </button>
          <h2>{t("more_templates")}</h2>
        </div>

        <div style={{ marginBottom: 12 }}>
          <button
            className="btn btn--primary btn--block"
            type="button"
            onClick={addTemplate}
          >
            + {t("templates_add")}
          </button>
        </div>

        <div className="card-list">
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              className={`template-card ${selectedTemplateId === tpl.id ? "template-card--active" : ""}`}
              type="button"
              onClick={() => selectTemplate(tpl)}
            >
              <strong>{tpl.title || t("templates_noName")}</strong>
              <span>{tpl.text}</span>
            </button>
          ))}
        </div>

        <div className="section-block">
          <h3>{t("templates_editor")}</h3>
          <div className="form-field">
            <label>{t("templates_nameLabel")}</label>
            <input
              value={macroDraft.title}
              onChange={(e) =>
                setMacroDraft((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder={t("templates_namePlaceholder")}
            />
          </div>
          <div className="form-field">
            <label>{t("templates_textLabel")}</label>
            <textarea
              value={macroDraft.text}
              rows={4}
              onChange={(e) =>
                setMacroDraft((prev) => ({ ...prev, text: e.target.value }))
              }
              placeholder={t("templates_textPlaceholder")}
            />
          </div>
          <div className="template-vars">
            {["{clientNumber}", "{ticketNumber}", "{serviceName}", "{agentName}"].map(
              (token) => (
                <button
                  key={token}
                  type="button"
                  className="tag"
                  style={{ cursor: "pointer", fontFamily: "inherit", border: "none", background: "inherit" }}
                  onClick={() => setMacroDraft((prev) => ({ ...prev, text: prev.text + token }))}
                >
                  {token}
                </button>
              ),
            )}
          </div>
          <div className="template-actions">
            <button
              className="btn btn--primary"
              type="button"
              onClick={saveTemplate}
            >
              {t("templates_save")}
            </button>
            <button
              className="btn btn--ghost"
              type="button"
              onClick={deleteTemplate}
            >
              {t("templates_delete")}
            </button>
          </div>

          <div className="template-preview">
            <div className="bubble bubble--theirs">
              <span>{macroDraft.text || t("templates_empty")}</span>
              <small>Preview</small>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ==============================================================
     TEAM
     ============================================================== */
  if (adminMoreScreen === "team") {
    return (
      <div className="screen" key="admin-team">
        <div className="screen__header">
          <button
            className="back-link"
            type="button"
            onClick={() => onSetAdminMoreScreen("menu")}
          >
            &#8592; {t("more_back")}
          </button>
          <h2>{t("more_team")}</h2>
        </div>

        <div className="card-list">
          {team.map((member) => (
            <div key={member.id} className="team-card">
              <div className="avatar">{member.name.charAt(0)}</div>
              <div className="team-card__info">
                <strong>{member.name}</strong>
                <span>{member.role}</span>
              </div>
              <span className={`pill ${member.online ? "pill--glow" : ""}`}>
                {member.online ? t("team_online") : t("team_offline")}
              </span>
              {member.id !== "t-2" && (
                <button
                  className="btn btn--ghost btn--sm"
                  type="button"
                  onClick={() => removeTeamMember(member.id)}
                  style={{ marginLeft: 8 }}
                >
                  {t("team_delete")}
                </button>
              )}
            </div>
          ))}
        </div>

        {!inviteFormOpen ? (
          <button
            className="btn btn--primary btn--block"
            type="button"
            onClick={() => setInviteFormOpen(true)}
          >
            {t("team_invite")}
          </button>
        ) : (
          <div className="section-block">
            <h3>{t("team_newMember")}</h3>
            <div className="form-field">
              <label>{t("team_nameLabel")}</label>
              <input
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder={t("team_namePlaceholder")}
              />
            </div>
            <div className="form-field">
              <label>{t("team_roleLabel")}</label>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                <option value="Agent">Agent</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div className="template-actions">
              <button
                className="btn btn--primary"
                type="button"
                onClick={addTeamMember}
              >
                {t("team_add")}
              </button>
              <button
                className="btn btn--ghost"
                type="button"
                onClick={() => {
                  setInviteFormOpen(false);
                  setInviteName("");
                  setInviteRole("Agent");
                }}
              >
                {t("team_cancel")}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ==============================================================
     FOLDERS
     ============================================================== */
  if (adminMoreScreen === "folders") {
    return (
      <div className="screen" key="admin-folders">
        <div className="screen__header">
          <button className="back-link" type="button" onClick={() => { closeFolderForm(); onSetAdminMoreScreen("menu"); }}>
            &#8592; {t("more_back")}
          </button>
          <h2>{t("folder_management")}</h2>
        </div>

        {/* Folder list */}
        <div className="section-block">
          {folders.length === 0 && !folderFormOpen && (
            <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-hint)", fontSize: 14 }}>
              {t("folder_emptyHint")}
            </div>
          )}
          <div className="card-list">
            {folders.map((folder) => (
              <div key={folder.id} className="service-item">
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: folder.color, flexShrink: 0 }} />
                  <div>
                    <strong>{folder.name}</strong>
                    <span style={{ display: "block", opacity: 0.7, fontSize: "0.82em", marginTop: 2 }}>
                      {folder.keywords.length > 0 ? folder.keywords.join(", ") : t("folder_noKeywords")}
                    </span>
                    <span style={{ fontSize: "0.78em", color: "var(--text-hint)" }}>
                      {folder.ticketIds.length} {t("nav_chats").toLowerCase()}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button className="btn btn--ghost btn--sm" type="button" onClick={() => openEditFolderForm(folder)}>{t("services_edit")}</button>
                  <button className="btn btn--ghost btn--sm" type="button" onClick={() => deleteFolder(folder.id)}>{t("common_delete")}</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add / Edit form */}
        <div className="section-block">
          {!folderFormOpen ? (
            <button className="btn btn--primary btn--block" type="button" onClick={openNewFolderForm}>
              + {t("folder_createBtn")}
            </button>
          ) : (
            <>
              <h3>{editingFolderId ? t("folder_editTitle") : t("folder_newTitle")}</h3>
              <div className="form-field">
                <label>{t("folder_nameLabel")} *</label>
                <input
                  value={folderDraft.name}
                  onChange={(e) => setFolderDraft((p) => ({ ...p, name: e.target.value }))}
                  placeholder={t("folder_namePlaceholder")}
                />
              </div>
              <div className="form-field">
                <label>{t("folder_colorLabel")}</label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                  {FOLDER_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`${t("folder_colorLabel")} ${c}`}
                      onClick={() => setFolderDraft((p) => ({ ...p, color: c }))}
                      style={{
                        width: 28, height: 28, borderRadius: "50%", background: c, border: "none", cursor: "pointer",
                        outline: folderDraft.color === c ? `3px solid ${c}` : "none",
                        outlineOffset: 2, transition: "outline 0.15s",
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="form-field">
                <label>{t("folder_keywordsLabel")}</label>
                <textarea
                  value={folderDraft.keywords}
                  rows={3}
                  onChange={(e) => setFolderDraft((p) => ({ ...p, keywords: e.target.value }))}
                  placeholder={t("folder_keywordsPlaceholder")}
                />
                <span style={{ fontSize: 12, color: "var(--text-hint)", marginTop: 4, display: "block" }}>
                  {t("folder_keywordsHintFull")}
                </span>
              </div>
              <div className="template-actions">
                <button className="btn btn--primary" type="button" onClick={saveFolder}>{t("common_save")}</button>
                <button className="btn btn--ghost" type="button" onClick={closeFolderForm}>{t("common_cancel")}</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ==============================================================
     SETTINGS
     ============================================================== */
  return (
    <div className="screen" key="admin-settings">
      <div className="screen__header">
        <button
          className="back-link"
          type="button"
          onClick={() => onSetAdminMoreScreen("menu")}
        >
          &#8592; {t("more_back")}
        </button>
        <h2>{t("more_settings")}</h2>
      </div>
      <div className="section-block">
        <div className="setting-item">
          <label>{t("more_language")}</label>
          <div className="filter-chips">
            <button
              className={`chip ${locale === "ru" ? "chip--active" : ""}`}
              type="button"
              onClick={() => setLocale("ru")}
            >
              {t("more_languageRussian")}
            </button>
            <button
              className={`chip ${locale === "en" ? "chip--active" : ""}`}
              type="button"
              onClick={() => setLocale("en")}
            >
              {t("more_languageEnglish")}
            </button>
          </div>
        </div>
        <div className="setting-item">
          <label>{t("more_palette")}</label>
          <div className="swatches">
            {[
              { cls: "swatch--blue", color: "#6ab3f3" },
              { cls: "swatch--purple", color: "#7aa2f7" },
              { cls: "swatch--green", color: "#4dcd5e" },
              { cls: "swatch--orange", color: "#e67e22" },
            ].map((s) => (
              <button
                key={s.cls}
                className={`swatch ${s.cls} ${accentColor === s.color ? "swatch--selected" : ""}`}
                type="button"
                onClick={() => {
                  onSetAccentColor(s.color);
                  showToast(t("more_paletteUpdated"));
                }}
                aria-label={`${t("more_accentColor")} ${s.cls}`}
              />
            ))}
          </div>
        </div>
        <div className="setting-item">
          <label>{t("more_theme")}</label>
          <div className="filter-chips">
            <button
              className={`chip ${themeMode === "day" ? "chip--active" : ""}`}
              type="button"
              onClick={() => {
                onSetThemeMode("day");
                showToast(t("more_lightTheme"));
              }}
            >
              {t("more_themeDay")}
            </button>
            <button
              className={`chip ${themeMode === "night" ? "chip--active" : ""}`}
              type="button"
              onClick={() => {
                onSetThemeMode("night");
                showToast(t("more_darkTheme"));
              }}
            >
              {t("more_themeNight")}
            </button>
          </div>
        </div>
        <div className="setting-item">
          <label>Safe area</label>
          <p>
            --tg-safe-area-inset, --tg-content-safe-area-inset
          </p>
        </div>
        <div className="setting-item">
          <label>Dev mode</label>
          <span className={`pill ${IS_DEV ? "pill--glow" : ""}`}>
            {IS_DEV ? "browser" : "telegram"}
          </span>
        </div>
      </div>
    </div>
  );
}
