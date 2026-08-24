import { useState, useEffect } from "react";
import { Icon } from "./icons";
import { useOnboarding, OnboardingTour, type TourStep } from "./OnboardingTour";
import { ChalkyDotMatrix, ChalkyBlockChart, GlassyTimeline, FlowSankey, IconGrid } from "./ChalkyVisuals";
import { GlassBar } from "./GlassBar";

function useCountUp(target: number, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(timer); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return val;
}

function AnimCounter({ n, suffix = "" }: { n: number; suffix?: string }) {
  const v = useCountUp(n);
  return <>{v.toLocaleString()}{suffix}</>;
}

const METRICS = [
  { label: "Source Records", value: 64280, suffix: "", color: "var(--primary)", note: "+1,284 today" },
  { label: "Trusted Identities", value: 51842, suffix: "", color: "var(--teal)", note: "↑ 98 new" },
  { label: "Pending Reviews", value: 11, suffix: "", color: "var(--amber)", note: "from 42 matches" },
  { label: "Data Health", value: 91, suffix: "%", color: "var(--green)", note: "↑ 0.4 pts" },
];

const PROGRAMS = [
  { name: "Scholarship", records: 18420, color: "var(--primary)", short: "SCH" },
  { name: "Plus", records: 14200, color: "#a78bfa", short: "PLU" },
  { name: "Vocational", records: 16940, color: "var(--teal)", short: "VOC" },
  { name: "Tech", records: 14720, color: "var(--amber)", short: "TEC" },
];

const DAILY_BRIEF = [
  { label: "Records processed", value: "1,284" },
  { label: "Potential duplicates", value: "42" },
  { label: "Auto-resolved", value: "31" },
  { label: "Require review", value: "11" },
  { label: "Anomaly clusters", value: "3" },
];

function IdentityGraphSVG({ onNodeClick }: { onNodeClick: () => void }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => setPhase(3), 2200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const nodes = [
    { id: "SCH", x: 100, y: 80, label: "Scholarship", color: "var(--primary)", r: 20 },
    { id: "TEC", x: 340, y: 80, label: "Tech", color: "var(--amber)", r: 20 },
    { id: "VOC", x: 100, y: 220, label: "Vocational", color: "var(--teal)", r: 20 },
    { id: "PLU", x: 340, y: 220, label: "Plus", color: "#a78bfa", r: 20 },
    { id: "MID", x: 220, y: 150, label: "MASTER", color: "var(--primary)", r: 30 },
    { id: "DUP1", x: 175, y: 110, label: "Dup A", color: "var(--secondary)", r: 12 },
    { id: "DUP2", x: 265, y: 110, label: "Dup B", color: "var(--secondary)", r: 12 },
  ];

  const edges = [
    { from: "SCH", to: "MID" }, { from: "TEC", to: "MID" },
    { from: "VOC", to: "MID" }, { from: "PLU", to: "MID" },
    { from: "DUP1", to: "MID" }, { from: "DUP2", to: "MID" },
    { from: "DUP1", to: "DUP2" },
  ];

  const getNode = (id: string) => nodes.find(n => n.id === id)!;

  return (
    <svg width="100%" height="300" viewBox="0 0 440 300" className="w-full" style={{ maxHeight: 300 }}>
      <defs>
        <filter id="glow-cyan">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0 0 L6 3 L0 6 z" fill="var(--primary)"/>
        </marker>
      </defs>

      {edges.map((e, i) => {
        const from = getNode(e.from);
        const to = getNode(e.to);
        const isDup = e.from === "DUP1" || e.from === "DUP2" || e.to === "DUP1" || e.to === "DUP2";
        return (
          <line key={i}
            x1={from.x} y1={from.y} x2={to.x} y2={to.y}
            stroke={isDup ? "var(--secondary)" : "var(--primary)"}
            strokeWidth={isDup ? 1.5 : 1}
            strokeDasharray={isDup ? "4 3" : "none"}
            strokeOpacity={isDup ? 0.6 : 0.25}
            style={{ opacity: phase >= 1 ? 1 : 0, transition: `opacity 0.5s ${i * 0.08}s` }}
          />
        );
      })}

      {nodes.map((node, i) => (
        <g key={node.id}
          style={{
            opacity: phase >= (node.id === "MID" ? 2 : 1) ? 1 : 0,
            transition: `opacity 0.4s ${i * 0.1}s, transform 0.4s`,
            transformOrigin: `${node.x}px ${node.y}px`,
            transform: phase >= 1 ? "scale(1)" : "scale(0.3)",
            cursor: node.id === "MID" ? "pointer" : "default",
          }}
          onClick={node.id === "MID" ? onNodeClick : undefined}
          filter={node.id === "MID" ? "url(#glow-cyan)" : undefined}
        >
          <circle cx={node.x} cy={node.y} r={node.r + (node.id === "MID" ? 2 : 0)}
            fill={`${node.color}18`} stroke={node.color} strokeWidth={node.id === "MID" ? 2 : 1.5}/>
          <text x={node.x} y={node.y + (node.id === "MID" ? 5 : 4)}
            textAnchor="middle" fill={node.color}
            fontSize={node.id === "MID" ? 9 : 8}
            fontFamily="Trebuchet MS" fontWeight="700" letterSpacing="0.05em">
            {node.id === "MID" ? "MASTER" : node.id}
          </text>
        </g>
      ))}
    </svg>
  );
}

