import { AlertTriangle, ArrowRight, RefreshCw, Send } from "lucide-react";
import { useAnomalies } from "../api/hooks";

interface Props { onSelectCompare: (recordA: string, recordB: string) => void; }

export default function AnomaliesFeed({ onSelectCompare }: Props) {
  const { data: anomalies = [], isLoading, error } = useAnomalies();

  if (isLoading) return <Panel><div className="flex items-center justify-center py-12 text-slate-400"><RefreshCw className="mr-2 animate-spin text-cyan-400" size={19} />Loading anomalies...</div></Panel>;

  return (
    <Panel>
      <div className="mb-5">
        <p className="eyebrow">Signal monitor</p>
        <h2 className="section-title flex items-center gap-2">
          <AlertTriangle className="text-amber-400" size={22} />Anomalies and warnings
        </h2>
        <p className="section-copy">Flags from profiling, cross-program audits, and identity resolution.</p>
      </div>
      {error ? (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error.message}
        </div>
      ) : (
        <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
          {anomalies.map((item) => (
            <article key={item.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 transition hover:border-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[10px] font-bold text-slate-500">{item.id}</span>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-cyan-400/10 px-2 py-1 text-[10px] font-bold uppercase text-cyan-300">{item.program}</span>
                  <span className="rounded-full border border-slate-700 px-2 py-1 text-[10px] font-bold uppercase text-slate-300">{item.level}</span>
                </div>
              </div>
              <h3 className="mt-3 text-sm font-bold text-white">{item.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{item.detail}</p>
              {item.records.length >= 2 && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="font-mono text-[10px] text-slate-400">Records:</span>
                  {item.records.slice(0, 3).map((r, i) => (
                    <span key={r} className="font-mono text-[10px] bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      {r}
                    </span>
                  ))}
                  {item.records.length > 3 && (
                    <span className="font-mono text-[10px] text-slate-500">+{item.records.length - 3} more</span>
                  )}
                </div>
              )}
              {item.records.length >= 2 && (
                <button
                  onClick={() => onSelectCompare(item.records[0], item.records[1])}
                  className="mt-4 w-full sm:w-auto flex items-center gap-1.5 rounded bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-700 transition"
                >
                  <ArrowRight size={12} /> Compare
                </button>
              )}
            </article>
          ))}
          {anomalies.length === 0 && (
            <div className="text-center py-8 text-slate-400">No anomalies detected.</div>
          )}
        </div>
      )}
    </Panel>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-2xl shadow-slate-950/30 sm:p-6">{children}</section>;
}