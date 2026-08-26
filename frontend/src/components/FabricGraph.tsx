import { useState } from "react";
import { AlertTriangle, GitMerge, Network, RefreshCw, ShieldCheck } from "lucide-react";
import { useAnomalies } from "../api/hooks";

interface Anomaly {
  id: string;
  title: string;
  detail: string;
  level: string;
  records: string[];
  program: string;
  color: string;
}

export default function FabricGraph() {
  const { data: anomalies = [], isLoading, error, refetch } = useAnomalies();

  const linked = anomalies.filter((item) => item.records.length >= 2).slice(0, 3);
  const nodes = linked.flatMap((item) => item.records.slice(0, 3));
  const uniqueNodes = [...new Set(nodes)];

  return (
    <div className="space-y-6 animate-fadeInUp">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active clusters" value={linked.length.toString()} icon={<Network size={17} />} />
        <Stat
          label="Awaiting review"
          value={anomalies.filter((item) => item.level === "Review").length.toString()}
          icon={<AlertTriangle size={17} />}
          tone="text-amber-600"
        />
        <Stat
          label="Identity conflicts"
          value={anomalies.filter((item) => item.level === "Anomaly").length.toString()}
          icon={<AlertTriangle size={17} />}
          tone="text-rose-600"
        />
        <Stat
          label="Confirmed signals"
          value={uniqueNodes.length.toString()}
          icon={<GitMerge size={17} />}
          tone="text-emerald-600"
        />
      </div>

      <section className="executive-card overflow-hidden p-5 sm:p-6">
        <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="section-title flex items-center gap-2">
              <Network className="text-indigo-600" size={21} />
              Identity fabric graph
            </h2>
            <p className="section-copy">Live anomaly clusters and candidate links from the loaded source records.</p>
          </div>
          <button
            className="icon-button"
            onClick={() => refetch()}
            title="Refresh graph"
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>

        {error ? (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            {error.message}
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <RefreshCw className="mr-2 animate-spin text-cyan-400" size={19} />
            Loading fabric graph...
          </div>
        ) : (
          <div className="relative min-h-[360px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <svg viewBox="0 0 900 360" className="h-[360px] w-full">
              <defs>
                <filter id="softShadow">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity=".15" />
                </filter>
              </defs>
              {linked.map((item, index) => {
                const centerX = 180 + index * 270;
                const color = item.level === "Anomaly" ? "#e11d48" : "#d97706";
                return (
                  <g key={item.id}>
                    <path
                      d={`M ${centerX - 55} 150 Q ${centerX} ${80 + index * 18} ${centerX + 55} 150`}
                      fill="none"
                      stroke={color}
                      strokeWidth="2"
                      strokeDasharray={item.level === "Review" ? "7 6" : undefined}
                    />
                    <circle cx={centerX} cy={150} r={18} fill={color} filter="url(#softShadow)" />
                    <circle cx={centerX - 55} cy={150} r={12} fill="#0ea5a0" />
                    <circle cx={centerX + 55} cy={150} r={12} fill="#0ea5a0" />
                    <text
                      x={centerX}
                      y={185}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="11"
                      fontFamily="Inter"
                    >
                      {item.title}
                    </text>
                    <text
                      x={centerX}
                      y={200}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="9"
                      fontFamily="JetBrains Mono"
                    >
                      {item.records.slice(0, 2).join(" · ")}
                    </text>
                  </g>
                );
              })}
              {uniqueNodes
                .filter((n) => !linked.some((item) => item.records.includes(n)))
                .slice(0, 10)
                .map((n, i) => (
                  <circle
                    key={n}
                    cx={120 + (i % 5) * 140}
                    cy={280 + Math.floor(i / 5) * 40}
                    r={8}
                    fill="#64748b"
                    opacity="0.5"
                  />
                ))}
            </svg>
            <div className="flex items-center gap-6 pt-2 border-t border-slate-200 mt-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-[2px] bg-emerald-600" />
                <span className="text-[11px] text-slate-600">Confirmed merge</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-[2px] bg-amber-500" style={{ borderTop: "2px dashed #f59e0b" }} />
                <span className="text-[11px] text-slate-600">Awaiting review</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full border border-rose-600" />
                <span className="text-[11px] text-slate-600">Identity conflict — needs verification</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                <span className="text-[11px] text-slate-600">Singleton, no candidate match</span>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  tone = "text-indigo-600",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: string;
}) {
  return (
    <article className="executive-card p-4">
      <div className={`mb-2 flex items-center gap-2 ${tone}`}>
        {icon}
        <span className="eyebrow">{label}</span>
      </div>
      <strong className="text-2xl font-black text-slate-900">{value}</strong>
    </article>
  );
}