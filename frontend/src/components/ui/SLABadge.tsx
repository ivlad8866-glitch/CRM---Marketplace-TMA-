import { useLocale } from "../../lib/i18n";

type SLABadgeProps = {
  slaMinutes: number;
};

export default function SLABadge({ slaMinutes }: SLABadgeProps) {
  const { t } = useLocale();
  return (
    <span className="pill pill--sm">{slaMinutes} {t("common_min")}</span>
  );
}
