import { ReactNode } from "react";

export function Heading({ icon, title, copy }: { icon: ReactNode; title: string; copy: string }) {
  return (
    <div className="mb-4">
      <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-800">
        {icon}{title}
      </h3>
      <p className="mt-1 text-[11px] text-slate-400">{copy}</p>
    </div>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`executive-card p-5 sm:p-6 ${className}`}>{children}</section>;
}

export function money(value: number) {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(value);
}

export function FinanceCard({ label, value, tone = "text-slate-900" }: { label: string; value: string; tone?: string }) {
  return (
    <article className="executive-card p-4">
      <span className="eyebrow">{label}</span>
      <strong className={`mt-2 block text-xl font-black ${tone}`}>{value}</strong>
      <p className="mt-1 text-[10px] text-slate-500">Live reconciliation view</p>
    </article>
  );
}