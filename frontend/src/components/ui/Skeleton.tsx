/* Skeleton loading components */

export function TicketSkeleton() {
  return (
    <div className="skeleton-ticket">
      <div className="skeleton skeleton-ticket__avatar" />
      <div className="skeleton-ticket__body">
        <div className="skeleton skeleton-ticket__line" />
        <div className="skeleton skeleton-ticket__line skeleton-ticket__line--short" />
        <div className="skeleton skeleton-ticket__line skeleton-ticket__line--badge" />
      </div>
    </div>
  );
}

type MessageSkeletonProps = { count?: number };

export function MessageSkeleton({ count = 5 }: MessageSkeletonProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      {Array.from({ length: count }).map((_, i) => {
        const isRight = i % 2 === 1;
        const width = `${40 + ((i * 17) % 31)}%`;
        return (
          <div
            key={i}
            className={`skeleton skeleton-msg ${isRight ? "skeleton-msg--right" : "skeleton-msg--left"}`}
            style={{ width }}
          >
            <div className="skeleton-msg__line" style={{ width: "100%" }} />
            <div className="skeleton-msg__line" style={{ width: "60%" }} />
          </div>
        );
      })}
    </div>
  );
}

type ListSkeletonProps = { count?: number };

export function ListSkeleton({ count = 4 }: ListSkeletonProps) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <TicketSkeleton key={i} />
      ))}
    </div>
  );
}
