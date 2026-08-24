import { useState } from "react";
import { useOnboarding, OnboardingTour, type TourStep } from "./OnboardingTour";

const ANOMALIES = [
  {
    id: "ANO-001",
    title: "7 beneficiaries share the same phone number",
    detail: "+254 700 123 456 appears across 7 distinct records in 3 different programs. This may indicate a data entry error, a shared contact number (guardian), or a possible identity issue requiring verification.",
    level: "Anomaly",
    program: "Cross-program",
    detected: "2026-08-21 06:12",
    records: ["REC-SCH-00140", "REC-TEC-00082", "REC-VOC-00311", "REC-PLU-00227", "REC-SCH-00412", "REC-TEC-00519", "REC-VOC-00087"],
    color: "var(--magenta)",
  },
  {
    id: "ANO-002",
    title: "Unusual duplicate cluster detected",
    detail: "A cluster of 14 records in Vocational shows unusually high mutual similarity scores (>85%). This pattern may represent a bulk data import issue where similar records were created for the same individuals.",
    level: "Anomaly",
    program: "Vocational",
    detected: "2026-08-20 22:41",
    records: ["REC-VOC-00201", "REC-VOC-00202", "REC-VOC-00203"],
    color: "var(--magenta)",
  },
  {
    id: "ANO-003",
    title: "Potential identity conflict: 3 records",
    detail: "Three records have identical National IDs but different names and dates of birth. This likely represents a data entry error or a mismatched ID. A human reviewer should compare the original registration documents.",
    level: "Review",
    program: "Scholarship",
    detected: "2026-08-21 01:35",
    records: ["REC-SCH-00731", "REC-SCH-00732", "REC-SCH-00733"],
    color: "var(--amber)",
  },
  {
    id: "ANO-004",
    title: "Spike in new registrations from one location",
    detail: "108 new registrations from 'Mombasa, Port Area' were ingested in a 2-hour window. This is 3.4× above the normal hourly rate for this location. Likely a legitimate batch upload but worth verifying the source.",
    level: "Review",
    program: "Plus",
    detected: "2026-08-20 14:20",
    records: [],
    color: "var(--amber)",
  },
  {
    id: "ANO-005",
    title: "Name normalization resolved 412 variants",
    detail: "The AI engine has normalized 412 name variations that were causing false-negative duplicate detection. Common patterns: 'Wanjiru/Wanjiku', 'Otieno/Odhiambo', hyphenated surnames.",
    level: "Normal",
    program: "All programs",
    detected: "2026-08-21 03:00",
    records: [],
    color: "var(--green)",
  },
];

const ANOMALIES_TOUR: TourStep[] = [
  { target: "[data-tour='anomaly-severity']", title: "Three severity levels", body: "Anomaly needs attention now, Review is worth a second look, and Normal just confirms the engine caught and resolved something on its own." },
  { target: "[data-tour='anomaly-list']", title: "Click any signal to dig in", body: "Each card opens the evidence behind it — what the engine noticed, and which records are affected." },
];

