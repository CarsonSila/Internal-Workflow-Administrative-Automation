import { useState } from "react";
import { Activity } from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AnomaliesFeed from "./components/AnomaliesFeed";
import AuditTrail from "./components/AuditTrail";
import ConsentPrivacy from "./components/ConsentPrivacy";
import DataQualityDashboard from "./components/DataQualityDashboard";
import DuplicateResolution from "./components/DuplicateResolution";
import FabricGraph from "./components/FabricGraph";
import IdentityExplorer from "./components/IdentityExplorer";
import Login from "./components/Login";
import Reconciliation from "./components/Reconciliation";
import SidebarLayout from "./components/SidebarLayout";
import "./App.css";

type Tab = "overview" | "explorer" | "duplicates" | "fabric" | "reconcile" | "consent" | "audit";

function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [recordA, setRecordA] = useState("REC-PLU-10001");
  const [recordB, setRecordB] = useState("REC-SCH-10002");
  const quickCompare = (first: string, second: string) => { setRecordA(first); setRecordB(second); setActiveTab("duplicates"); };
  return <SidebarLayout activeTab={activeTab} setActiveTab={setActiveTab}><div className="space-y-8">{activeTab === "overview" && <div className="space-y-8"><DataQualityDashboard /><AnomaliesFeed onSelectCompare={quickCompare} /></div>}{activeTab === "explorer" && <IdentityExplorer />}{activeTab === "duplicates" && <DuplicateResolution initialRecordA={recordA} initialRecordB={recordB} />}{activeTab === "fabric" && <FabricGraph />}{activeTab === "reconcile" && <Reconciliation />}{activeTab === "consent" && <ConsentPrivacy />}{activeTab === "audit" && <AuditTrail />}<footer className="flex items-center gap-2 text-xs text-slate-500"><Activity size={14} className="text-emerald-500" /> Live administrative console</footer></div></SidebarLayout>;
}
function MainApp() { const { token, loading } = useAuth(); if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500"><div className="text-center"><Activity className="mx-auto mb-3 animate-spin text-indigo-600" /><p className="eyebrow">Securing connection...</p></div></div>; return token ? <Dashboard /> : <Login />; }
export default function App() { return <AuthProvider><MainApp /></AuthProvider>; }
