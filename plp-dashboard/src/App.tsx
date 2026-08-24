import { useState, useEffect, useCallback, useRef } from "react";
import { Icon } from "./components/icons";
import Overview from "./components/Overview";
import DuplicateResolution from "./components/DuplicateResolution";
import Beneficiary360 from "./components/Beneficiary360";
import DataQuality from "./components/DataQuality";
import ChatWidget from "./components/ChatWidget";
import Anomalies from "./components/Anomalies";
import AuditTrail from "./components/AuditTrail";
import IdentityExplorer from "./components/IdentityExplorer";
import { toursEnabled, setToursEnabled, restartCurrentTour } from "./components/tourSettings";
import { useClickOutside } from "./components/useClickOutside";
import { useSettings, setSettings } from "./components/settingsStore";
import { useOnboarding, OnboardingTour, type TourStep } from "./components/OnboardingTour";


type View = "overview" | "identity" | "duplicate" | "quality" | "beneficiary" | "anomalies" | "audit" | "sources" | "settings";

const VALID_VIEWS: View[] = ["overview", "identity", "duplicate", "quality", "beneficiary", "anomalies", "audit", "sources", "settings"];

const NAV_ITEMS: { id: View; label: string; icon: keyof typeof Icon; badge?: string }[] = [
  { id: "overview", label: "Overview", icon: "Overview" },
  { id: "identity", label: "Identity Explorer", icon: "Identity" },
  { id: "duplicate", label: "Possible Duplicates", icon: "Duplicate", badge: "11" },
  { id: "quality", label: "Data Quality", icon: "Quality" },
  { id: "beneficiary", label: "Beneficiary Profile", icon: "Beneficiary" },
  { id: "anomalies", label: "Unusual Activity", icon: "Anomaly", badge: "3" },
  { id: "audit", label: "Activity Log", icon: "Audit" },
  { id: "sources", label: "Data Sources", icon: "DataSources" },
  { id: "settings", label: "Settings", icon: "Config" },
];

const VIEW_LABELS: Record<View, string> = {
  overview: "Overview", identity: "Identity Explorer", duplicate: "Possible Duplicates",
  quality: "Data Quality", beneficiary: "Beneficiary Profile",
  anomalies: "Unusual Activity", audit: "Activity Log", sources: "Data Sources", settings: "Settings",
};

const SOURCES_TOUR: TourStep[] = [
  { target: "[data-tour='ingestion-arch']", title: "How data flows through the system", body: "Click any stage to see what it does and its current throughput — from raw source data all the way to what you see in this console." },
  { target: "[data-tour='source-cards']", title: "Where your data actually comes from", body: "Each card is one connected system. Click Configure Source on any of them to upload files or set up a database connection." },
];

// Reads/writes window.location.hash so views are shareable URLs and the
// browser back/forward buttons work, without adding a router dependency.
function parseViewFromHash(): View {
  const raw = window.location.hash.replace(/^#\/?/, "") as View;
  return VALID_VIEWS.includes(raw) ? raw : "overview";
}

function DashboardFooter() {
  return (
    <div style={{ borderTop: "1px solid var(--border)", padding: "32px 48px 40px", background: "var(--bg)", flexShrink: 0 }}>
      <div className="grid-metrics" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: "40px", marginBottom: "32px" }}>
        <div>
          <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)", marginBottom: "16px" }}>Choose & Buy</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", color: "var(--text-2)" }}>
            <span style={{ cursor: "pointer" }}>Data Sources</span>
            <span style={{ cursor: "pointer" }}>Quality Dimensions</span>
            <span style={{ cursor: "pointer" }}>Identity Explorer</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)", marginBottom: "16px" }}>Contact & Info</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", color: "var(--text-2)" }}>
            <span style={{ cursor: "pointer" }}>Support Desk</span>
            <span style={{ cursor: "pointer" }}>API Documentation</span>
            <span style={{ cursor: "pointer" }}>Data Governance</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)", marginBottom: "16px" }}>Assistance & Services</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", color: "var(--text-2)" }}>
            <span style={{ cursor: "pointer" }}>AI Copilot Help</span>
            <span style={{ cursor: "pointer" }}>Anomaly Resolution</span>
            <span style={{ cursor: "pointer" }}>General Inquiries</span>
          </div>
        </div>
      </div>
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "24px", fontSize: "12px", color: "var(--text-3)" }}>
        © 2026 Power Learn Project. All rights reserved.
      </div>
    </div>
  );
}

