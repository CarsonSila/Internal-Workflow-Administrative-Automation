import React, { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  LayoutGrid, Search, Scale, Share2, ShieldCheck, Lock, ScrollText, Bell, ChevronRight,
  CheckCircle2, XCircle, AlertTriangle, TrendingUp, TrendingDown, Fingerprint, GitMerge,
  ArrowRight, Clock, Eye, EyeOff, Sparkles, Filter, ArrowUpRight, Zap, FileWarning,
} from "lucide-react";

const PROGRAMS = [
  { code: "SCH", name: "Scholarship", color: "#4338CA", tint: "#EEF0FD", raw: 1500, dup: 20.0, nul: 21.67, fmt: 24.2, typo: 20.93 },
  { code: "PLU", name: "Plus", color: "#8B5CF6", tint: "#F3EEFE", raw: 1500, dup: 20.0, nul: 23.13, fmt: 23.67, typo: 21.33 },
  { code: "VOC", name: "Vocational", color: "#0EA5A0", tint: "#E9FBF9", raw: 1500, dup: 20.0, nul: 22.2, fmt: 24.87, typo: 22.2 },
  { code: "TEC", name: "Tech Fellowship", color: "#F5A524", tint: "#FEF6E7", raw: 1500, dup: 20.0, nul: 20.07, fmt: 23.33, typo: 22.13 },
];

const TREND = Array.from({ length: 30 }, (_, i) => ({
  day: `D${i + 1}`,
  health: Math.round(64 + 18 * Math.abs(Math.sin(i / 2.6)) + (i % 7 === 0 ? 6 : 0)),
}));

const LEAKAGE = [
  { m: "Apr", prevented: 210 }, { m: "May", prevented: 340 }, { m: "Jun", prevented: 505 },
  { m: "Jul", prevented: 715 }, { m: "Aug", prevented: 937.5 },
];

const QUALITY = [
  { label: "Completeness", value: 94, issues: 128, desc: "Presence of essential beneficiary identity fields." },
  { label: "Validity", value: 89, issues: 215, desc: "Conformity of ID numbers, locations, and format rules." },
  { label: "Uniqueness", value: 92, issues: 164, desc: "Baseline level of duplicate-free data." },
  { label: "Consistency", value: 91, issues: 110, desc: "Semantic formatting and typo levels across programs." },
  { label: "Freshness", value: 98, issues: 32, desc: "Frequency of incoming transactional and status telemetry." },
];

const QUEUE = [
  { a: "REC-PLU-10001", b: "REC-SCH-10002", nameA: "Grace Kamau", nameB: "Grace K. Mumbi", score: 27.6, id: false, phone: false, program: "PLU" },
  { a: "REC-VOC-10041", b: "REC-VOC-10118", nameA: "Samuel Otieno", nameB: "Samuel Otieno", score: 96.4, id: true, phone: true, program: "VOC" },
  { a: "REC-TEC-10077", b: "REC-SCH-10203", nameA: "Beatrice Wanjiku", nameB: "Beatrice N. Wanjiku", score: 88.1, id: true, phone: false, program: "TEC" },
  { a: "REC-SCH-10312", b: "REC-PLU-10399", nameA: "Charles Wafula", nameB: "Charles Wafula", score: 71.2, id: false, phone: true, program: "SCH" },
  { a: "REC-VOC-10450", b: "REC-TEC-10501", nameA: "Njeri Kariuki", nameB: "Njeri Kariuki", score: 99.1, id: true, phone: true, program: "VOC" },
];

const LEDGER = [
  { t: "12:43:55", type: "GOVERNANCE", who: "admin_kamau", text: "PII anonymisation set to False by Peter Kamau." },
  { t: "12:41:08", type: "MERGE", who: "engine", text: "Auto-merged BEN-10441 + BEN-10442 at 99.1% confidence." },
  { t: "12:38:20", type: "RECONCILE", who: "engine", text: "Flagged disbursement DSB-2291 — attendance mismatch, Ksh 12,000 held." },
  { t: "12:30:02", type: "CONSENT", who: "field_officer_2", text: "Consent recorded for BEN-10502 (Scholarship, verbal + signature)." },
  { t: "12:12:47", type: "GOVERNANCE", who: "admin_kamau", text: "PII anonymisation set to True by Peter Kamau." },
];

