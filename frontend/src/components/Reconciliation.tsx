import { useState } from "react";
import { AlertTriangle, BarChart3, CheckCircle, Coins, RefreshCw, Send, Sliders } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "../context/AuthContext";
import {
  useFinancialReconciliation,
  useFinancialLeakageTrend,
  useHighRiskPayments,
  useReconciliationSettings,
  useUpdateReconciliationSettings,
  useDispatchNotification,
} from "../api/hooks";

export default function Reconciliation() {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [notifying, setNotifying] = useState<string | null>(null);

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useFinancialReconciliation();
  const { data: trend } = useFinancialLeakageTrend();
  const { data: payments } = useHighRiskPayments();
  const { data: settings, refetch: refetchSettings } = useReconciliationSettings();
  const updateSettingsMutation = useUpdateReconciliationSettings();
  const dispatchNotificationMutation = useDispatchNotification();

  const handleSaveSettings = async (next: { mismatch_threshold: number; holding_on_mismatch: boolean }) => {
    if (user?.role !== "admin") {
      setMessage("Only administrators can update these rules.");
      return;
    }
    setSaving(true);
    try {
      await updateSettingsMutation.mutateAsync(next);
      setMessage("Auto-reconciliation rules updated.");
      refetchSettings();
      refetchSummary();
    } catch (err: any) {
      setMessage(err?.response?.data?.detail ?? "Failed to update settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleDispatchNotification = async (payment: any, channel: "sms" | "whatsapp", recipient: string) => {
    setNotifying(payment.id);
    try {
      await dispatchNotificationMutation.mutateAsync({
        channel,
        recipient,
        reference_id: payment.id,
        message: `Inuka review required for ${payment.name}: ${payment.reason}`,
      });
      setMessage(`${channel.toUpperCase()} notification queued for ${payment.id}.`);
    } catch (err: any) {
      setMessage(err?.response?.data?.detail ?? "Notification failed.");
    } finally {
      setNotifying(null);
    }
  };

  const isLoading = summaryLoading;

  function money(value: number) {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(value);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-slate-500">
        <RefreshCw className="mr-2 animate-spin text-[#00828a]" />
        Hydrating disbursement audits...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeInUp">
      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800">
          {message}
        </div>
      )}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card label="Total program outlay" value={money(summary.total_disbursed)} />
          <Card label="Double payments prevented" value={money(summary.duplicate_leakage_prevented)} tone="text-emerald-700" />
          <Card label="Active high-risk exposure" value={money(summary.high_risk_payments_flagged)} tone="text-amber-700" />
          <Card label="Reconciliation rate" value={`${summary.reconciliation_rate}%`} tone="text-[#00828a]" />
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <section className="executive-card p-5 sm:p-6">
          <div className="mb-4">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
              <Coins className="text-[#00828a]" size={18} />
              Leakage prevented, month over month
            </h2>
            <p className="text-xs text-slate-400">Duplicate-linked disbursements prevented by identity consolidation.</p>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend || []}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip formatter={(value) => [`KES ${value}k`, "Prevented leakage"]} />
                <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="executive-card flex flex-col justify-between p-5 sm:p-6">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Sliders size={18} className="text-[#00828a]" />
              <h2 className="text-base font-extrabold text-slate-900">Auto-reconciliation</h2>
            </div>
            <p className="text-xs leading-relaxed text-slate-500">
              Hold disbursements when attendance mismatch exceeds the configured threshold.
            </p>
            <div className="mt-5 flex justify-between text-xs font-bold text-slate-700">
              <span>Mismatch threshold</span>
              <span className="rounded bg-slate-100 px-2 py-1 text-[#00828a]">{settings?.mismatch_threshold ?? 15}%</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#00828a]"
                style={{ width: `${((settings?.mismatch_threshold ?? 15) / 40) * 100}%` }}
              />
            </div>
            <div className="mt-4 flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#F1FBF6]">
              <span className="text-[12.5px] font-medium text-[#12703B]">
                {settings?.holding_on_mismatch ? "Enabled — holding on mismatch" : "Disabled — no auto-hold"}
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={settings?.holding_on_mismatch ?? true}
                  className="sr-only peer"
                  onChange={(e) =>
                    handleSaveSettings({
                      mismatch_threshold: settings?.mismatch_threshold ?? 15,
                      holding_on_mismatch: e.target.checked,
                    })
                  }
                  disabled={saving || user?.role !== "admin"}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#00828a]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00828a]"></div>
              </label>
            </div>
            {user?.role !== "admin" && (
              <p className="mt-3 text-xs text-slate-500">Admin access required to modify settings.</p>
            )}
          </div>
        </section>
      </div>

      <div className="executive-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E7E8F0] flex items-center gap-2">
          <AlertTriangle size={15} color="#E5484D" />
          <span className="font-medium text-[14px] text-[#161522]">High-risk payments held for review</span>
        </div>
        <div className="divide-y divide-[#F0F0F7]">
          {payments?.map((payment, i) => (
            <NotificationRow
              key={i}
              payment={payment}
              isNotifying={notifying === payment.id}
              onDispatch={handleDispatchNotification}
              userRole={user?.role}
            />
          ))}
          {(!payments || payments.length === 0) && (
            <div className="px-6 py-8 text-center text-slate-500">No high-risk payments at this time.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function NotificationRow({
  payment,
  isNotifying,
  onDispatch,
  userRole,
}: {
  payment: any;
  isNotifying: boolean;
  onDispatch: (payment: any, channel: "sms" | "whatsapp", recipient: string) => void;
  userRole?: string;
}) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<"sms" | "whatsapp">("sms");
  const [recipient, setRecipient] = useState("");

  if (isNotifying) {
    return (
      <div className="px-6 py-3.5 flex items-center gap-4 text-slate-500">
        <RefreshCw className="animate-spin text-[#00828a]" size={16} />
        Queuing notification...
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#F0F0F7] first:border-t-0">
      <div className="flex items-center gap-3">
        <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-600">{payment.code}</span>
        <div>
          <div className="text-[13px] font-medium text-[#161522]">
            {payment.name} <span className="mono text-[10.5px] text-[#9694AE]">· {payment.id}</span>
          </div>
          <div className="text-[11.5px] text-[#9694AE]">{payment.reason}</div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-[13px] font-semibold text-[#E5484D]">{payment.amount.toLocaleString("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 })}</span>
        <button
          onClick={() => setOpen(!open)}
          className="text-[12px] font-medium text-[#00828a] hover:underline"
          disabled={userRole !== "admin" && userRole !== "manager"}
        >
          <Send size={13} /> Notify
        </button>
        {open && (
          <div className="absolute right-0 z-10 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
            <div className="mb-2 flex gap-1">
              <button
                onClick={() => setChannel("sms")}
                className={`rounded px-2 py-1 text-[10px] font-bold ${
                  channel === "sms" ? "bg-[#00828a] text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                SMS
              </button>
              <button
                onClick={() => setChannel("whatsapp")}
                className={`rounded px-2 py-1 text-[10px] font-bold ${
                  channel === "whatsapp" ? "bg-[#00828a] text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                WhatsApp
              </button>
            </div>
            <input
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="+254 7xx xxx xxx"
              className="field mb-2 text-xs"
            />
            <button
              disabled={!recipient || isNotifying}
              onClick={() => onDispatch(payment, channel, recipient)}
              className="action-primary w-full justify-center py-2 text-xs"
            >
              {isNotifying ? "Queueing..." : "Queue notification"}
            </button>
            <p className="mt-2 text-[10px] text-slate-500 text-center">Reference: {payment.id}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ label, value, tone = "text-slate-900" }: { label: string; value: string; tone?: string }) {
  return (
    <article className="executive-card p-5">
      <span className="eyebrow">{label}</span>
      <strong className={`mt-2 block text-2xl font-black ${tone}`}>{value}</strong>
      <p className="mt-1 text-[10px] text-slate-500">Live reconciliation view</p>
    </article>
  );
}