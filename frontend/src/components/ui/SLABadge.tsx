type SLABadgeProps = {
  slaMinutes: number;
};

export default function SLABadge({ slaMinutes }: SLABadgeProps) {
  return (
    <span className="pill pill--sm">{slaMinutes} мин</span>
  );
}
