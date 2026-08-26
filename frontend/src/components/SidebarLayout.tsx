import { useState } from "react";
import { Award, BarChart3, ChevronLeft, ChevronRight, Cpu, FileClock, LayoutGrid, Lock, LogOut, Menu, QrCode, Scale, Search, Share2, ShieldCheck, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface Props {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: "overview" | "explorer" | "duplicates" | "fabric" | "reconcile" | "consent" | "audit") => void;
}

export default function SidebarLayout({ children, activeTab, setActiveTab }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const items = [
    { id: "overview", label: "Dashboard", icon: LayoutGrid },
    { id: "explorer", label: "Identity Explorer", icon: ShieldCheck },
    { id: "duplicates", label: "Duplicate Resolver", icon: Scale },
    { id: "fabric", label: "Fabric Graph", icon: Share2 },
    { id: "reconcile", label: "Reconciliation", icon: BarChart3 },
    { id: "consent", label: "Consent & Privacy", icon: Lock },
    { id: "audit", label: "Audit Trail", icon: FileClock },
  ] as const;
  const headings: Record<string, [string, string]> = {
    overview: ["Executive Dashboard Overview", "Near-real-time metrics, quality trends, and system alerts."],
    explorer: ["Identity Explorer & Database Ledger", "Browse and audit master profiles across Inuka programs."],
    duplicates: ["Intelligent Duplicate Resolution Console", "Compare candidate records before executing a controlled decision."],
    fabric: ["Identity Fabric Graph", "Visualise candidate clusters, conflicts, and confirmed identity links."],
    reconcile: ["Reconciliation & Leakage", "Connect identity resolution to financial risk and protected disbursements."],
    consent: ["Consent & Privacy", "Review consent coverage and control PII exposure under KDPA governance."],
    audit: ["Operational System Audit Trail", "Immutable records of automated and manual platform operations."],
  };
  return (
    <div className="flex min-h-screen bg-[#f1f5f9] text-slate-800">
      <aside className={`fixed inset-y-0 left-0 z-30 flex shrink-0 flex-col justify-between bg-[#00828a] text-white transition-all duration-300 ${collapsed ? "w-20" : "w-64"}`}>
        <div>
          <div className="flex h-20 items-center justify-between border-b border-[#006e75]/40 p-5">
            <div className="flex items-center gap-2 overflow-hidden">
              {!collapsed && (
                <>
                  <div className="rounded-lg bg-white/10 p-1.5"><Award size={24} /></div>
                  <div>
                    <p className="whitespace-nowrap text-sm font-extrabold uppercase tracking-wide">Inuka Unified</p>
                    <span className="text-[10px] font-bold tracking-wider text-teal-100/80">PLATFORM V3.0</span>
                  </div>
                </>
              )}
              {collapsed && <div className="mx-auto rounded-lg bg-white/10 p-1.5"><Award size={24} /></div>}
            </div>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="rounded-lg p-1.5 text-teal-100 transition hover:bg-white/10"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>
          <nav className="mt-4 space-y-1.5 p-4">
            {items.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                title={collapsed ? label : undefined}
                onClick={() => setActiveTab(id)}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold transition-all ${
                  activeTab === id
                    ? "scale-[1.02] bg-white text-[#00828a] shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
                    : "text-teal-50 hover:bg-white/5"
                }`}
              >
                <Icon size={18} className={activeTab === id ? "text-[#00828a]" : "text-teal-100"} />
                {!collapsed && <span>{label}</span>}
              </button>
            ))}
          </nav>
        </div>
        <div className="space-y-4 p-4">
          {!collapsed && (
            <div className="space-y-3 rounded-xl bg-gradient-to-br from-[#d91d4e] to-[#b8123c] p-4 text-white shadow-lg">
              <span className="rounded bg-white/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">Support channel</span>
              <p className="text-xs font-semibold leading-relaxed">KPC cohort assistance and peer collaboration.</p>
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/20">
                <QrCode size={20} className="text-white" />
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/10">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-[12px] font-semibold">
              {user?.full_name?.charAt(0) || "U"}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="text-sm font-medium text-white truncate">{user?.full_name || "User"}</p>
                <p className="text-[10px] font-bold tracking-wider text-teal-100/80 uppercase">{user?.role || "VIEWER"}</p>
              </div>
            )}
            <button
              onClick={logout}
              className="flex-shrink-0 rounded-lg p-1.5 text-teal-100 transition hover:bg-white/10 hover:text-white"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      <main className={`flex-1 ml-[${collapsed ? "80px" : "256px}"] transition-all duration-300`}>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}