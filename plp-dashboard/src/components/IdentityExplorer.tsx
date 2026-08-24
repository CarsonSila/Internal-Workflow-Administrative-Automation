import { useState, useRef, useEffect } from "react";
import { Icon } from "./icons";
import { useOnboarding, OnboardingTour, type TourStep } from "./OnboardingTour";
import { GlassBar } from "./GlassBar";

const RECORDS = [
  { id: "BEN-00127", name: "John Kamau Mwangi", nid: "30291847", programs: ["SCH", "TEC", "VOC"], confidence: 99, health: 91, status: "Verified" },
  { id: "BEN-00231", name: "Amina Wanjiku Odhiambo", nid: "28491023", programs: ["PLU", "VOC"], confidence: 97, health: 88, status: "Verified" },
  { id: "BEN-00344", name: "Peter Otieno Achieng", nid: "35912847", programs: ["SCH"], confidence: 95, health: 95, status: "Verified" },
  { id: "BEN-00412", name: "Grace Njeri Waweru", nid: "29281047", programs: ["TEC", "PLU"], confidence: 88, health: 72, status: "Review" },
  { id: "BEN-00501", name: "Samuel Kipkoech Ruto", nid: "41029384", programs: ["VOC"], confidence: 92, health: 85, status: "Verified" },
  { id: "BEN-00619", name: "Faith Akinyi Odinga", nid: "33048291", programs: ["SCH", "TEC"], confidence: 79, health: 68, status: "Review" },
  { id: "BEN-00711", name: "Daniel Muthoni Kamau", nid: "27394810", programs: ["PLU"], confidence: 96, health: 91, status: "Verified" },
  { id: "BEN-00823", name: "Joyce Nekesa Wekesa", nid: "38201947", programs: ["VOC", "SCH"], confidence: 61, health: 55, status: "Conflict" },
];

// NOTE: this is placeholder/demo data. generate_data.py produces 1,500 beneficiaries,
// and the real system is expected to reach 50k+. Once main.py exists, replace RECORDS
// with a paginated fetch — don't ship 50k rows to the client unfiltered.
const TOTAL_MASTER_IDENTITIES_TARGET = 51842;

const PROG_COLORS: Record<string, string> = {
  SCH: "var(--primary)", TEC: "var(--amber)", VOC: "var(--teal)", PLU: "#a78bfa",
};

const STATUS_COLORS: Record<string, string> = {
  Verified: "var(--green)",
  Review: "var(--amber)",
  Conflict: "var(--magenta)",
};

const EXPLORER_TOUR: TourStep[] = [
  { target: "[data-tour='search-filter']", title: "Find someone fast", body: "Search by name or ID, or filter by status — Verified, Review, or Conflict — to narrow the list to what you actually need to look at." },
  { target: "[data-tour='identity-table']", title: "One row, one person", body: "Each row is a person's single trusted record, built from everything the system matched together. Click a row to see their full history." },
];


