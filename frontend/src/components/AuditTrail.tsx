import { useState } from "react";
import { Calendar, List, RefreshCw, User } from "lucide-react";
import { useAuditTrail } from "../api/hooks";

interface AuditLog {
  time: string;
  event: string;
  detail: string;
  type: string;
  user: string;
}

type GroupedAudits = Record<string, AuditLog[]>;

export default function AuditTrail() {
  const { data: auditGroup, isLoading, error, refetch } = useAuditTrail();

  if (isLoading) {
    return (
      <Panel>
        <div className="flex items-center justify-center py-12 text-slate-400">
          <RefreshCw className="mr-2 animate-spin text-cyan-400" size={19} />
          Loading audit logs...
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="eyebrow">Governance ledger</p>
          <h2 className="section-title flex items-center gap-2">
            <List className="text-cyan-400" size={22} />
            Operations audit trail
          </h2>
          <p className="section-copy">Chronological registry of automated transactions and human decisions.</p>
        </div>
        <button
          onClick={() => refetch()}
          className="icon-button"
          title="Refresh audit trail"
          disabled={isLoading}
        >
          <RefreshCw size={17} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error.message}
        </div>
      )}

      <div className="max-h-[680px] space-y-6 overflow-y-auto pr-1">
        {auditGroup && Object.entries(auditGroup).map(([date, logs]) => (
          <div key={date}>
            <div className="mb-3 flex items-center gap-2 rounded border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-bold text-slate-300">
              <Calendar size={14} className="text-cyan-400" />
              {date}
            </div>
            <div className="space-y-2 border-l border-slate-800 pl-4">
              {logs.map((log, index) => (
                <article key={`${date}-${index}`} className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
                  <div className="flex flex-col justify-between gap-2 md:flex-row md:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-slate-500">{log.time}</span>
                        <strong className="text-sm text-white">{log.event}</strong>
                        <span className="rounded border border-slate-700 px-2 py-0.5 text-[10px] uppercase text-slate-400">{log.type}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-300">{log.detail}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <User size={12} />
                      <span className="font-mono">{log.user}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}

        {!auditGroup || Object.keys(auditGroup).length === 0 ? (
          <div className="text-center py-8 text-slate-400">No audit logs available.</div>
        ) : null}
      </div>
    </Panel>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-2xl shadow-slate-950/30 sm:p-6">
      {children}
    </section>
  );
}