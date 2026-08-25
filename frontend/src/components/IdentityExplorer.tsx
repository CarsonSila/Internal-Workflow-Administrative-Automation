import { useState } from "react";
import { useDebounce } from "use-debounce";
import { AlertTriangle, EyeOff, HelpCircle, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useIdentities, useMutation, useQueryClient } from "../api/hooks";
import api from "../api/client";

interface Identity {
  id: string;
  name: string;
  nid: string;
  programs: string[];
  confidence: number;
  health: number;
  status: string;
}

export default function IdentityExplorer() {
  const { token } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [maskingActive, setMaskingActive] = useState(false);
  const [debouncedSearch] = useDebounce(search, 300);

  const { data: identities = [], isLoading, error, refetch } = useIdentities(
    statusFilter === "all" ? undefined : statusFilter,
    debouncedSearch || undefined
  );

  const queryClient = useQueryClient();

  const toggleAnonymisation = async () => {
    try {
      const response = await api.post("/api/v1/governance/anonymise");
      setMaskingActive(response.data.masking_enabled);
      queryClient.invalidateQueries({ queryKey: ["identities"] });
    } catch (err) {
      console.error("Failed to toggle anonymisation:", err);
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  const badge = (status: string) => status === "Verified"
    ? <span className="badge text-emerald-300"><ShieldCheck size={13} /> Verified</span>
    : status === "Review" ? <span className="badge text-amber-300"><AlertTriangle size={13} /> Needs review</span>
    : <span className="badge text-rose-300"><HelpCircle size={13} /> Conflict</span>;

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl shadow-slate-950/40 sm:p-6">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="eyebrow">Master records</p>
          <h2 className="section-title">Identity explorer</h2>
          <p className="section-copy">Search deduplicated beneficiary profiles by identity, location, or phone.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleAnonymisation}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition ${
              maskingActive
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600"
            }`}
            title="Toggle KDPA PII masking"
          >
            <EyeOff size={15} />{maskingActive ? "PII masked" : "Mask PII"}
          </button>
          <button
            onClick={handleRefresh}
            className="icon-button"
            title="Refresh identities"
            disabled={isLoading}
          >
            <RefreshCw size={17} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-[1fr_240px]">
        <label className="relative block">
          <Search className="absolute left-3 top-3 text-slate-500" size={17} />
          <input
            className="field pl-10"
            placeholder="Search name, national ID, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          className="field"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="Verified">Verified</option>
          <option value="Review">Needs review</option>
          <option value="Conflict">Conflicts</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          {error.message}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[900px] text-left">
          <thead className="bg-slate-950/70 text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              {["ID", "Name", "National ID", "Programs", "Confidence", "Health", "Status"].map((heading) => (
                <th key={heading} className="px-4 py-3">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <RefreshCw className="mx-auto mb-2 animate-spin text-cyan-400" size={20} />Loading identities...
                </td>
              </tr>
            ) : identities.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">No identities match these filters.</td>
              </tr>
            ) : (
              identities.map((row) => (
                <tr key={row.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-4 font-mono text-xs font-bold text-cyan-400">{row.id}</td>
                  <td className="px-4 py-4 font-semibold text-white">{row.name}</td>
                  <td className="px-4 py-4 font-mono text-xs text-slate-300">{row.nid || "N/A"}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      {row.programs.map((program) => (
                        <span
                          key={program}
                          className="rounded border border-cyan-400/10 bg-cyan-400/10 px-2 py-1 text-[10px] font-bold uppercase text-cyan-300"
                        >
                          {program}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4">{score(row.confidence, row.confidence >= 85 ? "bg-emerald-400" : row.confidence >= 60 ? "bg-amber-400" : "bg-rose-400")}</td>
                  <td className="px-4 py-4">{score(row.health, "bg-cyan-400")}</td>
                  <td className="px-4 py-4">{badge(row.status)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function score(value: number, color: string) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-300">{value}%</span>
    </div>
  );
}