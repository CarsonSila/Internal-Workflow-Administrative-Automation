import {
  LayoutDashboard, Fingerprint, Copy, ShieldCheck, User, AlertTriangle,
  ClipboardList, Database, Settings, PanelLeftClose, Search, Bell,
  Plus, ArrowRight, GitMerge, HelpCircle,
} from "lucide-react";
import type { ComponentType } from "react";

type LucideProps = { size?: number; strokeWidth?: number };

function make(LucideIcon: ComponentType<LucideProps>) {
  return () => <LucideIcon size={16} strokeWidth={2} />;
}

export const Icon = {
  Overview: make(LayoutDashboard),
  Identity: make(Fingerprint),
  Duplicate: make(Copy),
  Quality: make(ShieldCheck),
  Beneficiary: make(User),
  Anomaly: make(AlertTriangle),
  Audit: make(ClipboardList),
  DataSources: make(Database),
  Config: make(Settings),
  Collapse: make(PanelLeftClose),
  Search: make(Search),
  Bell: make(Bell),
  Plus: make(Plus),
  ArrowRight: make(ArrowRight),
  Merge: make(GitMerge),
  Help: make(HelpCircle),
};
