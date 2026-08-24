import { useEffect, useRef, useState } from "react";
import { useOnboarding, OnboardingTour, type TourStep } from "./OnboardingTour";
import { GlassTank } from "./GlassTank";

const PROGRAMS = ["Scholarship", "Plus", "Vocational", "Tech"];
const PROGRAM_COLORS: Record<string, string> = {
  Scholarship: "var(--primary)",
  Plus: "#a78bfa",
  Vocational: "var(--teal)",
  Tech: "var(--amber)",
};
const PROGRAM_ACTIVE = ["Scholarship", "Tech", "Vocational"];

const TIMELINE = [
  { date: "2022-03-14", time: "09:12", event: "Registered in Scholarship Program", type: "registration", detail: "Initial record created via CSV import" },
  { date: "2022-06-01", time: "11:30", event: "Enrolled in Vocational Training", type: "program", detail: "Cross-program enrollment detected and flagged" },
  { date: "2023-01-18", time: "14:22", event: "Duplicate record detected", type: "duplicate", detail: "REC-TEC-00214 matched with 94% confidence" },
  { date: "2023-01-18", time: "14:23", event: "AI identity review initiated", type: "ai", detail: "Confidence raised to 98.7% after phonetic matching" },
  { date: "2023-01-18", time: "14:30", event: "Records merged by system", type: "merge", detail: "Master identity BEN-00127 created" },
  { date: "2023-06-10", time: "08:44", event: "Enrolled in Tech Program", type: "program", detail: "Third program enrollment confirmed" },
  { date: "2024-11-05", time: "16:00", event: "Data quality review", type: "quality", detail: "Email updated, location normalized" },
  { date: "2026-08-21", time: "07:30", event: "Identity last verified", type: "verification", detail: "All records consistent. Confidence: 99.1%" },
];

const EVENT_COLORS: Record<string, string> = {
  registration: "var(--primary)",
  program: "#a78bfa",
  duplicate: "var(--magenta)",
  ai: "var(--teal)",
  merge: "var(--green)",
  quality: "var(--amber)",
  verification: "var(--primary)",
};

const QUALITY_DIMS = [
  { label: "Completeness", value: 96 },
  { label: "Validity", value: 92 },
  { label: "Uniqueness", value: 100 },
  { label: "Consistency", value: 88 },
  { label: "Freshness", value: 78 },
];

const BENEFICIARY_TOUR: TourStep[] = [
  { target: "[data-tour='identity-dials']", title: "The two numbers that matter most", body: "Identity Confidence is how sure the engine is this is one real person. Data Health is how clean this person's records are overall." },
  { target: "[data-tour='beneficiary-tabs']", title: "Three ways to look at one person", body: "Timeline shows how this identity was built over time, Source Records shows every raw record behind it, and Programs shows which of the four PLP programs they touch." },
];

function RadialProgress({ value, color, size = 60 }: { value: number; color: string; size?: number }) {
  const r = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: "stroke-dashoffset 1s var(--ease-out)", filter: `drop-shadow(0 0 4px ${color}60)` }}
      />
      <text x={size/2} y={size/2 + 4} textAnchor="middle" fill={color}
        fontSize={size * 0.2} fontWeight="700" fontFamily="Trebuchet MS">
        {value}%
      </text>
    </svg>
  );
}