const badge = (bg, fg, text) => (
  <span style={{ background: bg, color: fg }} className="text-[11px] font-semibold px-2 py-0.5 rounded-full tracking-wide">
    {text}
  </span>
);

function Shell({ children }) {
  const [page, setPage] = useState("overview");
  const dark = page === "fabric" || page === "ledger";

  const NAV = [
    { id: "overview", label: "Executive overview", icon: LayoutGrid },
    { id: "explorer", label: "Identity explorer", icon: Search },
    { id: "resolver", label: "Duplicate resolver", icon: Scale },
    { id: "fabric", label: "Fabric graph", icon: Share2 },
    { id: "reconcile", label: "Reconciliation", icon: ShieldCheck },
    { id: "consent", label: "Consent & privacy", icon: Lock },
    { id: "ledger", label: "Governance ledger", icon: ScrollText },
  ];

  return (
    <div style={{ fontFamily: "Inter, ui-sans-serif, system-ui" }} className="w-full min-h-[900px] flex bg-[#F6F7FB]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');
        .disp { font-family: 'Space Grotesk', ui-sans-serif, system-ui; }
        .mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }
        @keyframes dashflow { to { stroke-dashoffset: -24; } }
        .thread-pending { stroke-dasharray: 6 5; animation: dashflow 1.4s linear infinite; }
        @keyframes pulsering { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
        .conflict-ring { animation: pulsering 1.8s ease-in-out infinite; }
      `}</style>

      <aside className="w-[248px] shrink-0 bg-white border-r border-[#E7E8F0] flex flex-col">
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="w-9 h-9 rounded-xl bg-[#4338CA] flex items-center justify-center">
            <Fingerprint size={18} color="white" />
          </div>
          <div>
            <div className="disp font-semibold text-[15px] text-[#161522] leading-tight">Inuka Unified</div>
            <div className="text-[10px] tracking-widest text-[#9694AE] font-semibold">FABRIC PLATFORM V4</div>
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = page === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setPage(n.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-colors ${
                  active ? "bg-[#EEF0FD] text-[#4338CA]" : "text-[#5B5A72] hover:bg-[#F6F7FB]"
                }`}
              >
                <Icon size={17} strokeWidth={2} />
                <span className="flex-1 text-left">{n.label}</span>
                {active && <ChevronRight size={14} />}
              </button>
            );
          })}
        </nav>
        <div className="px-4 py-3 mx-3 mb-3 rounded-lg bg-[#F1FBF6] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#12A150]" />
          <span className="text-[11.5px] font-medium text-[#12703B]">Matching engine live</span>
        </div>
        <div className="px-5 py-4 border-t border-[#E7E8F0] flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#4338CA] text-white text-[12px] font-semibold flex items-center justify-center">PK</div>
          <div>
            <div className="text-[13px] font-medium text-[#161522]">Peter Kamau</div>
            <div className="text-[10.5px] text-[#9694AE] font-semibold tracking-wide">ADMIN CLEARANCE</div>
          </div>
        </div>
      </aside>

      <main className={`flex-1 min-w-0 ${dark ? "bg-[#0B0F1B]" : "bg-[#F6F7FB]"}`}>
        <div className={`flex items-center justify-between px-8 py-4 border-b ${dark ? "border-white/10" : "border-[#E7E8F0]"}`}>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#12A150]" />
            <span className={`text-[11.5px] font-semibold tracking-wide ${dark ? "text-[#9BE8B7]" : "text-[#12703B]"}`}>
              INUKA SYSTEMS OPERATIONAL
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className={`text-[12.5px] ${dark ? "text-white/60" : "text-[#8B8AA0]"}`}>August 2026</span>
            <button className={`relative p-2 rounded-lg ${dark ? "hover:bg-white/5" : "hover:bg-[#F1F1F8]"}`}>
              <Bell size={16} className={dark ? "text-white/70" : "text-[#5B5A72]"} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#E5484D]" />
            </button>
          </div>
        </div>
        <div className="px-8 py-7 max-w-[1180px]">{children(page)}</div>
      </main>
    </div>
  );
}