export default function IdentityExplorer({ onSelectBen }: { onSelectBen: () => void }) {
  const [records, setRecords] = useState(RECORDS);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formNid, setFormNid] = useState("");
  const newRowRef = useRef<HTMLDivElement>(null);
  const tour = useOnboarding("identity", EXPLORER_TOUR);

  useEffect(() => {
    if (newRowRef.current) newRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [records.length]);

  const filtered = records.filter(r => {
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || r.status.toLowerCase() === filter;
    return matchSearch && matchFilter;
  });

  const submitNewRecord = () => {
    if (!formName.trim()) return;
    const newRecord = {
      id: `BEN-${Math.floor(10000 + Math.random() * 89999)}`,
      name: formName.trim(),
      nid: formNid.trim() || "—",
      programs: ["SCH"],
      confidence: 100,
      health: 100,
      status: "Verified" as const,
    };
    setRecords(r => [newRecord, ...r]);
    setFormName(""); setFormNid(""); setShowForm(false);
  };

  return (
    <div className="scrollable animate-in" style={{ padding: "28px", height: "100%", overflowY: "auto" }}>
      <div style={{ marginBottom: 20 }}>
        <div className="section-label" style={{ marginBottom: 6 }}>Identity Explorer</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
            {records.length} identities loaded <span style={{ color: "var(--text-3)", fontWeight: 500 }}>· {TOTAL_MASTER_IDENTITIES_TARGET.toLocaleString()} in full dataset</span>
          </h1>
          <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => setShowForm(s => !s)}>
            <Icon.Plus /> New Record
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card animate-in" style={{ padding: 20, marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div className="section-label" style={{ marginBottom: 6 }}>Full Name</div>
            <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Mary Wambui" style={{ width: "100%" }} />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div className="section-label" style={{ marginBottom: 6 }}>National ID</div>
            <input value={formNid} onChange={e => setFormNid(e.target.value)} placeholder="e.g. 32918475" style={{ width: "100%" }} />
          </div>
          <button className="btn btn-primary" onClick={submitNewRecord}>Create Record</button>
          <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
        </div>
      )}

      {/* Filters */}
      <div data-tour="search-filter" style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180, maxWidth: 280 }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
            color: "var(--text-3)", pointerEvents: "none" }}>
            <Icon.Search />
          </span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, ID, record…"
            style={{ width: "100%", paddingLeft: 32, borderRadius: "var(--radius-sm)" }}/>
        </div>
        {["all", "verified", "review", "conflict"].map(f => (
          <button key={f} onClick={() => setFilter(f)} className="btn btn-ghost" style={{
            fontSize: 11, padding: "5px 12px",
            background: filter === f ? "var(--primary-dim)" : "transparent",
            color: filter === f ? "var(--primary)" : "var(--text-3)",
            borderColor: filter === f ? "var(--primary)" : "var(--border)",
            textTransform: "capitalize",
          }}>{f}</button>
        ))}
      </div>

      <div data-tour="identity-table" className="card table-scroll" style={{ overflow: "hidden" }}>
        <div style={{ minWidth: 680 }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "140px 1fr 110px 100px 80px 80px 90px",
            padding: "10px 16px",
            borderBottom: "1px solid var(--border)",
          }}>
            {["Beneficiary ID", "Name", "National ID", "Programs", "Confidence", "Health", "Status"].map(h => (
              <div key={h} className="section-label">{h}</div>
            ))}
          </div>
          {filtered.map((r, i) => (
            <div key={r.id} ref={i === 0 && showForm === false && r.confidence === 100 ? newRowRef : undefined}
              className="table-row" style={{ gridTemplateColumns: "140px 1fr 110px 100px 80px 80px 90px", animation: `fadeIn 0.3s ${i * 0.05}s both` }}
              onClick={onSelectBen}>
              <span style={{ fontSize: 12, color: "var(--primary)", fontWeight: 700, fontFamily: "monospace" }}>
                {r.id}
              </span>
              <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{r.name}</span>
              <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "monospace" }}>{r.nid}</span>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {r.programs.map(p => (
                  <span key={p} style={{
                    fontSize: 9, fontWeight: 700,
                    background: `${PROG_COLORS[p]}18`,
                    color: PROG_COLORS[p],
                    border: `1px solid ${PROG_COLORS[p]}30`,
                    padding: "2px 6px", borderRadius: 100,
                  }}>{p}</span>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: r.confidence >= 90 ? "var(--teal)" : r.confidence >= 75 ? "var(--amber)" : "var(--magenta)" }}>
                  {r.confidence}%
                </div>
                <div style={{ marginTop: 4, width: 56 }}>
                  <GlassBar pct={r.confidence} height={6}
                    color={r.confidence >= 90 ? "var(--teal)" : r.confidence >= 75 ? "var(--amber)" : "var(--magenta)"} />
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: r.health >= 85 ? "var(--green)" : r.health >= 70 ? "var(--amber)" : "var(--magenta)" }}>
                {r.health}%
              </div>
              <span className="badge" style={{
                background: `${STATUS_COLORS[r.status]}12`,
                color: STATUS_COLORS[r.status], fontSize: 9,
              }}>{r.status}</span>
            </div>
          ))}
          {/* {filtered.length === 0 && (
            <div style={{ padding: "40px", textAlign: "center" }}>
              <div style={{ fontSize: 24, marginBottom: 12 }}>○</div>
              <div style={{ fontSize: 14, color: "var(--text-3)" }}>No identities match your search.</div>
              <div style={{ fontSize: 12, color: "var(--text-4)", marginTop: 4 }}>Identity graph is clean.</div>
            </div>
          )} */}
        </div>
      </div>
      <div style={{ padding: "12px 0", fontSize: 12, color: "var(--text-3)" }}>
        Showing {filtered.length} of {RECORDS.length} loaded · Demo sample data
      </div>

      <OnboardingTour {...tour} />
    </div>
  );
}