const STAGE_DETAIL: Record<string, { desc: string; stat: string }> = {
  "Data Source":      { desc: "Raw records as they arrive from each program system.", stat: "64,280 records/day" },
  "Ingestion Layer":   { desc: "Pulls files and DB rows on schedule, queues them for processing.", stat: "4 active connectors" },
  "Normalization":     { desc: "Standardizes names, phone formats, and dates across sources.", stat: "96% fields normalized" },
  "Identity Engine":   { desc: "Scores every pair of records and clusters likely matches.", stat: "51,842 trusted identities" },
  "Unified Layer":     { desc: "Stores one master record per person, versioned and auditable.", stat: "99.1% avg. confidence" },
  "Frontend":          { desc: "This console — everything above surfaces here for review.", stat: "9 live views" },
};

function SourceConnectModal({ source, onClose }: { source: { name: string; type: string }; onClose: () => void }) {
  const isFile = source.type.includes("CSV") || source.type.includes("Excel");
  const [files, setFiles] = useState<string[]>([]);
  const [form, setForm] = useState({ host: "", port: "", database: "", username: "" });
  const [testing, setTesting] = useState<"idle" | "testing" | "ok">("idle");

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}>
      <div className="card animate-in" style={{ padding: 24, width: "min(420px, 90vw)" }} onClick={e => e.stopPropagation()}>
        <div className="section-label" style={{ marginBottom: 4 }}>Configure Source</div>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>{source.name}</h3>

        {isFile ? (
          <div>
            <label className="btn btn-ghost" style={{ width: "100%", justifyContent: "center", cursor: "pointer" }}>
              Upload files
              <input type="file" multiple accept={source.type.includes("CSV") ? ".csv" : ".xlsx,.xls"} style={{ display: "none" }}
                onChange={e => setFiles(Array.from(e.target.files ?? []).map(f => f.name))} />
            </label>
            {files.length > 0 && (
              <ul style={{ marginTop: 12, fontSize: 12, color: "var(--text-2)", paddingLeft: 18 }}>
                {files.map(f => <li key={f}>{f}</li>)}
              </ul>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(["host", "port", "database", "username"] as const).map(field => (
              <input key={field} placeholder={field[0].toUpperCase() + field.slice(1)} value={form[field]}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
            ))}
            <button className="btn btn-ghost" onClick={() => { setTesting("testing"); setTimeout(() => setTesting("ok"), 900); }}>
              {testing === "testing" ? "Testing…" : testing === "ok" ? "✓ Connection OK" : "Test Connection"}
            </button>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={onClose}>Save</button>
        </div>
      </div>
    </div>
  );
}

function DataSources() {
  const sources = [
    { name: "Scholarship DB", type: "PostgreSQL", records: 18420, status: "Connected", health: 96, lastSync: "2 min ago", color: "var(--primary)" },
    { name: "Plus CSV Import", type: "CSV / Pandas", records: 14200, status: "Connected", health: 88, lastSync: "14 min ago", color: "var(--violet)" },
    { name: "Vocational Excel", type: "Excel / Pandas", records: 16940, status: "Connected", health: 91, lastSync: "1 min ago", color: "var(--teal)" },
    { name: "Tech Program DB", type: "MySQL", records: 14720, status: "Warning", health: 74, lastSync: "2 hrs ago", color: "var(--amber)" },
  ];
  const stages = ["Data Source", "Ingestion Layer", "Normalization", "Identity Engine", "Unified Layer", "Frontend"];
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [configuring, setConfiguring] = useState<typeof sources[number] | null>(null);
  const tour = useOnboarding("sources", SOURCES_TOUR);

  return (
    <div className="scrollable animate-in" style={{ padding: "40px 48px", height: "100%", overflowY: "auto" }}>
      <div style={{ marginBottom: "32px" }}>
        <div className="section-label" style={{ marginBottom: "8px" }}>Data Sources</div>
        <h1 style={{ fontSize: "32px", fontWeight: 800, margin: 0, color: "var(--text)" }}>Source Architecture</h1>
      </div>

      <div className="callout-note">
        <div className="callout-note-title"><span>ℹ️</span> Note</div>
        <p style={{ margin: 0, lineHeight: 1.6, fontSize: 14 }}>Ensure all ingestion processes are run before performing identity matching.</p>
      </div>

      <div data-tour="ingestion-arch" className="card" style={{ padding: "24px", marginBottom: "24px" }}>
        <div className="section-label" style={{ marginBottom: "16px" }}>Ingestion Architecture</div>
        <div className="hscroll" style={{ display: "flex", alignItems: "center", gap: "12px", paddingBottom: "8px" }}>
          {stages.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => setActiveStage(s)} style={{
                padding: "10px 16px", background: activeStage === s ? "var(--primary-dim)" : "var(--bg2)",
                border: `1px solid ${activeStage === s ? "var(--primary)" : "var(--border)"}`,
                fontSize: "12px", fontWeight: 600, color: activeStage === s ? "var(--primary)" : "var(--text-2)",
                whiteSpace: "nowrap", borderRadius: "var(--radius-sm)", cursor: "pointer", fontFamily: "inherit",
              }}>{s}</button>
              {i < stages.length - 1 && <span style={{ color: "var(--text-3)", fontSize: "18px" }}>→</span>}
            </div>
          ))}
        </div>
        {activeStage && (
          <div className="animate-in" style={{ marginTop: 16, padding: "14px 16px", background: "var(--glass-highlight)", borderRadius: "var(--radius-sm)" }}>
            <div style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 4 }}>{STAGE_DETAIL[activeStage].desc}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>{STAGE_DETAIL[activeStage].stat}</div>
          </div>
        )}
      </div>

      <div data-tour="source-cards" className="grid-2col">
        {sources.map((s, i) => (
          <div key={s.name} className="card" style={{ padding: "24px", border: `1px solid ${s.status === "Warning" ? "var(--amber)" : "var(--border)"}`, animation: `fadeIn 0.35s ${i * 0.08}s both` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: s.color }}>{s.name}</div>
                <div style={{ fontSize: "12px", color: "var(--text-3)" }}>{s.type}</div>
              </div>
              <div className="badge" style={{ background: s.status === "Connected" ? "var(--green-dim)" : "var(--amber-dim)", color: s.status === "Connected" ? "var(--green)" : "var(--amber)" }}>
                <span style={{ fontSize: 8, animation: "live-dot 1.5s infinite" }}>●</span>{s.status}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
              <div><div className="section-label">Records</div><div style={{ fontSize: "18px", fontWeight: 700 }}>{s.records.toLocaleString()}</div></div>
              <div><div className="section-label">Health</div><div style={{ fontSize: "18px", fontWeight: 700, color: s.health >= 90 ? "var(--green)" : "var(--amber)" }}>{s.health}%</div></div>
              <div><div className="section-label">Last Sync</div><div style={{ fontSize: "12px", color: "var(--text-3)" }}>{s.lastSync}</div></div>
            </div>
            <div className="confidence-bar" style={{ marginTop: "16px" }}>
              <div className="confidence-fill" style={{ width: `${s.health}%`, background: s.color, "--pct": `${s.health}%` } as React.CSSProperties}/>
            </div>
            <button className="btn btn-ghost" style={{ marginTop: 16, width: "100%", justifyContent: "center", fontSize: 12 }}
              onClick={() => setConfiguring(s)}>
              Configure Source
            </button>
          </div>
        ))}
      </div>

      {configuring && <SourceConnectModal source={configuring} onClose={() => setConfiguring(null)} />}
      <OnboardingTour {...tour} />
    </div>
  );
}

