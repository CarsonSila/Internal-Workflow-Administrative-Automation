import { useQuery } from '@tanstack/react-query';
import { Activity, AlertCircle, AreaChart as AreaChartIcon, BarChart3, CheckCircle2, Copy, Database, Layers, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { Area, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useOverviewMetrics, useOverviewCharts, useProgramMetrics, useQualityDimensions, useQualityTrend } from "../api/hooks";

interface Dimension { label: string; value: number; issues: number; color: string; desc: string; }
interface Finance { total_disbursed: number; duplicate_leakage_prevented: number; high_risk_payments_flagged: number; reconciliation_rate: number; at_risk_records_count: number; }

export default function DataQualityDashboard() {
  const { data: metrics, isLoading: metricsLoading } = useOverviewMetrics();
  const { data: charts, isLoading: chartsLoading } = useOverviewCharts();
  const { data: programs } = useProgramMetrics();
  const { data: quality } = useQualityDimensions();
  const { data: trend } = useQualityTrend();

  const loading = metricsLoading || chartsLoading;
  const dimensions = quality?.dimensions || [];

  const cards = [
    { label: "Total raw records", value: metrics?.total_records ?? 0, sub: "Ingested across all pillars", icon: Database, color: "#00828a" },
    { label: "Potential duplicates", value: metrics?.potential_duplicates ?? 0, sub: "Awaiting ML verification", icon: Copy, color: "#d97706" },
    { label: "Pending reviews", value: metrics?.pending_reviews ?? 0, sub: "Action required", icon: AlertCircle, color: "#d91d4e" },
    { label: "Confirmed duplicates", value: metrics?.confirmed_duplicates ?? 0, sub: "Resolved duplicate nodes", icon: CheckCircle2, color: "#2563eb" },
    { label: "Unique beneficiaries", value: metrics?.unique_beneficiaries ?? 0, sub: "Clean master profiles", icon: Users, color: "#10b981" },
    { label: "Records merged", value: metrics?.records_merged ?? 0, sub: "+24% historical activity", icon: Layers, color: "#7c3aed" },
  ];

  if (loading) return <div className="flex min-h-[480px] flex-col items-center justify-center gap-3 text-slate-500"><div className="h-10 w-10 animate-spin rounded-full border-4 border-[#00828a] border-t-transparent" /><span className="eyebrow">Syncing executive telemetry...</span></div>;
  if (!metrics || !charts) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700">No dashboard telemetry returned.</div>;

  return (
    <div className="space-y-7 animate-fadeInUp">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => (
          <article key={card.label} className="executive-card relative overflow-hidden p-4">
            <span className="absolute right-0 top-0 h-full w-1" style={{ backgroundColor: card.color }} />
            <div className="flex items-center justify-between">
              <span className="eyebrow pr-2">{card.label}</span>
              <card.icon size={16} style={{ color: card.color }} />
            </div>
            <strong className="mt-3 block text-2xl font-black text-slate-800">{card.value.toLocaleString()}</strong>
            <span className="mt-1 inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold" style={{ color: card.color }}>
              {card.sub}
            </span>
          </article>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="executive-card p-5 sm:p-6 lg:col-span-2">
          <Heading icon={<BarChart3 size={16} />} title="Pillar data composition" copy="Unique master profiles versus duplicate ingestion by operational program." />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.duplicates_by_program}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="program" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Legend />
                <Bar dataKey="uniques" name="Unique beneficiaries" fill="#00828a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="duplicates" name="Duplicate telemetry" fill="#d91d4e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="executive-card p-5 sm:p-6">
          <Heading icon={<Users size={16} />} title="Pillar enrollment share" copy="Master profile distribution across operational pillars." />
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.beneficiaries_by_program}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {charts.beneficiaries_by_program.map((_, i) => (
                    <Cell key={`cell-${i}`} fill={charts.beneficiaries_by_program[i].color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [value.toLocaleString(), "beneficiaries"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="executive-card p-5 sm:p-6 lg:col-span-2">
          <Heading icon={<AreaChartIcon size={16} />} title="Match confidence distribution" copy="Fuzzy-match confidence buckets for all beneficiary pair comparisons." />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.match_confidence}>
                <defs>
                  <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00828a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00828a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="range" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip formatter={(value: any) => [value?.toLocaleString() ?? "0", "profiles"]} />
                <Area type="monotone" dataKey="count" stroke="#00828a" fillOpacity={1} fill="url(#confidenceGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="executive-card p-5 sm:p-6">
          <Heading icon={<TrendingUp size={16} />} title="Data quality trajectory" copy="30-day rolling average of ingestion quality scores." />
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend?.data.map((v, i) => ({ day: i + 1, value: v })) || []}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" fontSize={10} />
                <YAxis fontSize={10} domain={[70, 100]} />
                <Tooltip formatter={(value: any) => [`${value ?? 0}%`, "quality"]} />
                <Line type="monotone" dataKey="value" stroke="#00828a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="executive-card p-5 sm:p-6">
          <Heading icon={<ShieldCheck size={16} />} title="Quality dimensions" copy="Five canonical data quality dimensions with live scores." />
          <div className="space-y-3">
            {dimensions.map((dim: Dimension) => (
              <div key={dim.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-700">{dim.label}</span>
                  <span className="font-bold text-slate-900">{dim.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${dim.value}%`, backgroundColor: dim.color }}
                  />
                </div>
                <p className="text-[10px] text-slate-500">{dim.issues} open issues</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Heading({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
  return (
    <div className="mb-4">
      <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-800">
        {icon}{title}
      </h3>
      <p className="mt-1 text-[11px] text-slate-400">{copy}</p>
    </div>
  );
}