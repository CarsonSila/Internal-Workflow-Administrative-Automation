import { useState, useEffect } from "react";
import { Icon } from "./icons";
import { useOnboarding, OnboardingTour, type TourStep } from "./OnboardingTour";
import { useSettings } from "./settingsStore";

const RECORD_A = {
  id: "REC-SCH-00831",
  name: "John Kamau Mwangi",
  phone: "+254 722 834 910",
  nationalId: "30291847",
  dob: "1997-04-12",
  email: "jkamau@gmail.com",
  location: "Nairobi, Westlands",
  program: "Scholarship",
};

const RECORD_B = {
  id: "REC-TEC-00214",
  name: "John K. Mwangi",
  phone: "+254 722 834 910",
  nationalId: "30291847",
  dob: "1997-04-12",
  email: "john.mwangi@outlook.com",
  location: "Nairobi",
  program: "Tech",
};

const FIELDS: { key: keyof typeof RECORD_A; label: string; score: number; status: "exact" | "strong" | "partial" | "conflict" }[] = [
  { key: "nationalId", label: "National ID", score: 100, status: "exact" },
  { key: "phone", label: "Phone", score: 100, status: "exact" },
  { key: "dob", label: "Date of Birth", score: 100, status: "exact" },
  { key: "name", label: "Name", score: 94, status: "strong" },
  { key: "location", label: "Location", score: 82, status: "partial" },
  { key: "email", label: "Email", score: 40, status: "conflict" },
  { key: "program", label: "Program", score: 0, status: "conflict" },
];

const STATUS_COLORS: Record<string, string> = {
  exact: "var(--green)",
  strong: "var(--primary)",
  partial: "var(--amber)",
  conflict: "var(--magenta)",
};

const STATUS_LABELS: Record<string, string> = {
  exact: "Exact",
  strong: "Strong",
  partial: "Partial",
  conflict: "Conflict",
};

function MergeAnimation({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 1000);
    const t3 = setTimeout(() => setPhase(3), 1600);
    const t4 = setTimeout(() => { setPhase(4); onComplete(); }, 2500);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: "rgba(7,12,26,0.92)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(12px)",
    }}>
      <div style={{ position: "relative", width: 360, height: 200 }}>
        {/* Record A */}
        <div style={{
          position: "absolute", left: 0, top: 60, width: 120,
          background: "var(--primary-dim)", border: "1px solid var(--primary)",
          borderRadius: "var(--radius)", padding: "14px",
          transition: "all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)",
          transform: phase >= 2 ? "translateX(120px) scale(0)" : "translateX(0) scale(1)",
          opacity: phase >= 2 ? 0 : 1,
        }}>
          <div style={{ fontSize: 9, color: "var(--primary)", fontWeight: 700, letterSpacing: "0.06em", marginBottom: 6 }}>SCHOLARSHIP</div>
          <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 600 }}>John Kamau Mwangi</div>
          <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4 }}>REC-SCH-00831</div>
        </div>

        {/* Record B */}
        <div style={{
          position: "absolute", right: 0, top: 60, width: 120,
          background: "var(--amber-dim)", border: "1px solid var(--amber)",
          borderRadius: "var(--radius)", padding: "14px",
          transition: "all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)",
          transform: phase >= 2 ? "translateX(-120px) scale(0)" : "translateX(0) scale(1)",
          opacity: phase >= 2 ? 0 : 1,
        }}>
          <div style={{ fontSize: 9, color: "var(--amber)", fontWeight: 700, letterSpacing: "0.06em", marginBottom: 6 }}>TECH</div>
          <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 600 }}>John K. Mwangi</div>
          <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4 }}>REC-TEC-00214</div>
        </div>

        {/* Arrow lines */}
        {phase >= 1 && (
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
            <line x1="120" y1="110" x2="180" y2="110"
              stroke="var(--primary)" strokeWidth="1.5"
              strokeDasharray="4 2"
              style={{ animation: "draw-line 0.4s ease-out both" }}/>
            <line x1="240" y1="110" x2="180" y2="110"
              stroke="var(--primary)" strokeWidth="1.5"
              strokeDasharray="4 2"
              style={{ animation: "draw-line 0.4s ease-out both" }}/>
          </svg>
        )}

        {/* Master identity */}
        {phase >= 3 && (
          <div style={{
            position: "absolute", left: "50%", top: "50%",
            transform: "translate(-50%, -50%)",
            background: "var(--teal-dim)", border: "2px solid var(--teal)",
            borderRadius: "var(--radius-lg)", padding: "18px 24px",
            textAlign: "center", minWidth: 180,
            animation: phase === 3 ? "merge-appear 0.5s var(--ease-spring) both" : undefined,
            boxShadow: "0 0 40px var(--teal-dim)",
          }}>
            {phase >= 4 && <div style={{
              position: "absolute", inset: -12, borderRadius: "var(--radius-xl)",
              border: "1px solid var(--teal)",
              animation: "ripple 1s ease-out both",
            }}/>}
            <div style={{ fontSize: 9, color: "var(--teal)", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 8 }}>
              MASTER IDENTITY
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
              John Kamau Mwangi
            </div>
            <div style={{ fontSize: 10, color: "var(--teal)", fontWeight: 600 }}>BEN-00127</div>
            <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 6 }}>
              SCH · TEC · 2 programs
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 32, textAlign: "center" }}>
        {phase < 2 && <p style={{ color: "var(--text-2)", fontSize: 13 }}>Analyzing identity evidence…</p>}
        {phase === 2 && <p style={{ color: "var(--primary)", fontSize: 13 }}>Merging records…</p>}
        {phase >= 3 && (
          <div>
            <p style={{ color: "var(--teal)", fontSize: 14, fontWeight: 700 }}>✓ Identity merged successfully</p>
            <p style={{ color: "var(--text-2)", fontSize: 12 }}>2 records → 1 master identity · 98.7% confidence</p>
          </div>
        )}
      </div>
    </div>
  );
}