function SettingsView() {
  const s = useSettings();
  const [local, setLocal] = useState(s);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Stay in sync if settings change elsewhere, without fighting an
  // in-progress drag on this page.
  useEffect(() => { setLocal(s); }, [s]);

  // Slider drag updates the visible number/thumb instantly (local state),
  // but writing to the global store — which triggers every useSettings()
  // consumer app-wide to re-render, plus a full-page zoom reflow for
  // fontScale — is debounced so it only fires shortly after the user stops
  // moving the slider, not on every pixel of drag.
  const commit = (patch: Partial<typeof s>, key: string, delay: number) => {
    setLocal(l => ({ ...l, ...patch }));
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => setSettings(patch), delay);
  };

  const thresholdRows = [
    { key: "autoMergeAbove" as const, label: "Combine automatically above", color: "var(--green)" },
    { key: "reviewAbove" as const, label: "Ask someone to check above", color: "var(--amber)" },
    { key: "separateBelow" as const, label: "Treat as different people below", color: "var(--red)" },
  ];

  return (
    <div className="scrollable animate-in" style={{ padding: "40px 48px", height: "100%", overflowY: "auto" }}>
      <div className="section-label" style={{ marginBottom: "8px" }}>Settings</div>
      <h1 style={{ fontSize: "32px", fontWeight: 800, margin: "0 0 32px" }}>Settings</h1>

      <div className="callout">
        <div className="callout-title"><span>📌</span> Important</div>
        <p style={{ margin: 0, lineHeight: 1.6, fontSize: 14 }}>These rules control what the assistant decides to flag for you automatically versus asking a person to check.</p>
      </div>
      <div className="card" style={{ padding: "24px", marginBottom: "24px" }}>
        <div className="section-label" style={{ marginBottom: "16px" }}>When to Combine Records</div>
        {thresholdRows.map(item => (
          <div key={item.key} style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "14px", color: "var(--text-2)" }}>{item.label}</span>
              <span style={{ fontSize: "14px", fontWeight: 800, color: item.color }}>{local[item.key]}%</span>
            </div>
            <input type="range" min={0} max={100} value={local[item.key]}
              onChange={e => commit({ [item.key]: Number(e.target.value) }, item.key, 120)}
              style={{ width: "100%" }} />
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: "24px" }}>
        <div className="section-label" style={{ marginBottom: "16px" }}>Display</div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 8 }}>Text size — {Math.round(local.fontScale * 100)}%</div>
          <input type="range" min={0.85} max={1.2} step={0.05} value={local.fontScale}
            onChange={e => commit({ fontScale: Number(e.target.value) }, "fontScale", 60)} style={{ width: "100%" }} />
        </div>
        <div>
          <div style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 8 }}>Text weight</div>
          <select value={local.fontWeight} onChange={e => commit({ fontWeight: Number(e.target.value) }, "fontWeight", 0)}>
            <option value={400}>Regular</option>
            <option value={600}>Medium</option>
            <option value={800}>Bold</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setViewState] = useState<View>(() => (typeof window !== "undefined" ? parseViewFromHash() : "overview"));
  const [collapsed, setCollapsed] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 768 : false));
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 768 : false));
  const [helpOpen, setHelpOpen] = useState(false);
  const [toursOn, setToursOn] = useState(() => (typeof window !== "undefined" ? toursEnabled() : true));
  const notifRef = useRef<HTMLDivElement>(null!);
  const helpRef = useRef<HTMLDivElement>(null!);

  useClickOutside(notifRef, () => setNotifOpen(false), notifOpen);
  useClickOutside(helpRef, () => setHelpOpen(false), helpOpen);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Keep the URL hash in sync with the active view, and respond to
  // back/forward navigation or a hand-typed hash.
  useEffect(() => {
    const onHashChange = () => setViewState(parseViewFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const setView = useCallback((v: View) => {
    setViewState(v);
    window.location.hash = `/${v}`;
    if (window.innerWidth < 768) setCollapsed(true); // auto-close overlay nav on mobile after choosing a page
  }, []);

  const navigate = (v: string) => setView(v as View);

  const renderView = () => {
    switch (view) {
      case "overview": return <Overview onNavigate={navigate} />;
      case "identity": return <IdentityExplorer onSelectBen={() => setView("beneficiary")} />;
      case "duplicate": return <DuplicateResolution onNavigate={navigate} />;
      case "quality": return <DataQuality />;
      case "beneficiary": return <Beneficiary360 />;
      case "anomalies": return <Anomalies />;
      case "audit": return <AuditTrail />;
      case "sources": return <DataSources />;
      case "settings": return <SettingsView />;
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg)", overflow: isMobile ? "visible" : "hidden" }}>

      {/* Mobile backdrop: tapping outside the open nav closes it */}
      {isMobile && !collapsed && (
        <div
          onClick={() => setCollapsed(true)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 30 }}
        />
      )}

      {/* 3D Box Sidebar */}
      <nav className="sidebar-3d" style={{ width: collapsed ? 60 : "var(--sidebar-w)", height: "100%", display: "flex", flexDirection: "column", flexShrink: 0, transition: "width 0.3s var(--ease-out)", overflow: "hidden" }}>
        
        {/* Logo */}
        <div style={{ padding: "16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: "var(--header-h)" }}>
          {!collapsed && (
            <div style={{ fontSize: "16px", fontWeight: 900, color: "var(--primary)", letterSpacing: "-0.02em" }}>
              POWER<span style={{ color: "var(--text)" }}>LEARN</span>
            </div>
          )}
          <button onClick={() => setCollapsed(c => !c)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)" }}>
            <Icon.Collapse />
          </button>
        </div>

        {/* 3D Boxed Navigation Menu */}
        <div className="menu-box" style={{ margin: "16px", padding: "4px", flex: 1, overflowY: "auto" }}>
          {NAV_ITEMS.map(item => {
            const IconComp = Icon[item.icon] as () => React.ReactElement;
            const active = view === item.id;
            return (
              <button key={item.id} onClick={() => setView(item.id)} title={collapsed ? item.label : undefined}
                className={`menu-item ${active ? "active" : ""}`}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: "12px",
                  padding: "12px", cursor: "pointer", fontFamily: "inherit", fontSize: "13px",
                  fontWeight: active ? 800 : 500, textAlign: "left",
                  color: active ? "var(--primary)" : "var(--text-2)",
                  border: "none", background: "transparent",
                }}>
                <span style={{ width: "20px", display: "flex", justifyContent: "center" }}><IconComp /></span>
                {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                {!collapsed && item.badge && <span style={{ background: "var(--primary)", color: "#fff", padding: "2px 8px", borderRadius: "12px", fontSize: "10px" }}>{item.badge}</span>}
              </button>
            );
          })}
        </div>

        {/* Theme Toggle Beneath Dashboard Menu */}
        <div style={{ padding: "12px", borderTop: "1px solid var(--border)" }}>
          <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="btn btn-ghost" style={{ width: "100%", justifyContent: "center" }}>
            {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>
        </div>
      </nav>

      {/* Main Layout */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        
        {/* Header */}
        <header style={{ height: "var(--header-h)", display: "flex", alignItems: "center", padding: "0 16px", borderBottom: "1px solid var(--border)", background: "var(--bg)", gap: 12, flexShrink: 0, flexWrap: "wrap" }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-3)', minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <span style={{ color: 'var(--text-2)' }}>Dashboard</span>
            <span style={{ fontSize: 12 }}>›</span>
            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{VIEW_LABELS[view]}</span>
          </div>

          <div style={{ flex: 1 }} />

          {searchOpen ? (
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-3)" }}><Icon.Search /></span>
              <input autoFocus value={searchVal} onChange={e => setSearchVal(e.target.value)} onBlur={() => { setSearchOpen(false); setSearchVal(""); }} placeholder="Search identities…" style={{ paddingLeft: 36, width: "min(240px, 50vw)" }} />
            </div>
          ) : (
            <button className="btn btn-ghost" style={{ padding: "6px 12px", gap: 6 }} onClick={() => setSearchOpen(true)}>
              <Icon.Search /><span style={{ fontSize: 13 }}>Search</span>
            </button>
          )}
          <div ref={helpRef} style={{ position: "relative" }}>
            <button className="btn btn-ghost" style={{ padding: "6px 12px" }} onClick={() => setHelpOpen(o => !o)}>
              <Icon.Help />
            </button>
            {helpOpen && (
              <div className="glass" style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: "min(260px, 90vw)", zIndex: 100, border: "1px solid var(--border)", background: "var(--bg)", boxShadow: "var(--shadow)", padding: 16 }}>
                <div className="section-label" style={{ marginBottom: 12 }}>Product Tour</div>
                <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, color: "var(--text-2)", cursor: "pointer", marginBottom: 14 }}>
                  Show onboarding tours
                  <input
                    type="checkbox"
                    checked={toursOn}
                    onChange={e => { setToursOn(e.target.checked); setToursEnabled(e.target.checked); }}
                  />
                </label>
                <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "center", fontSize: 12 }}
                  onClick={() => { restartCurrentTour(); setHelpOpen(false); }}>
                  Replay tour for this page
                </button>
              </div>
            )}
          </div>
          <div ref={notifRef} style={{ position: "relative" }}>
            <button className="btn btn-ghost" style={{ padding: "6px 12px", position: "relative" }} onClick={() => setNotifOpen(o => !o)}>
              <Icon.Bell />
              <span style={{ position: "absolute", top: 5, right: 6, width: 6, height: 6, borderRadius: "50%", background: "var(--primary)" }}/>
            </button>
            {notifOpen && (
              <div className="glass" style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: "min(300px, 90vw)", zIndex: 100, border: "1px solid var(--border)", background: "var(--bg)", boxShadow: "var(--shadow)" }}>
                <div style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}><div className="section-label">Notifications</div></div>
                {[{ msg: "11 identity matches await review", color: "var(--amber)", time: "2 min ago" }, { msg: "3 anomaly clusters detected", color: "var(--primary)", time: "18 min ago" }, { msg: "Daily ingestion completed: 1,284 records", color: "var(--teal)", time: "1 hr ago" }].map((n, i) => (
                  <div key={i} style={{ padding: "16px", borderBottom: "1px solid var(--border)", cursor: "pointer" }} onMouseEnter={e => (e.currentTarget.style.background = "var(--bg2)")} onMouseLeave={e => (e.currentTarget.style.background = "")}>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: n.color, flexShrink: 0, marginTop: 4 }}/>
                      <div><div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.4 }}>{n.msg}</div><div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{n.time}</div></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 12px", border: "1px solid var(--border)", background: "var(--bg)", cursor: "pointer" }}>
            <div style={{ width: 28, height: 28, background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>A</div>
            <span style={{ fontSize: 13, color: "var(--text-2)", display: isMobile ? "none" : "inline" }}>Admin</span>
          </div>
        </header>

        {/* Scrollable Area with Footer at bottom */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          <div key={view} className="page-transition" style={{ flex: 1 }}>
            {renderView()}
          </div>
          
          <DashboardFooter />
        </div>
      </div>

      {/* Persistent assistant — available from every page, not a menu item */}
      <ChatWidget />
    </div>
  );
}