function Kpi({ label, value, sub, accent }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E7E8F0] p-5">
      <div className="text-[11px] font-semibold tracking-wide text-[#9694AE] uppercase mb-2">{label}</div>
      <div className="disp text-[26px] font-semibold text-[#161522]" style={accent ? { color: accent } : {}}>{value}</div>
      <div className="text-[11.5px] text-[#9694AE] mt-1">{sub}</div>
    </div>
  );
}

function ImpactStrip() {
  const items = [
    { icon: Zap, label: "Reconciliation time", from: "40 hrs / run", to: "<1 min", tag: "99.9% faster" },
    { icon: Fingerprint, label: "Verification precision", from: "~75%", to: "97.6%", tag: "+30.1 pts" },
    { icon: FileWarning, label: "Mutual pairs collapsed", from: "17.99M raw", to: "via blocking", tag: "candidate blocking" },
  ];
  return (
    <div className="rounded-2xl bg-[#161233] p-6 grid grid-cols-3 gap-6 mb-7 relative overflow-hidden">
      <svg className="absolute inset-0 w-full h-full opacity-[0.15]" preserveAspectRatio="none">
        <path d="M0,60 C 200,10 400,110 600,50 S 900,90 1200,40" stroke="#8B7CF6" strokeWidth="1" fill="none" />
        <path d="M0,110 C 250,150 450,40 700,100 S 1000,30 1200,90" stroke="#38BDF8" strokeWidth="1" fill="none" />
      </svg>
      {items.map((it, i) => {
        const Icon = it.icon;
        return (
          <div key={i} className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Icon size={15} color="#A78BFA" />
              <span className="text-[11px] font-semibold text-[#B7B4D6] uppercase tracking-wide">{it.label}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[13px] text-[#716D93] line-through">{it.from}</span>
              <ArrowRight size={12} color="#716D93" />
              <span className="disp text-[19px] font-semibold text-white">{it.to}</span>
            </div>
            <div className="mt-2 inline-block text-[10.5px] font-semibold text-[#4ADE80] bg-[#0F2E1E] px-2 py-0.5 rounded-full">{it.tag}</div>
          </div>
        );
      })}
    </div>
  );
}

function Overview() {
  return (
    <>
      <h1 className="disp text-[28px] font-semibold text-[#161522] mb-1">Executive overview</h1>
      <p className="text-[13.5px] text-[#8B8AA0] mb-6">Near-real-time metrics, quality trends, and system alerts.</p>

      <ImpactStrip />

      <div className="grid grid-cols-4 gap-4 mb-4">
        <Kpi label="Total raw records" value="224" sub="Live operational metric" />
        <Kpi label="Trusted identities" value="99" sub="Live operational metric" accent="#4338CA" />
        <Kpi label="Pending human review" value="64" sub="Live operational metric" accent="#F5A524" />
        <Kpi label="Average data health" value="74.6%" sub="Live operational metric" accent="#0EA5A0" />
      </div>
      <div className="grid grid-cols-4 gap-4 mb-7">
        <Kpi label="Total disbursed" value="Ksh 1,680,000" sub="Live reconciliation view" />
        <Kpi label="Leakage prevented" value="Ksh 937,500" sub="Live reconciliation view" accent="#12A150" />
        <Kpi label="High-risk payments" value="Ksh 480,000" sub="Live reconciliation view" accent="#E5484D" />
        <Kpi label="Reconciliation rate" value="44.2%" sub="Live reconciliation view" accent="#4338CA" />
      </div>

      <div className="grid grid-cols-5 gap-3 mb-7">
        {QUALITY.map((q) => (
          <div key={q.label} className="bg-white rounded-2xl border border-[#E7E8F0] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10.5px] font-semibold text-[#9694AE] uppercase tracking-wide">{q.label}</span>
              <span className="text-[10px] text-[#B4B2C6]">{q.issues} issues</span>
            </div>
            <div className="disp text-[20px] font-semibold text-[#161522] mb-2">{q.value}%</div>
            <div className="h-1.5 rounded-full bg-[#F0F0F7] overflow-hidden mb-2">
              <div className="h-full rounded-full bg-gradient-to-r from-[#4338CA] to-[#0EA5A0]" style={{ width: `${q.value}%` }} />
            </div>
            <div className="text-[11px] text-[#9694AE] leading-snug">{q.desc}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 bg-white rounded-2xl border border-[#E7E8F0] p-6">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={15} color="#12A150" />
            <span className="font-medium text-[14px] text-[#161522]">30-day data quality trend</span>
          </div>
          <p className="text-[12px] text-[#9694AE] mb-4">Rolling daily average across all incoming program streams.</p>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TREND}>
                <defs>
                  <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4338CA" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#4338CA" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#F0F0F7" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#B4B2C6" }} axisLine={false} tickLine={false} interval={4} />
                <YAxis domain={[50, 100]} tick={{ fontSize: 10, fill: "#B4B2C6" }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="health" stroke="#4338CA" strokeWidth={2} fill="url(#hg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E7E8F0] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={14} color="#4338CA" />
            <span className="font-medium text-[14px] text-[#161522]">Cross-pillar ingestion</span>
          </div>
          <div className="space-y-3">
            {PROGRAMS.map((p) => (
              <div key={p.code} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="mono text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: p.tint, color: p.color }}>{p.code}</span>
                  <span className="text-[12.5px] text-[#4A4960]">{p.name}</span>
                </div>
                <span className="text-[12.5px] font-medium text-[#161522]">{p.raw}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function ScoreBar({ label, method, value, exactPass }) {
  const color = value >= 90 ? "#12A150" : value >= 70 ? "#F5A524" : "#E5484D";
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] font-medium text-[#4A4960]">{label}</span>
        <span className="mono text-[11px] font-semibold" style={{ color }}>
          {method === "exact" ? (exactPass ? "MATCH" : "NO MATCH") : `${value.toFixed(1)}%`}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[#F0F0F7] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${method === "exact" ? (exactPass ? 100 : 0) : value}%`, background: color }} />
      </div>
    </div>
  );
}

function Resolver() {
  const active = QUEUE[0];
  return (
    <>
      <h1 className="disp text-[28px] font-semibold text-[#161522] mb-1">Duplicate intelligence resolver</h1>
      <p className="text-[13.5px] text-[#8B8AA0] mb-6">Compare candidate records field-by-field before executing a controlled decision.</p>

      <div className="bg-white rounded-2xl border border-[#E7E8F0] p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Sparkles size={15} color="#4338CA" />
            <span className="font-medium text-[14px] text-[#161522]">AI confidence · {active.a} vs {active.b}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E7E8F0] text-[13px] font-medium text-[#5B5A72] hover:bg-[#F6F7FB]">
              <XCircle size={14} /> Keep separate
            </button>
            <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#4338CA] text-white text-[13px] font-medium hover:bg-[#372FA8]">
              <CheckCircle2 size={14} /> Merge identities
            </button>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center mb-6">
          <div className="rounded-xl bg-[#FCEBEB] p-4">
            <div className="mono text-[10px] font-semibold text-[#993C1D] mb-1">{active.a}</div>
            <div className="text-[15px] font-medium text-[#161522]">{active.nameA}</div>
          </div>
          <svg width="72" height="40" viewBox="0 0 72 40">
            <path d="M0,10 C 24,10 24,30 36,20 S 48,30 72,30" stroke="#E5484D" strokeWidth="2" fill="none" className="thread-pending" />
          </svg>
          <div className="rounded-xl bg-[#FCEBEB] p-4">
            <div className="mono text-[10px] font-semibold text-[#993C1D] mb-1">{active.b}</div>
            <div className="text-[15px] font-medium text-[#161522]">{active.nameB}</div>
          </div>
        </div>

        <div className="disp text-[30px] font-semibold text-[#161522] mb-5">{active.score}% <span className="text-[14px] font-normal text-[#9694AE] disp-none">match probability</span></div>

        <div className="grid grid-cols-2 gap-x-10">
          <div>
            <ScoreBar label="Full name (fuzz.ratio)" method="fuzzy" value={68.4} />
            <ScoreBar label="Location (fuzz.ratio)" method="fuzzy" value={41.2} />
          </div>
          <div>
            <ScoreBar label="National ID (exact)" method="exact" exactPass={false} />
            <ScoreBar label="Phone number (exact)" method="exact" exactPass={false} />
          </div>
        </div>
        <p className="text-[11.5px] text-[#9694AE] mt-2">National ID and phone both fail exact match — recommend keep separate pending manual document check.</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E7E8F0] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E8F0]">
          <div className="flex items-center gap-2">
            <GitMerge size={15} color="#4338CA" />
            <span className="font-medium text-[14px] text-[#161522]">Bulk merge queue</span>
            <span className="text-[11px] text-[#9694AE]">64 pending, sorted by confidence</span>
          </div>
          <button className="text-[12.5px] font-medium text-[#4338CA]">Auto-merge above 95% →</button>
        </div>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[10.5px] font-semibold text-[#9694AE] uppercase tracking-wide">
              <th className="px-6 py-2.5">Records</th>
              <th className="px-6 py-2.5">Program</th>
              <th className="px-6 py-2.5">ID / phone</th>
              <th className="px-6 py-2.5">Confidence</th>
              <th className="px-6 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {QUEUE.map((q, i) => {
              const prog = PROGRAMS.find((p) => p.code === q.program);
              return (
                <tr key={i} className="border-t border-[#F0F0F7]">
                  <td className="px-6 py-3">
                    <div className="text-[#161522] font-medium">{q.nameA}</div>
                    <div className="mono text-[10.5px] text-[#9694AE]">{q.a} · {q.b}</div>
                  </td>
                  <td className="px-6 py-3">{badge(prog.tint, prog.color, prog.code)}</td>
                  <td className="px-6 py-3">
                    <div className="flex gap-1.5">
                      {q.id ? <CheckCircle2 size={14} color="#12A150" /> : <XCircle size={14} color="#E5484D" />}
                      {q.phone ? <CheckCircle2 size={14} color="#12A150" /> : <XCircle size={14} color="#E5484D" />}
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className="font-semibold" style={{ color: q.score >= 90 ? "#12A150" : q.score >= 70 ? "#F5A524" : "#E5484D" }}>
                      {q.score}%
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button className="text-[12px] font-medium text-[#4338CA]">Review →</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function FabricGraph() {
  return (
    <>
      <h1 className="disp text-[28px] font-semibold text-white mb-1">Identity fabric graph</h1>
      <p className="text-[13.5px] text-white/50 mb-6">Threads connect candidate duplicates; solid = merged, dashed = awaiting review.</p>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <div className="text-[11px] font-semibold text-white/40 uppercase mb-1">Active clusters</div>
          <div className="disp text-[22px] font-semibold text-white">86</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <div className="text-[11px] font-semibold text-white/40 uppercase mb-1">Awaiting review</div>
          <div className="disp text-[22px] font-semibold text-[#F5A524]">38</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <div className="text-[11px] font-semibold text-white/40 uppercase mb-1">Identity conflicts</div>
          <div className="disp text-[22px] font-semibold text-[#E5484D]">3</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <div className="text-[11px] font-semibold text-white/40 uppercase mb-1">Confirmed merges (7d)</div>
          <div className="disp text-[22px] font-semibold text-[#4ADE80]">211</div>
        </div>
      </div>

      <div className="bg-white/[0.03] rounded-2xl border border-white/10 p-6 mb-5">
        <svg viewBox="0 0 800 380" width="100%" height="380">
          <path d="M120,90 Q 165,120 175,150" stroke="#4ADE80" strokeWidth="2" fill="none" />
          <path d="M175,150 Q 190,175 150,195" stroke="#4ADE80" strokeWidth="2" fill="none" />
          <circle cx="120" cy="90" r="9" fill="#4338CA" />
          <circle cx="175" cy="150" r="13" fill="#7C6EF0" />
          <circle cx="150" cy="195" r="9" fill="#4338CA" />
          <text x="175" y="230" textAnchor="middle" fill="#B7B4D6" fontSize="11" fontFamily="Inter">Grace Kamau — merged</text>

          <g className="conflict-ring">
            <circle cx="420" cy="110" r="34" fill="none" stroke="#E5484D" strokeWidth="1.5" />
          </g>
          <path d="M400,95 Q 420,105 415,125" stroke="#E5484D" strokeWidth="1.5" fill="none" className="thread-pending" />
          <path d="M415,125 Q 425,140 445,130" stroke="#E5484D" strokeWidth="1.5" fill="none" className="thread-pending" />
          <path d="M445,130 Q 430,105 400,95" stroke="#E5484D" strokeWidth="1.5" fill="none" className="thread-pending" />
          <circle cx="400" cy="95" r="8" fill="#F0997B" />
          <circle cx="415" cy="125" r="8" fill="#F0997B" />
          <circle cx="445" cy="130" r="8" fill="#F0997B" />
          <text x="420" y="170" textAnchor="middle" fill="#F0997B" fontSize="11" fontFamily="Inter">ANO-003 · 3 records, same National ID</text>

          <path d="M600,80 Q 630,100 615,130" stroke="#F5A524" strokeWidth="1.5" fill="none" strokeDasharray="6 5" />
          <circle cx="600" cy="80" r="7" fill="#0EA5A0" />
          <circle cx="615" cy="130" r="7" fill="#0EA5A0" />
          <text x="608" y="150" textAnchor="middle" fill="#B7B4D6" fontSize="11" fontFamily="Inter">88.1% · pending</text>

          {[[70,300],[130,330],[250,300],[300,340],[520,300],[560,330],[680,300],[720,270],[640,190],[560,220],[260,220],[330,180],[490,180]].map(([x,y],i)=> (
            <circle key={i} cx={x} cy={y} r="5" fill="#5B5A72" opacity="0.6" />
          ))}
        </svg>
        <div className="flex items-center gap-6 pt-2 border-t border-white/10 mt-2">
          <div className="flex items-center gap-2"><span className="w-6 h-[2px] bg-[#4ADE80]" /><span className="text-[11px] text-white/50">Confirmed merge</span></div>
          <div className="flex items-center gap-2"><span className="w-6 h-[2px] bg-[#F5A524]" style={{borderTop:"2px dashed #F5A524"}} /><span className="text-[11px] text-white/50">Awaiting review</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full border border-[#E5484D]" /><span className="text-[11px] text-white/50">Identity conflict — needs verification</span></div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#5B5A72]" /><span className="text-[11px] text-white/50">Singleton, no candidate match</span></div>
        </div>
      </div>
    </>
  );
}

function Reconcile() {
  return (
    <>
      <h1 className="disp text-[28px] font-semibold text-[#161522] mb-1">Reconciliation & leakage</h1>
      <p className="text-[13.5px] text-[#8B8AA0] mb-6">Ties stipend disbursement records against M&E attendance data.</p>

      <div className="grid grid-cols-3 gap-5 mb-6">
        <div className="col-span-2 bg-white rounded-2xl border border-[#E7E8F0] p-6">
          <span className="font-medium text-[14px] text-[#161522]">Leakage prevented, month over month</span>
          <div style={{ height: 200 }} className="mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={LEAKAGE}>
                <CartesianGrid vertical={false} stroke="#F0F0F7" />
                <XAxis dataKey="m" tick={{ fontSize: 11, fill: "#B4B2C6" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#B4B2C6" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => `Ksh ${v}k`} />
                <Bar dataKey="prevented" radius={[4, 4, 0, 0]} fill="#12A150" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#E7E8F0] p-6">
          <span className="font-medium text-[14px] text-[#161522]">Auto-reconciliation</span>
          <p className="text-[11.5px] text-[#9694AE] mt-1 mb-4">Hold disbursement automatically when attendance mismatch exceeds threshold.</p>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12.5px] text-[#4A4960]">Mismatch threshold</span>
            <span className="mono text-[12.5px] font-semibold text-[#4338CA]">15%</span>
          </div>
          <div className="h-1.5 rounded-full bg-[#F0F0F7] mb-5"><div className="h-full w-[15%] rounded-full bg-[#4338CA]" /></div>
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#F1FBF6]">
            <span className="text-[12.5px] font-medium text-[#12703B]">Enabled — holding on mismatch</span>
            <span className="w-8 h-4.5 rounded-full bg-[#12A150] relative"><span className="absolute right-0.5 top-0.5 w-3.5 h-3.5 bg-white rounded-full" /></span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E7E8F0] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E7E8F0] flex items-center gap-2">
          <AlertTriangle size={15} color="#E5484D" />
          <span className="font-medium text-[14px] text-[#161522]">High-risk payments held for review</span>
        </div>
        {[
          { id: "DSB-2291", name: "Charles Wafula", program: "SCH", amt: "Ksh 12,000", reason: "0 attendance days logged against a full-term stipend." },
          { id: "DSB-2304", name: "Njeri Kariuki", program: "VOC", amt: "Ksh 18,500", reason: "Beneficiary matched to 2 active disbursement records." },
          { id: "DSB-2318", name: "Beatrice Wanjiku", program: "TEC", amt: "Ksh 9,000", reason: "Bank account changed 3 times in 30 days." },
        ].map((r, i) => {
          const prog = PROGRAMS.find((p) => p.code === r.program);
          return (
            <div key={i} className="flex items-center justify-between px-6 py-3.5 border-t border-[#F0F0F7]">
              <div className="flex items-center gap-3">
                {badge(prog.tint, prog.color, prog.code)}
                <div>
                  <div className="text-[13px] font-medium text-[#161522]">{r.name} <span className="mono text-[10.5px] text-[#9694AE]">· {r.id}</span></div>
                  <div className="text-[11.5px] text-[#9694AE]">{r.reason}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[13px] font-semibold text-[#E5484D]">{r.amt}</span>
                <button className="text-[12px] font-medium text-[#4338CA]">Investigate →</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Consent() {
  const rows = PROGRAMS.map((p, i) => ({ ...p, granted: [82, 74, 91, 68][i], pending: [12, 18, 7, 22][i], revoked: [6, 8, 2, 10][i] }));
  return (
    <>
      <h1 className="disp text-[28px] font-semibold text-[#161522] mb-1">Consent & privacy</h1>
      <p className="text-[13.5px] text-[#8B8AA0] mb-6">Digital consent tracking and KDPA-aligned data handling controls.</p>

      <div className="grid grid-cols-3 gap-5 mb-6">
        <div className="col-span-2 bg-white rounded-2xl border border-[#E7E8F0] p-6">
          <span className="font-medium text-[14px] text-[#161522] mb-4 block">Consent status by program</span>
          <div className="space-y-4">
            {rows.map((r) => (
              <div key={r.code}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {badge(r.tint, r.color, r.code)}
                    <span className="text-[12.5px] text-[#4A4960]">{r.name}</span>
                  </div>
                  <span className="text-[11.5px] text-[#9694AE]">{r.granted}% granted</span>
                </div>
                <div className="h-2 rounded-full bg-[#F0F0F7] overflow-hidden flex">
                  <div className="h-full bg-[#12A150]" style={{ width: `${r.granted}%` }} />
                  <div className="h-full bg-[#F5A524]" style={{ width: `${r.pending}%` }} />
                  <div className="h-full bg-[#E5484D]" style={{ width: `${r.revoked}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-5 mt-5 pt-4 border-t border-[#F0F0F7]">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#12A150]" /><span className="text-[11px] text-[#9694AE]">Granted</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#F5A524]" /><span className="text-[11px] text-[#9694AE]">Pending</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#E5484D]" /><span className="text-[11px] text-[#9694AE]">Revoked</span></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E7E8F0] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock size={15} color="#4338CA" />
            <span className="font-medium text-[14px] text-[#161522]">PII masking</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#FCEBEB] mb-4">
            <div className="flex items-center gap-2">
              <EyeOff size={14} color="#993C1D" />
              <span className="text-[12.5px] font-medium text-[#993C1D]">Currently unmasked</span>
            </div>
            <span className="w-8 h-4.5 rounded-full bg-[#E5484D] relative"><span className="absolute left-0.5 top-0.5 w-3.5 h-3.5 bg-white rounded-full" /></span>
          </div>
          <p className="text-[11.5px] text-[#9694AE] mb-4">Toggled off for active duplicate review by Peter Kamau at 12:43:55.</p>
          <div className="space-y-2.5">
            {["Kenya Data Protection Act — consent basis logged", "Anonymisation reversible only by admin clearance", "Retention: 24 months post program exit"].map((t, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 size={14} color="#12A150" className="mt-0.5 shrink-0" />
                <span className="text-[12px] text-[#4A4960] leading-snug">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function Ledger() {
  const typeColor = { GOVERNANCE: "#7C6EF0", MERGE: "#4ADE80", RECONCILE: "#F5A524", CONSENT: "#38BDF8" };
  return (
    <>
      <h1 className="disp text-[28px] font-semibold text-white mb-1">Operations audit trail</h1>
      <p className="text-[13.5px] text-white/50 mb-6">Immutable, chronological registry of automated and human decisions.</p>

      <div className="flex items-center gap-2 mb-4">
        {Object.keys(typeColor).map((t) => (
          <button key={t} className="px-3 py-1.5 rounded-full text-[11px] font-semibold border border-white/10" style={{ color: typeColor[t] }}>{t}</button>
        ))}
      </div>

      <div className="bg-white/[0.03] rounded-2xl border border-white/10 overflow-hidden">
        {LEDGER.map((e, i) => (
          <div key={i} className="flex items-start gap-4 px-6 py-4 border-t border-white/5 first:border-t-0">
            <span className="mono text-[11px] text-white/40 pt-0.5 w-[60px] shrink-0">{e.t}</span>
            <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: `${typeColor[e.type]}22`, color: typeColor[e.type] }}>{e.type}</span>
            <span className="text-[13px] text-white/80 flex-1">{e.text}</span>
            <span className="text-[11px] text-white/40 shrink-0">{e.who}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export default function InukaFabricPlatform() {
  return (
    <Shell>
      {(page) => {
        if (page === "overview") return <Overview />;
        if (page === "resolver") return <Resolver />;
        if (page === "fabric") return <FabricGraph />;
        if (page === "reconcile") return <Reconcile />;
        if (page === "consent") return <Consent />;
        if (page === "ledger") return <Ledger />;
        return (
          <>
            <h1 className="disp text-[28px] font-semibold text-[#161522] mb-1">Identity explorer</h1>
            <p className="text-[13.5px] text-[#8B8AA0] mb-6">Search deduplicated beneficiary profiles by identity, location, or phone — unchanged from current build, styling refreshed to match.</p>
            <div className="bg-white rounded-2xl border border-[#E7E8F0] p-6 flex items-center gap-2 text-[13px] text-[#9694AE]">
              <Search size={15} /> Search name, national ID, phone…
            </div>
          </>
        );
      }}
    </Shell>
  );
}
