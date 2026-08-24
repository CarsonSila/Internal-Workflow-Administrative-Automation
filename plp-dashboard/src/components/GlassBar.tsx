export function GlassBar({
  pct, color, colorLight, height = 14,
}: {
  pct: number;
  color: string;
  colorLight?: string;
  height?: number;
}) {
  return (
    <div
      className="glass-bar"
      style={{
        "--bar-pct": `${pct}%`,
        "--bar-color": color,
        "--bar-color-light": colorLight ?? color,
        "--bar-h": `${height}px`,
      } as React.CSSProperties}
    >
      <div className="glass-bar-fill" />
      <div className="glass-bar-shine" />
    </div>
  );
}
