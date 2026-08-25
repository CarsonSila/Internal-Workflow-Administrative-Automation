import { useState } from "react";
import { Check, RefreshCw, Scale, ShieldAlert, Sparkles, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCompareRecords, useResolveDuplicate } from "../api/hooks";

interface DuplicateResolutionProps {
  initialRecordA?: string;
  initialRecordB?: string;
  defaultRecordA?: string;
  defaultRecordB?: string;
}

export default function DuplicateResolution({
  initialRecordA,
  initialRecordB,
  defaultRecordA,
  defaultRecordB,
}: DuplicateResolutionProps) {
  const { user, token } = useAuth();
  const [recordAId, setRecordAId] = useState(initialRecordA ?? defaultRecordA ?? "REC-PLU-10001");
  const [recordBId, setRecordBId] = useState(initialRecordB ?? defaultRecordB ?? "REC-SCH-10002");
  const [message, setMessage] = useState("");

  const { data, isLoading, error, refetch } = useCompareRecords(recordAId, recordBId);
  const resolveMutation = useResolveDuplicate();

  const handleResolve = async (action: "merge" | "reject") => {
    setMessage("");
    try {
      await resolveMutation.mutateAsync({
        record_a_id: recordAId,
        record_b_id: recordBId,
        action,
        user: user?.username || "admin_kamau",
      });
      setMessage("Successfully resolved duplicate.");
      refetch();
    } catch (err: any) {
      setMessage(err?.response?.data?.message || err?.message || "Resolution failed.");
    }
  };

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl shadow-slate-950/40 sm:p-6">
      <div className="mb-6">
        <p className="eyebrow">Human review queue</p>
        <h2 className="section-title flex items-center gap-2">
          <Scale className="text-cyan-400" size={23} />Duplicate resolution
        </h2>
        <p className="section-copy">Compare identity signals, then record a merge or keep-separate decision.</p>
      </div>

      <div className="mb-5 grid gap-3 rounded-lg border border-slate-800 bg-slate-950/50 p-4 sm:grid-cols-2">
        <label className="label">Record ID A
          <input className="field mt-2 font-mono text-cyan-300" value={recordAId} onChange={(e) => setRecordAId(e.target.value)} />
        </label>
        <label className="label">Record ID B
          <input className="field mt-2 font-mono text-cyan-300" value={recordBId} onChange={(e) => setRecordBId(e.target.value)} />
        </label>
      </div>

      {message && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-3 text-sm text-cyan-100">
          <ShieldAlert size={17} />{message}
        </div>
      )}

      {isLoading ? (
        <div className="py-16 text-center text-slate-500">
          <RefreshCw className="mx-auto mb-2 animate-spin text-cyan-400" size={22} />Analyzing similarities...
        </div>
      ) : error ? (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error.message}
        </div>
      ) : data && (
        <div className="space-y-5">
          <div className="flex flex-col justify-between gap-4 rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-5 sm:flex-row sm:items-center">
            <div>
              <span className="eyebrow flex items-center gap-1"><Sparkles size={13} /> AI confidence</span>
              <strong className="mt-1 block text-2xl text-white">{data.overall_confidence}% match probability</strong>
            </div>
            <div className="flex gap-2">
              <button
                className="action-secondary"
                disabled={resolveMutation.isPending}
                onClick={() => handleResolve("reject")}
              >
                <X size={16} /> Keep separate
              </button>
              <button
                className="action-primary"
                disabled={resolveMutation.isPending}
                onClick={() => handleResolve("merge")}
              >
                <Check size={16} /> Merge identities
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[data.record_a, data.record_b].map((record, index) => (
              <article key={record.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
                <header className="flex items-center justify-between">
                  <span className="eyebrow">Record {index === 0 ? "A" : "B"}</span>
                  <span className="font-mono text-xs text-cyan-300">{record.id}</span>
                </header>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">Name</span><strong className="text-white">{record.name}</strong></div>
                  <div className="flex justify-between"><span className="text-slate-400">Program</span><span className="font-bold text-cyan-300">{record.program}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Phone</span><span className="font-mono text-slate-300">{record.phone}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Email</span><span className="font-mono text-slate-300">{record.email}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">National ID</span><span className="font-mono text-slate-300">{record.national_id}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Location</span><span className="text-slate-300">{record.location}</span></div>
                </div>
              </article>
            ))}
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
            <h4 className="font-bold text-white mb-3">Field-by-field comparison</h4>
            <div className="space-y-2">
              {data.comparisons.map((cmp) => (
                <div key={cmp.key} className="flex items-center justify-between">
                  <span className="text-sm text-slate-300 capitalize">{cmp.label}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${cmp.score}%`,
                          backgroundColor:
                            cmp.status === "exact" ? "#10b981" :
                            cmp.status === "strong" ? "#3b82f6" :
                            cmp.status === "partial" ? "#f59e0b" : "#ef4444",
                        }}
                      />
                    </div>
                    <span className="font-mono text-xs text-white w-10 text-right">{cmp.score.toFixed(0)}%</span>
                    <span className={`badge text-[10px] ${
                      cmp.status === "exact" ? "text-emerald-300" :
                      cmp.status === "strong" ? "text-blue-300" :
                      cmp.status === "partial" ? "text-amber-300" : "text-rose-300"
                    }`}>
                      {cmp.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}