const OVERVIEW_TOUR: TourStep[] = [
  { target: "[data-tour='metrics']", title: "Your daily snapshot", body: "These four numbers are the fastest way to check on the program each morning — how many records came in, how many identities are trusted, and what still needs a human look." },
  { target: "[data-tour='resolve-queue']", title: "Jump straight to reviews", body: "When something needs a decision, this button takes you straight to the review queue instead of hunting through the menu." },
  { target: "[data-tour='visuals']", title: "See where things stand", body: "These charts track the same things staff ask about most: match confidence, program flow, recent activity, and open issues." },
];

export default function Overview({ onNavigate }: { onNavigate: (view: string) => void }) {
  const [showToast, setShowToast] = useState(false);
  const tour = useOnboarding("overview", OVERVIEW_TOUR);

  const handleMerge = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="scrollable animate-in" style={{ padding: "32px 48px", height: "100%", overflowY: "auto" }}>
      {showToast && (
        <div className="glass" style={{ position: "fixed", top: 16, right: 24, zIndex: 200, padding: "12px 18px", borderRadius: "var(--radius)", borderColor: "var(--teal)", display: "flex", alignItems: "center", gap: 10, animation: "fadeIn 0.3s both" }}>
          <span style={{ color: "var(--teal)", fontSize: 14 }}>✓</span>
          <span style={{ fontSize: 13, color: "var(--text)" }}>Identity merged successfully</span>
        </div>
      )}

      <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="section-label" style={{ marginBottom: 6 }}>Beneficiary Intelligence</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>Identity Command Center</h1>
          <p style={{ fontSize: 14, color: "var(--text-2)", margin: "6px 0 0" }}>Unified intelligence across the four PLP programs.</p>
        </div>
        <button data-tour="resolve-queue" className="btn btn-primary" style={{ fontSize: 13, padding: "10px 20px" }} onClick={() => onNavigate("duplicate")}>
          <Icon.Merge /> Resolve Queue
        </button>
      </div>

      <div data-tour="metrics" className="grid-metrics" style={{ marginBottom: 24 }}>
        {METRICS.map((m, i) => (
          <div key={m.label} className="card" style={{ padding: "20px 24px", animation: `fadeIn 0.4s ${i * 0.08}s both` }}>
            <div className="section-label" style={{ marginBottom: 12 }}>{m.label}</div>
            <div className="metric-value" style={{ color: m.color, animationDelay: `${i * 0.08 + 0.2}s` }}>
              <AnimCounter n={m.value} suffix={m.suffix} />
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-3)" }}>{m.note}</div>
          </div>
        ))}
      </div>

      <div className="grid-hero" style={{ marginBottom: 24 }}>
        <div className="card" style={{ padding: "20px 24px" }}>
          <div className="section-label" style={{ marginBottom: 6 }}>Live Identity Graph</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Master Identity Network</div>
          <div className="graph-3d-wrap">
            <IdentityGraphSVG onNodeClick={() => onNavigate("beneficiary")} />
          </div>
        </div>
        <div className="card" style={{ padding: "20px" }}>
          <div className="section-label" style={{ marginBottom: 10 }}>Today's Intelligence</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)", marginBottom: 14, background: "var(--primary-dim)", padding: "8px 12px", borderRadius: "var(--radius-sm)" }}>
            Aug 21, 2026 · 07:30 EAT
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {DAILY_BRIEF.map((item, i) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: "var(--radius-sm)", background: "var(--glass-highlight)", animation: `fadeIn 0.3s ${i * 0.07}s both` }}>
                <span style={{ fontSize: 12, color: "var(--text-2)" }}>{item.label}</span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{item.value}</span>
              </div>
            ))}
          </div>
          <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "center", borderColor: "var(--amber)", color: "var(--amber)" }} onClick={() => onNavigate("duplicate")}>
            Open Resolution Queue <Icon.ArrowRight />
          </button>
        </div>
      </div>

      {/* Spacious Business Intelligence Visuals */}
      <div data-tour="visuals" className="section-label" style={{ marginBottom: 16, fontSize: 14, fontWeight: 800, color: "var(--text)" }}>
        Business Intelligence Visuals
      </div>
      <div className="grid-2col" style={{ marginBottom: 24 }}>
        <div className="card"><ChalkyDotMatrix /></div>
        <div className="card"><FlowSankey /></div>
      </div>
      <div className="grid-2col" style={{ marginBottom: 24 }}>
        <div className="card"><GlassyTimeline /></div>
        <div className="card"><ChalkyBlockChart /></div>
      </div>
      <div className="card" style={{ marginBottom: 24 }}>
        <IconGrid onNavigate={onNavigate} />
      </div>

      <div className="card" style={{ padding: "20px 24px" }}>
        <div className="section-label" style={{ marginBottom: 12 }}>Cross-Program Intelligence</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {PROGRAMS.map((p, i) => {
            const pct = Math.round((p.records / 64280) * 100);
            return (
              <div key={p.name} style={{ animation: `fadeIn 0.4s ${i * 0.1}s both` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 14, color: "var(--text-2)", fontWeight: 600 }}>{p.name}</span>
                  <span style={{ fontSize: 14, color: p.color, fontWeight: 700 }}>{p.records.toLocaleString()}</span>
                </div>
                <GlassBar pct={pct} color={p.color} />
              </div>
            );
          })}
        </div>
      </div>

      <OnboardingTour {...tour} />
    </div>
  );
}