export default function Anomalies() {
  const [selected, setSelected] = useState<typeof ANOMALIES[0] | null>(null);
  const tour = useOnboarding("anomalies", ANOMALIES_TOUR);

  return (
    <div className="animate-in" style={{ height: "100%", display: "flex", flexWrap: "wrap" }}>

      <div className="scrollable" style={{
        width: selected ? 360 : "100%", minWidth: 280, flexShrink: 0, flexGrow: selected ? 0 : 1,
        padding: "28px 20px 28px 28px",
        overflowY: "auto",
        borderRight: selected ? "1px solid var(--border)" : "none",
        transition: "width 0.3s var(--ease-out)",
      }}>
        <div style={{ marginBottom: 20 }}>
          <div className="section-label" style={{ marginBottom: 6 }}>Anomaly Intelligence</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Anomaly Signals</h1>
          <p style={{ fontSize: 13, color: "var(--text-2)", margin: "6px 0 0" }}>
            Unusual identity and data patterns detected by the AI engine.
          </p>
        </div>

        <div data-tour="anomaly-severity" style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {[
            { label: "Anomaly", count: 2, color: "var(--magenta)" },
            { label: "Review", count: 2, color: "var(--amber)" },
            { label: "Normal", count: 1, color: "var(--green)" },
          ].map(s => (
            <div key={s.label} style={{
              padding: "6px 12px", borderRadius: "var(--radius-sm)",
              background: `${s.color}10`, border: `1px solid ${s.color}25`,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ fontSize: 9, color: s.color }}>●</span>
              <span style={{ fontSize: 11, color: s.color, fontWeight: 700 }}>{s.label}</span>
              <span style={{ fontSize: 11, color: "var(--text-3)" }}>{s.count}</span>
            </div>
          ))}
        </div>

        <div data-tour="anomaly-list" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ANOMALIES.map((a, i) => (
            <div key={a.id} className="card" style={{
              padding: "16px 18px",
              cursor: "pointer",
              border: selected?.id === a.id ? `1px solid ${a.color}40` : `1px solid var(--border)`,
              background: selected?.id === a.id ? `${a.color}05` : "var(--bg3)",
              animation: `fadeIn 0.35s ${i * 0.07}s both`,
              animationName: a.level === "Anomaly" ? "anomaly-pulse, fadeIn" : "fadeIn",
              animationDuration: a.level === "Anomaly" ? "3s, 0.35s" : "0.35s",
              animationTimingFunction: a.level === "Anomaly" ? "ease-in-out, var(--ease-out)" : "var(--ease-out)",
              animationIterationCount: a.level === "Anomaly" ? "infinite, 1" : "1",
              animationDelay: a.level === "Anomaly" ? `${i * 1.2}s, ${i * 0.07}s` : `${i * 0.07}s`,
              transition: "all 0.15s",
            }} onClick={() => setSelected(selected?.id === a.id ? null : a)}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span className="badge" style={{ background: `${a.color}15`, color: a.color, fontSize: 9 }}>
                  {a.level}
                </span>
                <span style={{ fontSize: 10, color: "var(--text-4)" }}>{a.program}</span>
                <span style={{ fontSize: 10, color: "var(--text-4)", marginLeft: "auto" }}>{a.id}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 6, lineHeight: 1.4 }}>
                {a.title}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-3)" }}>{a.detected}</div>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div className="scrollable animate-in" style={{ flex: 1, minWidth: 260, padding: "28px 24px", overflowY: "auto" }}>
          <button className="btn btn-ghost" style={{ fontSize: 11, marginBottom: 16 }}
            onClick={() => setSelected(null)}>← Back</button>

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span className="badge" style={{ background: `${selected.color}15`, color: selected.color }}>
                {selected.level}
              </span>
              <span style={{ fontSize: 11, color: "var(--text-3)" }}>{selected.id}</span>
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 8px" }}>{selected.title}</h2>
            <div style={{ fontSize: 11, color: "var(--text-3)" }}>Detected: {selected.detected}</div>
          </div>

          <div className="card" style={{ padding: "16px 18px", marginBottom: 16,
            borderColor: `${selected.color}25` }}>
            <div className="section-label" style={{ marginBottom: 8 }}>Evidence</div>
            <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0, lineHeight: 1.7 }}>
              {selected.detail}
            </p>
          </div>

          {selected.records.length > 0 && (
            <div className="card" style={{ padding: "16px 18px", marginBottom: 16 }}>
              <div className="section-label" style={{ marginBottom: 10 }}>Affected Records</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {selected.records.map(r => (
                  <div key={r} style={{
                    padding: "7px 12px", borderRadius: "var(--radius-sm)",
                    background: "var(--glass-highlight)",
                    fontSize: 12, color: "var(--primary)", fontWeight: 600,
                    fontFamily: "monospace",
                  }}>{r}</div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" style={{ flex: 1, justifyContent: "center" }}>
              Dismiss
            </button>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }}>
              Investigate
            </button>
          </div>
        </div>
      )}

      <OnboardingTour {...tour} />
    </div>
  );
}