export default function Beneficiary360() {
  const [tab, setTab] = useState<"timeline" | "records" | "programs">("timeline");
  const tour = useOnboarding("beneficiary", BENEFICIARY_TOUR);

  return (
    <div className="scrollable animate-in" style={{ padding: "28px", height: "100%", overflowY: "auto" }}>

      <div className="beneficiary-hero" style={{
        background: "linear-gradient(135deg, var(--primary-dim) 0%, var(--teal-dim) 100%)",
        border: "1px solid var(--primary)",
        borderRadius: "var(--radius-xl)",
        padding: "24px 28px",
        marginBottom: 24,
      }}>
        <div>
          <div className="section-label" style={{ marginBottom: 8 }}>Beneficiary 360</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "linear-gradient(135deg, var(--primary-dim), var(--magenta-dim))",
              border: "1.5px solid var(--primary)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: 700, color: "var(--primary)",
            }}>JK</div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, lineHeight: 1 }}>John Kamau Mwangi</h1>
              <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>BEN-00127 · Master Identity</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {PROGRAMS.map(p => (
              <div key={p} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 12px", borderRadius: 100,
                background: PROGRAM_ACTIVE.includes(p) ? `${PROGRAM_COLORS[p]}15` : "rgba(255,255,255,0.03)",
                border: `1px solid ${PROGRAM_ACTIVE.includes(p) ? PROGRAM_COLORS[p] + "35" : "rgba(255,255,255,0.06)"}`,
                fontSize: 11, fontWeight: 600,
                color: PROGRAM_ACTIVE.includes(p) ? PROGRAM_COLORS[p] : "var(--text-3)",
              }}>
                <span style={{ fontSize: 10 }}>{PROGRAM_ACTIVE.includes(p) ? "✓" : "○"}</span>
                {p}
              </div>
            ))}
          </div>
        </div>

        <div data-tour="identity-dials" style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <GlassTank pct={99} color="var(--teal)" size="sm" />
            <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4 }}>Identity Confidence</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <GlassTank pct={91} color="var(--green)" colorLight="var(--teal)" size="sm" />
            <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4 }}>Data Health</div>
          </div>
        </div>
      </div>

      <div className="grid-quality-5" style={{ marginBottom: 24 }}>
        {QUALITY_DIMS.map((d, i) => (
          <div key={d.label} className="card" style={{
            padding: "14px 16px",
            animation: `fadeIn 0.35s ${i * 0.07}s both`,
          }}>
            <div className="section-label" style={{ marginBottom: 8 }}>{d.label}</div>
            <GlassTank
              pct={d.value}
              color={d.value >= 90 ? "var(--green)" : d.value >= 80 ? "var(--amber)" : "var(--magenta)"}
              size="mini"
            />
          </div>
        ))}
      </div>

      <div data-tour="beneficiary-tabs" style={{ display: "flex", gap: 2, marginBottom: 16,
        background: "var(--bg2)", padding: 3, borderRadius: "var(--radius-sm)",
        width: "fit-content" }}>
        {(["timeline", "records", "programs"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "6px 16px",
            borderRadius: "var(--radius-sm)",
            border: "none",
            background: tab === t ? "var(--bg3)" : "transparent",
            color: tab === t ? "var(--text)" : "var(--text-3)",
            fontFamily: "inherit",
            fontSize: 12, fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s",
            textTransform: "capitalize",
            letterSpacing: "0.01em",
          }}>{t === "timeline" ? "Identity Timeline" : t === "records" ? "Source Records" : "Programs"}</button>
        ))}
      </div>

      {tab === "timeline" && (
        <div className="card" style={{ padding: "20px 24px" }}>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 92, top: 0, bottom: 0, width: 1,
              background: "linear-gradient(to bottom, transparent, var(--border), transparent)" }}/>
            {TIMELINE.map((ev, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "84px 1fr", gap: 20, marginBottom: 20,
                animation: `fadeIn 0.35s ${i * 0.06}s both` }}>
                <div style={{ textAlign: "right", paddingTop: 2 }}>
                  <div style={{ fontSize: 11, color: "var(--text-2)", fontWeight: 700, whiteSpace: "nowrap" }}>{ev.date.slice(0, 7)}</div>
                  <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2, whiteSpace: "nowrap" }}>{ev.time}</div>
                </div>
                <div style={{ paddingLeft: 20, position: "relative" }}>
                  {/* dot offset -17 (not -28): with an 84px-wide date column and a
                      20px gap ending at outer x=104, -17 centers the 10px dot on
                      the rail at x=92, leaving ~3px clearance from the date text's
                      right-aligned edge at x=84. The old -28 pushed the dot 8px
                      into the date column, causing the visible overlap. */}
                  <div style={{ position: "absolute", left: -17, top: 4, width: 10, height: 10, borderRadius: "50%",
                    background: `${EVENT_COLORS[ev.type]}35`, border: `2.5px solid ${EVENT_COLORS[ev.type]}`,
                    boxShadow: `0 0 10px ${EVENT_COLORS[ev.type]}45` }}/>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 3 }}>{ev.event}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>{ev.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "records" && (
        <div className="card table-scroll" style={{ overflow: "hidden" }}>
          <div style={{ minWidth: 560 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 110px 90px 100px",
              padding: "10px 18px", borderBottom: "1px solid var(--border)" }}>
              {["Record ID", "Program", "National ID", "Status", "Ingested"].map(h => (
                <div key={h} className="section-label">{h}</div>
              ))}
            </div>
            {[
              { id: "REC-SCH-00831", prog: "Scholarship", nid: "30291847", status: "Merged", date: "2022-03-14" },
              { id: "REC-TEC-00214", prog: "Tech", nid: "30291847", status: "Merged", date: "2022-11-09" },
              { id: "REC-VOC-00543", prog: "Vocational", nid: "30291847", status: "Active", date: "2022-06-01" },
            ].map((r, i) => (
              <div key={r.id} className="table-row" style={{
                gridTemplateColumns: "1fr 100px 110px 90px 100px",
                animation: `fadeIn 0.3s ${i * 0.08}s both`,
              }}>
                <span style={{ fontSize: 12, color: "var(--primary)", fontWeight: 600 }}>{r.id}</span>
                <span className="badge" style={{ background: `${PROGRAM_COLORS[r.prog]}15`, color: PROGRAM_COLORS[r.prog], fontSize: 10 }}>
                  {r.prog}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-2)", fontFamily: "monospace" }}>{r.nid}</span>
                <span className="badge" style={{ background: r.status === "Merged" ? "var(--teal-dim)" : "var(--primary-dim)",
                  color: r.status === "Merged" ? "var(--teal)" : "var(--primary)", fontSize: 10 }}>
                  {r.status}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>{r.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "programs" && (
        <div>
          <div className="card" style={{ padding: "18px 20px", marginBottom: 16 }}>
            <div className="section-label" style={{ marginBottom: 6 }}>Cross-Program Context</div>
            <div style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 14 }}>
              This identity touches {PROGRAM_ACTIVE.length} of 4 programs — here's how that compares.
            </div>
            <div className="glass-segment-bar" style={{ display: "flex", height: 22, borderRadius: 8, overflow: "hidden", marginBottom: 10 }}>
              {[
                { label: "1 program", pct: 55, color: "var(--text-3)" },
                { label: "2 programs", pct: 32, color: "var(--secondary)" },
                { label: "3+ programs", pct: 13, color: "var(--primary)" },
              ].map((b, i) => (
                <div key={b.label} title={`${b.label}: ~${b.pct}% of identities`}
                  style={{ width: `${b.pct}%`, background: b.color, animation: `fadeIn 0.4s ${i * 0.1}s both` }} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {[
                { label: "1 program", pct: 55, color: "var(--text-3)" },
                { label: "2 programs", pct: 32, color: "var(--secondary)" },
                { label: "3+ programs", pct: 13, color: "var(--primary)", active: PROGRAM_ACTIVE.length >= 3 },
              ].map(b => (
                <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: b.color }} />
                  <span style={{ fontSize: 12, color: b.active ? "var(--text)" : "var(--text-3)", fontWeight: b.active ? 700 : 500 }}>
                    {b.label} · ~{b.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {PROGRAMS.map((p, i) => {
            const active = PROGRAM_ACTIVE.includes(p);
            return (
              <div key={p} className="card" style={{
                padding: "18px 20px", opacity: active ? 1 : 0.45,
                borderColor: active ? `${PROGRAM_COLORS[p]}30` : "var(--border)",
                animation: `fadeIn 0.35s ${i * 0.08}s both`,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: active ? PROGRAM_COLORS[p] : "var(--text-3)" }}>{p}</div>
                  <div className="badge" style={{
                    background: active ? `${PROGRAM_COLORS[p]}15` : "rgba(255,255,255,0.04)",
                    color: active ? PROGRAM_COLORS[p] : "var(--text-3)",
                  }}>{active ? "Enrolled" : "Not enrolled"}</div>
                </div>
                {active && (
                  <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                    1 source record · Verified identity · Data health 89%
                  </div>
                )}
                {!active && (
                  <div style={{ fontSize: 12, color: "var(--text-4)" }}>No record in this program</div>
                )}
              </div>
            );
          })}
          </div>
        </div>
      )}

      <OnboardingTour {...tour} />
    </div>
  );
}