const DUPLICATE_TOUR: TourStep[] = [
  { target: "[data-tour='confidence-banner']", title: "How sure is the system?", body: "This score is how confident the identity engine is that these two records are the same person, based on matching ID, phone, and other details." },
  { target: "[data-tour='merge-actions']", title: "Your call, three ways", body: "Merge if you agree they're the same person, send it back for someone else to review, or keep them separate if the match looks wrong." },
];

export default function DuplicateResolution({ onNavigate }: { onNavigate: (v: string) => void }) {
  const [merging, setMerging] = useState(false);
  const [merged, setMerged] = useState(false);
  const [outcome, setOutcome] = useState<null | "kept" | "review">(null);
  const tour = useOnboarding("duplicate", DUPLICATE_TOUR);
  const settings = useSettings();

  const conf = 98.7;
  const verdict = conf >= settings.autoMergeAbove
    ? { text: "COMBINE THESE RECORDS", color: "var(--teal)" }
    : conf >= settings.reviewAbove
    ? { text: "SEND FOR REVIEW", color: "var(--amber)" }
    : { text: "LIKELY DIFFERENT PEOPLE", color: "var(--magenta)" };

  const handleMerge = () => setMerging(true);
  const handleMergeComplete = () => {
    setMerging(false);
    setMerged(true);
  };

  if (merged) {
    return (
      <div className="scrollable animate-in" style={{ padding: "28px", height: "100%", display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✓</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--teal)", margin: "0 0 8px" }}>
            Merge Approved
          </h2>
          <p style={{ color: "var(--text-2)", fontSize: 14, margin: "0 0 24px" }}>
            Master identity BEN-00127 has been updated and verified.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button className="btn btn-ghost" onClick={() => setMerged(false)}>Review Next Case</button>
            <button className="btn btn-primary" onClick={() => onNavigate("beneficiary")}>
              View Beneficiary 360 <Icon.ArrowRight />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="scrollable animate-in" style={{ padding: "28px", height: "100%", overflowY: "auto" }}>
      {merging && <MergeAnimation onComplete={handleMergeComplete} />}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div className="section-label" style={{ marginBottom: 6 }}>Duplicate Resolution Studio</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Identity Match Review</h1>
          <div style={{ display: "flex", gap: 8 }}>
            <span className="badge" style={{ background: "var(--amber-dim)", color: "var(--amber)" }}>
              11 in queue
            </span>
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>Case 1 of 11</span>
          </div>
        </div>
      </div>

      {/* Confidence banner */}
      <div data-tour="confidence-banner" style={{
        background: "linear-gradient(135deg, var(--primary-dim), var(--teal-dim))",
        border: "1px solid var(--primary)",
        borderRadius: "var(--radius-lg)",
        padding: "20px 24px",
        marginBottom: 20,
        display: "flex", alignItems: "center", gap: 24,
      }}>
        <div>
          <div className="section-label" style={{ marginBottom: 4 }}>How Sure We Are</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: "var(--primary)", lineHeight: 1 }}>98.7%</div>
          <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 4 }}>likely the same person</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ height: 6, background: "var(--bg4)", borderRadius: 4, marginBottom: 8 }}>
            <div style={{ width: "98.7%", height: "100%", background: "linear-gradient(90deg, var(--primary), var(--teal))",
              borderRadius: 4, transition: "width 1s var(--ease-out)" }}/>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-2)" }}>
            Suggested action: <span style={{ color: verdict.color, fontWeight: 700 }}>{verdict.text}</span>
          </div>
        </div>
        <div style={{
          padding: "12px 20px",
          background: "var(--teal-dim)",
          border: "1px solid var(--teal)",
          borderRadius: "var(--radius)",
          maxWidth: 240,
        }}>
          <div className="section-label" style={{ color: "var(--teal)", marginBottom: 6 }}>Why is this a match?</div>
          <p style={{ fontSize: 11.5, color: "var(--text-2)", margin: 0, lineHeight: 1.6 }}>
            Identical National ID, phone number, and date of birth across both records. Name variation is a common shorthand pattern.
          </p>
        </div>
      </div>

      {/* Side-by-side comparison */}
      <div className="compare-grid" style={{ marginBottom: 20 }}>

        {/* Record A */}
        <div className="card" style={{ borderRadius: "var(--radius-lg) 0 0 var(--radius-lg)", padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div className="badge" style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
              Record A
            </div>
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>{RECORD_A.id}</span>
            <span className="badge" style={{ background: "var(--primary-dim)", color: "var(--primary)", fontSize: 9 }}>
              {RECORD_A.program}
            </span>
          </div>
          {FIELDS.map(f => (
            <div key={f.key} style={{ marginBottom: 10 }}>
              <div className="section-label" style={{ marginBottom: 3 }}>{f.label}</div>
              <div style={{
                padding: "8px 12px",
                background: `${STATUS_COLORS[f.status]}10`,
                border: `1px solid ${STATUS_COLORS[f.status]}22`,
                borderRadius: "var(--radius-sm)",
                fontSize: 13, color: "var(--text)", fontWeight: f.status === "exact" ? 600 : 400,
              }}>
                {RECORD_A[f.key]}
              </div>
            </div>
          ))}
        </div>

        {/* Match evidence column */}
        <div style={{
          background: "var(--bg2)",
          border: "1px solid var(--border)",
          borderLeft: "none", borderRight: "none",
          padding: "18px 10px",
          display: "flex", flexDirection: "column",
        }}>
          <div className="section-label" style={{ textAlign: "center", marginBottom: 16 }}>Match Evidence</div>
          {FIELDS.map(f => (
            <div key={f.key} style={{
              marginBottom: 10,
              height: 48,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}>
              <div className="badge" style={{
                background: `${STATUS_COLORS[f.status]}15`,
                color: STATUS_COLORS[f.status],
                fontSize: 9, padding: "2px 6px",
              }}>
                {STATUS_LABELS[f.status]}
              </div>
              {f.score > 0 && (
                <div style={{ fontSize: 12, fontWeight: 700, color: STATUS_COLORS[f.status] }}>
                  {f.score}%
                </div>
              )}
              {f.score === 0 && (
                <div style={{ fontSize: 10, color: "var(--text-3)" }}>—</div>
              )}
            </div>
          ))}
        </div>

        {/* Record B */}
        <div className="card" style={{ borderRadius: "0 var(--radius-lg) var(--radius-lg) 0", padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div className="badge" style={{ background: "var(--amber-dim)", color: "var(--amber)" }}>
              Record B
            </div>
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>{RECORD_B.id}</span>
            <span className="badge" style={{ background: "var(--amber-dim)", color: "var(--amber)", fontSize: 9 }}>
              {RECORD_B.program}
            </span>
          </div>
          {FIELDS.map(f => (
            <div key={f.key} style={{ marginBottom: 10 }}>
              <div className="section-label" style={{ marginBottom: 3 }}>{f.label}</div>
              <div style={{
                padding: "8px 12px",
                background: `${STATUS_COLORS[f.status]}10`,
                border: `1px solid ${STATUS_COLORS[f.status]}22`,
                borderRadius: "var(--radius-sm)",
                fontSize: 13, color: "var(--text)", fontWeight: f.status === "exact" ? 600 : 400,
              }}>
                {RECORD_B[f.key]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {outcome === null ? (
        <div data-tour="merge-actions" style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button className="btn btn-ghost" style={{ padding: "10px 20px" }} onClick={() => setOutcome("kept")}>
            Keep Separate
          </button>
          <button className="btn btn-ghost" style={{ padding: "10px 20px", borderColor: "var(--amber)", color: "var(--amber)" }}
            onClick={() => setOutcome("review")}>
            Send for Review
          </button>
          <button className="btn btn-success" style={{ padding: "10px 28px", fontSize: 14 }} onClick={handleMerge}>
            <Icon.Merge /> Approve Merge
          </button>
        </div>
      ) : (
        <div className="card animate-in" style={{ padding: "18px 24px", textAlign: "center", maxWidth: 420, margin: "0 auto" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: outcome === "kept" ? "var(--text)" : "var(--amber)", marginBottom: 4 }}>
            {outcome === "kept" ? "Marked as different people" : "Sent to review queue"}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 14 }}>
            {outcome === "kept" ? "These records will stay separate. Case closed." : "A second reviewer will confirm before any merge happens."}
          </div>
          <button className="btn btn-ghost" onClick={() => setOutcome(null)}>Review Next Case</button>
        </div>
      )}

      <OnboardingTour {...tour} />
    </div>
  );
}
