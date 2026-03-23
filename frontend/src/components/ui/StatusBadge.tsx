import { statusLabels } from "../../data/demo-data";

type StatusBadgeProps = {
  status: string;
  style?: React.CSSProperties;
};

export default function StatusBadge({ status, style }: StatusBadgeProps) {
  return (
    <span className={`badge badge--${status}`} style={style}>
      {statusLabels[status] ?? status}
    </span>
  );
}
