type Size = "full" | "sm" | "mini";
const CLASS: Record<Size, string> = { full: "glass-tank", sm: "glass-tank-sm", mini: "glass-tank-mini" };

export function GlassTank({
  pct, color, colorLight, size = "full", label,
}: { pct: number; color: string; colorLight?: string; size?: Size; label?: string }) {
  return (
    <div className={CLASS[size]} style={{
      "--tank-pct": `${pct}%`, "--tank-color": color, "--tank-color-light": colorLight ?? color,
    } as React.CSSProperties}>
      <div className="glass-tank-liquid" />
      <div className="glass-tank-shine" />
      <div className="glass-tank-label">{label ?? `${pct}%`}</div>
    </div>
  );
}
