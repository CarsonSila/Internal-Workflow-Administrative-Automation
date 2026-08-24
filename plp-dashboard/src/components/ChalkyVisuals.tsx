import { AlertTriangle, Search as SearchIcon, CheckCircle2, GitMerge, ClipboardList, ShieldCheck } from "lucide-react";

export type MatchCandidate = { id: string; confidence: number };
export type ProgramFlow = { name: string; short: string; records: number; color: string };
export type ResolutionOutcome = { autoMerged: number; pendingReview: number; rejected: number };
export type AuditEvent = { time: string; date: string; event: string; detail: string; type: string };
export type QualityDimension = { dimension: string; value: number; issues: number };
export type AnomalyItem = {
  id: string; title: string; level: "Normal" | "Review" | "Anomaly"; program: string;
  section: "duplicate" | "quality" | "beneficiary" | "audit";
};

const DEFAULT_MATCHES: MatchCandidate[] = [
  ...Array.from({ length: 18 }, (_, i) => ({ id: `m${i}`, confidence: 98 + (i % 3) })),
  ...Array.from({ length: 14 }, (_, i) => ({ id: `r${i}`, confidence: 75 + ((i * 3) % 23) })),
  ...Array.from({ length: 6 }, (_, i) => ({ id: `x${i}`, confidence: 40 + ((i * 5) % 30) })),
];

const DEFAULT_PROGRAM_FLOWS: ProgramFlow[] = [
  { name: "Scholarship", short: "SCH", records: 18420, color: "var(--primary)" },
  { name: "Plus", short: "PLU", records: 14200, color: "#a78bfa" },
  { name: "Vocational", short: "VOC", records: 16940, color: "var(--teal)" },
  { name: "Tech", short: "TEC", records: 14720, color: "var(--amber)" },
];

const DEFAULT_OUTCOME: ResolutionOutcome = { autoMerged: 51042, pendingReview: 11, rejected: 289 };

const DEFAULT_EVENTS: AuditEvent[] = [
  { time: "07:42:11", date: "2026-08-21", event: "High confidence match found", detail: "Processed 340 records. Confidence: 98%", type: "match" },
  { time: "07:31:04", date: "2026-08-21", event: "Merge approved", detail: "Auto-merged records into BEN-01192", type: "merge" },
  { time: "06:58:29", date: "2026-08-21", event: "Data quality scan completed", detail: "Overall health: 91%. 4200 records scanned.", type: "quality" },
  { time: "06:10:02", date: "2026-08-21", event: "Record received", detail: "Processed 1284 records. Confidence: 74%", type: "ingest" },
];

const DEFAULT_QUALITY: QualityDimension[] = [
  { dimension: "Completeness", value: 96, issues: 412 },
  { dimension: "Validity", value: 92, issues: 890 },
  { dimension: "Uniqueness", value: 88, issues: 1240 },
  { dimension: "Consistency", value: 91, issues: 730 },
  { dimension: "Freshness", value: 85, issues: 1580 },
];

const DEFAULT_ANOMALIES: AnomalyItem[] = [
  { id: "ANO-001", title: "7 beneficiaries share the same phone number", level: "Anomaly", program: "Cross-program", section: "duplicate" },
  { id: "ANO-002", title: "Unusual duplicate cluster detected", level: "Anomaly", program: "Vocational", section: "duplicate" },
  { id: "ANO-003", title: "Potential identity conflict: 3 records", level: "Review", program: "Scholarship", section: "beneficiary" },
  { id: "ANO-004", title: "Spike in new registrations", level: "Review", program: "Plus", section: "quality" },
  { id: "ANO-005", title: "Name normalization resolved 412 variants", level: "Normal", program: "All programs", section: "quality" },
];

const LEVEL_META: Record<AnomalyItem["level"], { color: string; Icon: typeof AlertTriangle }> = {
  Anomaly: { color: "var(--magenta)", Icon: AlertTriangle },
  Review:  { color: "var(--amber)", Icon: SearchIcon },
  Normal:  { color: "var(--green)", Icon: CheckCircle2 },
};

const REPORTS = [
  { label: "Data Quality Report", section: "quality" as const, Icon: ShieldCheck },
  { label: "Duplicate Resolution Summary", section: "duplicate" as const, Icon: GitMerge },
  { label: "Activity Log Export", section: "audit" as const, Icon: ClipboardList },
];


const zoneOf = (c: number) => (c >= 98 ? "merge" : c >= 75 ? "review" : "reject");
const ZONE_META = {
  merge:  { label: "Clear match (≥98%)", color: "var(--teal)" },
  review: { label: "Needs a second look (75–97%)", color: "var(--amber)" },
  reject: { label: "Probably different people (<75%)", color: "var(--magenta)" },
} as const;

