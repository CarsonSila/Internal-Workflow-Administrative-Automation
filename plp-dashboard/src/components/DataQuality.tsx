import { useEffect, useRef, useState } from "react";
import { useOnboarding, OnboardingTour, type TourStep } from "./OnboardingTour";
import { GlassTank } from "./GlassTank";

const DIMS = [
  { label: "Completeness", value: 96, trend: "+0.4", color: "var(--green)", issues: 128, desc: "Fields with complete data across all records" },
  { label: "Validity", value: 92, trend: "+1.1", color: "var(--primary)", issues: 412, desc: "Records passing all format validation rules" },
  { label: "Uniqueness", value: 98, trend: "0.0", color: "var(--teal)", issues: 51, desc: "Records with no unresolved duplicate state" },
  { label: "Consistency", value: 88, trend: "-0.2", color: "var(--amber)", issues: 867, desc: "Records consistent across source systems" },
  { label: "Freshness", value: 78, trend: "-1.4", color: "var(--magenta)", issues: 1840, desc: "Records updated within the expected window" },
];

const TREND_DATA = [88, 87, 89, 90, 91, 90, 91, 91.2];
const TREND_30D = [85, 86, 87, 88, 87, 88, 89, 89, 90, 90, 91, 90, 91, 91, 92, 91, 91, 92, 91.5, 91, 91.2, 91.4, 91.5, 91, 91.2, 91.3, 91.5, 91.4, 91.3, 91];

const ISSUES = [
  { issue: "Missing date of birth", dim: "Completeness", count: 412, sev: "Medium" },
  { issue: "Invalid phone format", dim: "Validity", count: 267, sev: "Low" },
  { issue: "Location not normalized", dim: "Consistency", count: 867, sev: "Medium" },
  { issue: "Stale records (>180 days)", dim: "Freshness", count: 1840, sev: "High" },
  { issue: "Unresolved identity matches", dim: "Uniqueness", count: 51, sev: "High" },
];

function SparkLine({ data, color }: { data: number[]; color: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80, h = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <circle cx={pts.split(" ").at(-1)?.split(",")[0]} cy={pts.split(" ").at(-1)?.split(",")[1]}
        r="2.5" fill={color}/>
    </svg>
  );
}

function smoothAreaPath(values: number[], width: number, height: number) {
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * width,
    y: height - ((v - min) / range) * (height - 8) - 4,
  }));
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
    const cp1x = p1.x + (p2.x - p0.x) / 6, cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6, cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  const areaPath = `${d} L ${pts[pts.length - 1].x},${height} L ${pts[0].x},${height} Z`;
  return { linePath: d, areaPath, lastPoint: pts[pts.length - 1] };
}

