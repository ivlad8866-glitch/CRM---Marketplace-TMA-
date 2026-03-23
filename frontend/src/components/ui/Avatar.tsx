type AvatarProps = {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  color?: string;
  className?: string;
};

export default function Avatar({ children, size, color, className }: AvatarProps) {
  const sizeClass = size === "lg" ? "avatar--lg" : size === "sm" ? "avatar--sm" : "";
  return (
    <div
      className={`avatar ${sizeClass} ${className ?? ""}`}
      style={color ? { background: color } : undefined}
    >
      {children}
    </div>
  );
}