export function ChalkyDotMatrix({ matches = DEFAULT_MATCHES }: { matches?: MatchCandidate[] }) {
  const zones = ["merge", "review", "reject"] as const;
  return (
    <div className="p-6">
      <div className="section-label mb-2">How Sure the System Is</div>
      <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Records Waiting to Be Matched</h3>
      <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 20 }}>
        Each bubble is one pair of records that might be the same person, grouped by how sure the system is.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {zones.map(zone => {
          const items = matches.filter(m => zoneOf(m.confidence) === zone);
          const meta = ZONE_META[zone];
          return (
            <div key={zone}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>{meta.label}</span>
                <span style={{ fontSize: 12, color: "var(--text-3)" }}>{items.length} matches</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
                {items.map((m, i) => (
                  <div
                    key={m.id}
                    className="bubble"
                    title={`${m.id} — ${m.confidence}% confidence`}
                    style={{
                      width: 16, height: 16,
                      background: meta.color,
                      animationDelay: `${i * 0.05}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 16 }}>
        ✓ Shows how many pending matches are borderline vs. safe to auto-resolve — sizes the review queue at a glance.
      </p>
    </div>
  );
}


export function FlowSankey({
  flows = DEFAULT_PROGRAM_FLOWS,
  outcome = DEFAULT_OUTCOME,
}: { flows?: ProgramFlow[]; outcome?: ResolutionOutcome }) {
  const total = flows.reduce((s, f) => s + f.records, 0);
  const outTotal = outcome.autoMerged + outcome.pendingReview + outcome.rejected;

  const programY = [50, 130, 210, 290];
  const outcomeY = [90, 180, 260];
  const outcomeData = [
    { label: "Auto-merged", value: outcome.autoMerged, color: "var(--green)" },
    { label: "Pending Review", value: outcome.pendingReview, color: "var(--amber)" },
    { label: "Rejected", value: outcome.rejected, color: "var(--red)" },
  ];

  const inPaths = flows.map((f, i) => `M 90 ${programY[i]} C 220 ${programY[i]}, 220 170, 300 170`);
  const outPaths = outcomeData.map((o, i) => `M 340 170 C 420 170, 420 ${outcomeY[i]}, 500 ${outcomeY[i]}`);

  return (
    <div className="p-6">
      <div className="section-label mb-2">Resolution Funnel</div>
      <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Programs → Identity Engine → Outcome</h3>
      <svg viewBox="0 0 620 340" style={{ width: "100%", height: 300 }}>
        {flows.map((f, i) => (
          <path key={f.short} d={inPaths[i]} className="flow-path" stroke={f.color} strokeOpacity={0.55}
            style={{ animationDelay: `${i * 0.1}s` }} />
        ))}
        {outcomeData.map((o, i) => (
          <path key={o.label} d={outPaths[i]} className="flow-path" stroke={o.color} strokeOpacity={0.7}
            style={{ animationDelay: `${0.4 + i * 0.1}s` }} />
        ))}

        {/* Silver shine traveling continuously through every path in the funnel */}
        {inPaths.map((d, i) => (
          <path key={`shine-in-${i}`} d={d} className="flow-shine" style={{ animationDelay: `${i * 0.3}s` }} />
        ))}
        {outPaths.map((d, i) => (
          <path key={`shine-out-${i}`} d={d} className="flow-shine" style={{ animationDelay: `${0.5 + i * 0.3}s` }} />
        ))}

        {flows.map((f, i) => (
          <g key={f.short}>
            <rect x="10" y={programY[i] - 20} width="80" height="40" rx="8" className="flow-node" />
            <text x="50" y={programY[i] - 2} textAnchor="middle" fill={f.color} fontSize="11" fontWeight="800">{f.short}</text>
            <text x="50" y={programY[i] + 14} textAnchor="middle" fill="var(--text-3)" fontSize="9">{f.records.toLocaleString()}</text>
          </g>
        ))}

        <g>
          <rect x="300" y="150" width="80" height="40" rx="8" className="flow-node" />
          <text x="340" y="168" textAnchor="middle" fill="var(--text)" fontSize="10" fontWeight="800">ENGINE</text>
          <text x="340" y="182" textAnchor="middle" fill="var(--text-3)" fontSize="9">{total.toLocaleString()}</text>
        </g>

        {outcomeData.map((o, i) => (
          <g key={o.label}>
            <rect x="500" y={outcomeY[i] - 20} width="100" height="40" rx="8" className="flow-node" />
            <text x="550" y={outcomeY[i] - 2} textAnchor="middle" fill={o.color} fontSize="12" fontWeight="800">
              {o.value.toLocaleString()}
            </text>
            <text x="550" y={outcomeY[i] + 14} textAnchor="middle" fill="var(--text-3)" fontSize="9">{o.label}</text>
          </g>
        ))}
      </svg>
      <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 8 }}>
        ✓ {((outcome.rejected / outTotal) * 100).toFixed(1)}% of matches are rejected outright — tracks duplicate waste per program.
      </p>
    </div>
  );
}


const EVENT_COLOR: Record<string, string> = {
  ingest: "var(--teal)", ai: "var(--violet)", match: "var(--primary)",
  merge: "var(--green)", update: "var(--secondary)", quality: "var(--amber)", anomaly: "var(--red)",
};

export function GlassyTimeline({ events = DEFAULT_EVENTS }: { events?: AuditEvent[] }) {
  const recent = events.slice(0, 8);
  return (
    <div className="p-6" style={{ display: "flex", flexDirection: "column", paddingBottom: 20 }}>
      <div className="section-label mb-2">Live Activity</div>
      <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Recent Audit Events</h3>
      <div
        className="relative"
        style={{ maxHeight: 240, overflowY: recent.length > 4 ? "auto" : "visible", paddingRight: 4, flexShrink: 0 }}
      >
        <div className="timeline-line" />
        {recent.map((ev, i) => {
          const color = EVENT_COLOR[ev.type] ?? "var(--primary)";
          return (
            <div key={i} className="relative" style={{ marginBottom: 26, minHeight: 50 }}>
              <div className="timeline-node" style={{ top: 6, borderColor: color }} />
              <div className="timeline-card timeline-card-drop" style={{ animationDelay: `${i * 0.08}s` }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="text-xs font-bold" style={{ color }}>{ev.event}</span>
                  <span style={{ fontSize: 11, color: "var(--text-3)" }}>{ev.time}</span>
                </div>
                <div className="text-sm" style={{ color: "var(--text-2)" }}>{ev.detail}</div>
              </div>
            </div>
          );
        })}
      </div>
      <p style={{
        fontSize: 12, color: "var(--text-3)", marginTop: 8, paddingBottom: 4,
        whiteSpace: "normal", overflow: "visible", flexShrink: 0,
      }}>
        ✓ Live feed of ingestion, matching, and merge activity — pulled straight from the audit log.
      </p>
    </div>
  );
}


export function ChalkyBlockChart({ dimensions = DEFAULT_QUALITY }: { dimensions?: QualityDimension[] }) {
  const dimColor = (v: number) => (v >= 90 ? "var(--green)" : v >= 80 ? "var(--amber)" : "var(--red)");
  return (
    <div className="p-6">
      <div className="section-label mb-2">Quality Dimensions</div>
      <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Data Health by Category</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {dimensions.map((dim, i) => {
          const color = dimColor(dim.value);
          return (
            <div key={dim.dimension}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span className="text-sm font-bold" style={{ color: "var(--text-2)" }}>{dim.dimension}</span>
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>{dim.issues.toLocaleString()} issues flagged</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {Array.from({ length: Math.ceil(dim.value / 10) }).map((_, bIdx) => (
                  <div
                    key={bIdx}
                    className="block block-glossy"
                    style={{
                      width: 26, height: 26,
                      background: `linear-gradient(135deg, ${color}, var(--bg3))`,
                      animationDelay: `${i * 0.15 + bIdx * 0.06}s`,
                    }}
                  />
                ))}
                <span style={{ alignSelf: "center", marginLeft: 8, fontWeight: 800, fontSize: 15, color }}>
                  {dim.value}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 16 }}>
        ✓ Pinpoints which dimension needs cleanup before records reach the identity engine.
      </p>
    </div>
  );
}

export function IconGrid({
  anomalies = DEFAULT_ANOMALIES,
  onNavigate,
}: { anomalies?: AnomalyItem[]; onNavigate?: (section: string) => void }) {
  return (
    <div className="p-6">
      <div className="section-label mb-2">Anomaly Triage</div>
      <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Active Anomaly Clusters</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {anomalies.map((a, i) => {
          const meta = LEVEL_META[a.level];
          return (
            <button
              key={a.id}
              onClick={() => onNavigate?.(a.section)}
              className="block"
              style={{
                padding: 14, cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                border: `1px solid ${meta.color}40`,
                background: `linear-gradient(135deg, ${meta.color}12, transparent)`,
                animation: `floatUp 0.4s ${i * 0.06}s both`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <meta.Icon size={18} color={meta.color} strokeWidth={2} />
                <span style={{ fontSize: 10, fontWeight: 700, color: meta.color }}>{a.level}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", lineHeight: 1.4 }}>{a.title}</div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>{a.program}</div>
            </button>
          );
        })}
      </div>

      <div className="section-label" style={{ marginTop: 24, marginBottom: 10 }}>Reports</div>
      <div className="hscroll" style={{ display: "flex", gap: 10 }}>
        {REPORTS.map(r => (
          <button key={r.label} onClick={() => onNavigate?.(r.section)} className="btn btn-ghost"
            style={{ fontSize: 12, whiteSpace: "nowrap" }}>
            <r.Icon size={14} /> {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
