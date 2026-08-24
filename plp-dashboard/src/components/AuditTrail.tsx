import { useState } from "react";
import { useOnboarding, OnboardingTour, type TourStep } from "./OnboardingTour";

const EVENTS = [
  { time: "10:42:18", date: "2026-08-21", event: "Record received", detail: "REC-SCH-00831 ingested from Scholarship source", type: "ingest", user: "system" },
  { time: "10:42:19", date: "2026-08-21", event: "Identity matching initiated", detail: "Comparing against 51,842 master identities", type: "ai", user: "PLP AI Engine" },
  { time: "10:42:19", date: "2026-08-21", event: "98.7% confidence match found", detail: "Matched with BEN-00127 — National ID, phone, DOB identical", type: "match", user: "PLP AI Engine" },
  { time: "10:42:20", date: "2026-08-21", event: "Merge approved", detail: "Auto-approved: confidence exceeds 98% threshold", type: "merge", user: "system" },
  { time: "10:42:20", date: "2026-08-21", event: "Master identity updated", detail: "BEN-00127 now includes REC-SCH-00831 as source", type: "update", user: "system" },
  { time: "09:15:04", date: "2026-08-21", event: "Data quality scan completed", detail: "64,280 records scanned. Overall health: 91%", type: "quality", user: "system" },
  { time: "08:00:00", date: "2026-08-21", event: "Daily ingestion started", detail: "Processing records from 4 program sources", type: "ingest", user: "system" },
  { time: "23:59:00", date: "2026-08-20", event: "Anomaly report generated", detail: "3 new anomaly clusters detected and flagged", type: "anomaly", user: "PLP AI Engine" },
  { time: "22:30:14", date: "2026-08-20", event: "Manual merge approved", detail: "Analyst approved merge for BEN-00891", type: "merge", user: "analyst@powerlearn.org" },
  { time: "18:12:30", date: "2026-08-20", event: "Records imported", detail: "1,284 new records from Tech program CSV export", type: "ingest", user: "data-team@powerlearn.org" },
];

const TYPE_COLORS: Record<string, string> = {
  ingest: "var(--primary)",
  ai: "#a78bfa",
  match: "var(--teal)",
  merge: "var(--green)",
  update: "var(--primary)",
  quality: "var(--amber)",
  anomaly: "var(--magenta)",
};

const TYPE_ICONS: Record<string, string> = {
  ingest: "↓", ai: "⚡", match: "≈", merge: "⊕", update: "✓", quality: "◎", anomaly: "△",
};

function csvField(v: string) {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function eventsToCsv(events: typeof EVENTS) {
  const header = ["Date", "Time", "Event", "Detail", "Type", "User"];
  const rows = events.map(e => [e.date, e.time, e.event, e.detail, e.type, e.user].map(csvField).join(","));
  return [header.join(","), ...rows].join("\n");
}

const AUDIT_TOUR: TourStep[] = [
  { target: "[data-tour='audit-controls']", title: "Search or take it with you", body: "Search filters the log by event, detail, or who did it. Export downloads exactly what you're currently looking at as a CSV." },
  { target: "[data-tour='audit-log']", title: "Every action, in order", body: "Every ingestion, match, merge, and quality scan lands here — grouped by day, newest first." },
];

export default function AuditTrail() {
  const [search, setSearch] = useState("");
  const [exported, setExported] = useState(false);
  const tour = useOnboarding("audit", AUDIT_TOUR);

  const filtered = EVENTS.filter(e => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return e.event.toLowerCase().includes(q) || e.detail.toLowerCase().includes(q) || e.user.toLowerCase().includes(q);
  });

  const grouped: Record<string, typeof EVENTS> = {};
  filtered.forEach(e => {
    if (!grouped[e.date]) grouped[e.date] = [];
    grouped[e.date].push(e);
  });

  const handleExport = () => {
    const csv = eventsToCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    a.href = url;
    a.download = `plp-audit-log-${stamp}.csv`;
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
          <span style={{ fontSize: 13, color: "var(--text)" }}>
            Exported {filtered.length} event{filtered.length === 1 ? "" : "s"} to CSV
          </span>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <div className="section-label" style={{ marginBottom: 6 }}>Audit Trail</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Identity Event Log</h1>
          <div data-tour="audit-controls" style={{ display: "flex", gap: 8 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search events…"
              style={{ width: 200, fontSize: 12, padding: "6px 10px" }}
            />
            <button className="btn btn-ghost" style={{ fontSize: 11, padding: "6px 12px" }} onClick={handleExport}>
              Export
            </button>
          </div>
        </div>
      </div>

      {Object.keys(grouped).length === 0 && (
        <div style={{ padding: "40px", textAlign: "center" }}>
          <div style={{ fontSize: 14, color: "var(--text-3)" }}>No events match your search.</div>
        </div>
      )}

      <div data-tour="audit-log">
        {Object.entries(grouped).map(([date, events]) => (
          <div key={date} style={{ marginBottom: 28 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: "var(--text-3)",
              letterSpacing: "0.06em", textTransform: "uppercase",
              marginBottom: 12, paddingBottom: 8,
              borderBottom: "1px solid var(--border)",
            }}>
              {date === "2026-08-21" ? "Today · " : "Yesterday · "}{date}
            </div>

            <div className="card table-scroll" style={{ overflow: "hidden" }}>
              <div style={{ minWidth: 560 }}>
                {events.map((ev, i) => (
                  <div key={i} style={{
                    display: "grid",
                    gridTemplateColumns: "80px 28px 1fr 140px",
                    gap: 12, padding: "11px 16px",
                    borderBottom: i < events.length - 1 ? "1px solid var(--border)" : "none",
                    alignItems: "start",
                    animation: `fadeIn 0.3s ${i * 0.05}s both`,
                    cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--glass-highlight)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}
                  >
                    <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "monospace",
                      paddingTop: 2, letterSpacing: "0.02em" }}>
                      {ev.time}
                    </div>
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: `${TYPE_COLORS[ev.type]}18`,
                      border: `1.5px solid ${TYPE_COLORS[ev.type]}40`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, color: TYPE_COLORS[ev.type],
                      flexShrink: 0,
                    }}>
                      {TYPE_ICONS[ev.type]}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>
                        {ev.event}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.4 }}>{ev.detail}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="badge" style={{
                        background: `${TYPE_COLORS[ev.type]}12`,
                        color: TYPE_COLORS[ev.type], fontSize: 9, marginBottom: 4,
                      }}>
                        {ev.type.charAt(0).toUpperCase() + ev.type.slice(1)}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-4)" }}>{ev.user}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <OnboardingTour {...tour} />
    </div>
  );
}
