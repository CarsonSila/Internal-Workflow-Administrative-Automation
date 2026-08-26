import { useState } from "react";
import { CheckCircle2, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToggleKdpaAnonymisation } from "../api/hooks";

export default function ConsentPrivacy() {
  const { user } = useAuth();
  const [masked, setMasked] = useState(false);
  const [message, setMessage] = useState("");

  const toggleMutation = useToggleKdpaAnonymisation();

  const toggle = async () => {
    try {
      const result = await toggleMutation.mutateAsync();
      setMasked(result.masking_enabled);
      setMessage(result.masking_enabled ? "PII masking enabled" : "PII masking disabled");
    } catch (err: any) {
      setMessage(err?.response?.data?.detail ?? "Failed to toggle masking.");
    }
  };

  const rows = [
    { name: "Scholarship", granted: 82, pending: 12, revoked: 6 },
    { name: "Plus", granted: 74, pending: 18, revoked: 8 },
    { name: "Vocational", granted: 91, pending: 7, revoked: 2 },
    { name: "Tech Fellowship", granted: 68, pending: 22, revoked: 10 },
  ];

  return (
    <div className="space-y-6 animate-fadeInUp">
      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800">
          {message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <section className="executive-card p-5 sm:p-6">
          <div className="mb-5">
            <p className="eyebrow">Consent coverage</p>
            <h2 className="section-title">Consent status by program</h2>
            <p className="section-copy">KDPA-aligned consent tracking for operational beneficiary records.</p>
          </div>
          <div className="space-y-5">
            {rows.map((row) => (
              <div key={row.name}>
                <div className="mb-2 flex justify-between text-xs">
                  <span className="font-bold text-slate-700">{row.name}</span>
                  <span className="text-slate-500">{row.granted}% granted</span>
                </div>
                <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="bg-emerald-500" style={{ width: `${row.granted}%` }} />
                  <div className="bg-amber-400" style={{ width: `${row.pending}%` }} />
                  <div className="bg-rose-400" style={{ width: `${row.revoked}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-5 border-t border-slate-100 pt-4 text-[11px] text-slate-500">
            <span>
              <i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" /> Granted
            </span>
            <span>
              <i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-amber-400" /> Pending
            </span>
            <span>
              <i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-rose-400" /> Revoked
            </span>
          </div>
        </section>

        <section className="executive-card p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock size={15} color="#00828a" />
            <span className="font-medium text-[14px] text-slate-900">PII masking (KDPA)</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-50 mb-4">
            <div className="flex items-center gap-2">
              <EyeOff size={14} color={masked ? "#00828a" : "#993C1D"} />
              <span className="text-[12.5px] font-medium" style={{ color: masked ? "#00828a" : "#993C1D" }}>
                {masked ? "Currently masked" : "Currently unmasked"}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={masked}
                onChange={toggle}
                disabled={toggleMutation.isPending || (user?.role !== "admin" && user?.role !== "manager")}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#00828a]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00828a]"></div>
            </label>
          </div>
          <p className="text-[11.5px] text-slate-500 mb-4">
            {masked
              ? "PII fields (National ID, Phone, Email) are masked in all views per KDPA."
              : "PII fields are visible. Toggle on for active duplicate review."}
          </p>
          {toggleMutation.isPending && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <RefreshCw className="animate-spin text-[#00828a]" size={14} />
              Updating masking state...
            </div>
          )}
          {(user?.role !== "admin" && user?.role !== "manager") && (
            <p className="mt-3 text-xs text-slate-500">Admin/Manager access required to toggle masking.</p>
          )}
          <div className="space-y-2.5">
            {[
              "Kenya Data Protection Act — consent basis logged",
              "Anonymisation reversible only by admin clearance",
              "Retention: 24 months post program exit",
            ].map((t, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 size={14} color="#12A150" className="mt-0.5 shrink-0" />
                <span className="text-[12px] text-slate-600 leading-snug">{t}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}