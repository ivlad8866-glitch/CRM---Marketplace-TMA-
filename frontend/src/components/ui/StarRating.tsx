import { formatRating } from "../../lib/adapters";

type StarRatingProps = {
  channelId: string;
  channelRatings: Record<string, { rating: number; count: number }>;
  size?: "sm" | "md";
};

export default function StarRating({ channelId, channelRatings, size }: StarRatingProps) {
  const info = channelRatings[channelId] ?? { rating: 0, count: 0 };
  return (
    <span className={`star-inline ${size === "sm" ? "star-inline--sm" : ""}`}>
      {formatRating(info.rating, info.count)}
    </span>
  );
}