function csvField(v: string | number) {
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const QUALITY_TOUR: TourStep[] = [
  { target: "[data-tour='health-reservoir']", title: "One number for 'is our data okay'", body: "This is the quickest way to check overall data health — if it's dropping, something upstream needs attention." },
  { target: "[data-tour='dimension-cards']", title: "Click a card to dig in", body: "Each card is a different way data can go wrong — missing fields, bad formats, duplicates, mismatches, or stale records. Click one to see exactly what's affected." },
];

export default function DataQuality() {
  const [selected, setSelected] = useState<number | null>(null);
  const [exported, setExported] = useState(false);
  const tour = useOnboarding("quality", QUALITY_TOUR);
  const { linePath, areaPath, lastPoint } = smoothAreaPath(TREND_30D, 600, 70);
  const detailRef = useRef<HTMLDivElement>(null);

  // When a dimension card is clicked, the response (the detail panel) can
  // land below the fold — scroll it into view instead of leaving the user
  // to notice nothing happened.
  useEffect(() => {
    if (selected !== null) detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selected]);

  const handleExport = () => {
    const header = ["Issue", "Dimension", "Records", "Severity"];
    const rows = ISSUES.map(r => [r.issue, r.dim, r.count, r.sev].map(csvField).join(","));
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    a.href = url;
    a.download = `plp-quality-issues-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 2600);
  };

  return (
    <div className="scrollable animate-in" style={{ padding: "28px", height: "100%", overflowY: "auto" }}>

      {exported && (
        <div className="glass" style={{
          position: "fixed", top: 16, right: 24, zIndex: 200, padding: "12px 18px",
          borderRadius: "var(--radius)", borderColor: "var(--teal)",
          display: "flex", alignItems: "center", gap: 10, animation: "fadeIn 0.3s both",
        }}>
          <span style={{ color: "var(--teal)", fontSize: 14 }}>✓</span>
          <span style={{ fontSize: 13, color: "var(--text)" }}>Exported {ISSUES.length} quality issues to CSV</span>
        </div>
      )}

      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
        <div>
          <div className="section-label" style={{ marginBottom: 6 }}>Data Quality Intelligence</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Overall Data Health</h1>
          <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-3)" }}>↑ 0.4 pts since last week</div>
          <div style={{ fontSize: 11, color: "var(--text-3)" }}>64,280 records audited</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div data-tour="health-reservoir">
            <GlassTank pct={91} color="var(--green)" colorLight="var(--teal)" />
          </div>
          <div className="section-label" style={{ marginTop: 8 }}>Health Reservoir</div>
        </div>
      </div>

      <div className="card" style={{ padding: "18px 20px", marginBottom: 20 }}>
        <div className="section-label" style={{ marginBottom: 12 }}>30-Day Health Trend</div>
        <svg width="100%" height="70" viewBox="0 0 600 70" preserveAspectRatio="none">
          <defs>
            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--green)" stopOpacity="0.25"/>
              <stop offset="100%" stopColor="var(--green)" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#trendGrad)" stroke="none" />
          <path d={linePath} fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
          <circle cx={lastPoint.x} cy={lastPoint.y} r="3.5" fill="var(--green)" />
        </svg>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: 10, color: "var(--text-4)" }}>Jul 22</span>
          <span style={{ fontSize: 10, color: "var(--text-4)" }}>Aug 21</span>
        </div>
      </div>

      {/* Was a raw inline gridTemplateColumns: "repeat(5,1fr)" — that inline
          style silently overrode .grid-quality-5's responsive breakpoints,
          so this row couldn't shrink to 3/2 columns on narrow screens. */}
      <div data-tour="dimension-cards" className="grid-quality-5" style={{ marginBottom: 24 }}>
        {DIMS.map((d, i) => (
          <div key={d.label} className="card" style={{
            padding: "16px",
            cursor: "pointer",
            border: selected === i ? `1px solid ${d.color}50` : "1px solid var(--border)",
            background: selected === i ? `${d.color}06` : "var(--bg3)",
            animation: `fadeIn 0.35s ${i * 0.07}s both`,
            transition: "all 0.15s",
          }} onClick={() => setSelected(selected === i ? null : i)}>
            <div className="section-label" style={{ marginBottom: 10 }}>{d.label}</div>
            <GlassTank pct={d.value} color={d.color} size="mini" />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
              <SparkLine data={TREND_DATA.map(v => v * (d.value / 91))} color={d.color} />
              <div style={{
                fontSize: 10, fontWeight: 700,
                color: d.trend.startsWith("+") ? "var(--green)" : d.trend.startsWith("-") ? "var(--magenta)" : "var(--text-3)",
              }}>{d.trend}</div>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>
              {d.issues.toLocaleString()} issues
            </div>
          </div>
        ))}
      </div>

      {selected !== null && (
        <div ref={detailRef} className="card" style={{
          padding: "20px 24px", marginBottom: 20,
          border: `1px solid ${DIMS[selected].color}30`,
          animation: "fadeIn 0.25s both",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: DIMS[selected].color }}>{DIMS[selected].label}</div>
            <div className="badge" style={{ background: `${DIMS[selected].color}15`, color: DIMS[selected].color }}>
              {DIMS[selected].issues.toLocaleString()} affected records
            </div>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-2)", margin: "0 0 16px" }}>{DIMS[selected].desc}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {["Scholarship", "Plus", "Vocational", "Tech"].slice(0,3).map((p, i) => (
              <div key={p} style={{ padding: "12px 14px", background: "var(--glass-highlight)",
                borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--text-2)" }}>{p}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: DIMS[selected].color }}>
                  {DIMS[selected].value - Math.floor(Math.random() * 8)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)",
          display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="section-label">Top Quality Issues</div>
          <button className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }} onClick={handleExport}>Export</button>
        </div>
        <div className="table-scroll">
          <div style={{ minWidth: 480 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 80px",
              padding: "10px 18px", borderBottom: "1px solid var(--border)" }}>
              {["Issue", "Dimension", "Records", "Severity"].map(h => (
                <div key={h} className="section-label">{h}</div>
              ))}
            </div>
            {ISSUES.map((r, i) => (
              <div key={i} className="table-row" style={{
                gridTemplateColumns: "1fr 100px 100px 80px",
                animation: `fadeIn 0.3s ${i * 0.07}s both`,
              }}>
                <span style={{ fontSize: 12, color: "var(--text-2)" }}>{r.issue}</span>
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>{r.dim}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{r.count.toLocaleString()}</span>
                <span className="badge" style={{
                  background: r.sev === "High" ? "var(--magenta-dim)" : r.sev === "Medium" ? "var(--amber-dim)" : "rgba(255,255,255,0.06)",
                  color: r.sev === "High" ? "var(--magenta)" : r.sev === "Medium" ? "var(--amber)" : "var(--text-3)",
                  fontSize: 9,
                }}>{r.sev}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <OnboardingTour {...tour} />
    </div>
  );
}
