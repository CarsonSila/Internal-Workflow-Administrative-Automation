import { useQuery } from '@tanstack/react-query';
import { Activity, AlertCircle, AreaChart as AreaChartIcon, BarChart3, CheckCircle2, Copy, Database, Layers, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useOverviewMetrics, useOverviewCharts, useProgramMetrics, useQualityDimensions, useQualityTrend, useFinancialReconciliation } from "../api/hooks";
import { Heading, Panel, money, FinanceCard } from "./ui/DashboardUI";

interface Dimension { label: string; value: number; issues: number; color: string; desc: string; }
interface Finance { total_disbursed: number; duplicate_leakage_prevented: number; high_risk_payments_flagged: number; reconciliation_rate: number; at_risk_records_count: number; }

export default function DataQualityDashboard() {
  const { data: metrics, isLoading: metricsLoading } = useOverviewMetrics();
  const { data: charts, isLoading: chartsLoading } = useOverviewCharts();
  const { data: programs } = useProgramMetrics();
  const { data: quality } = useQualityDimensions();
  const { data: trend } = useQualityTrend();
  const { data: finance, isLoading: financeLoading } = useFinancialReconciliation();

  const loading = metricsLoading || chartsLoading || financeLoading;
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {finance && (
          <>
            <FinanceCard label="Total disbursed" value={money(finance.total_disbursed)} />
            <FinanceCard label="Leakage prevented" value={money(finance.duplicate_leakage_prevented)} tone="text-emerald-700" />
            <FinanceCard label="High-risk payments" value={money(finance.high_risk_payments_flagged)} tone="text-rose-700" />
            <FinanceCard label="Reconciliation rate" value={`${finance.reconciliation_rate}%`} tone="text-indigo-700" />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
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
        </Panel>

        <Panel>
          <Heading icon={<Users size={16} />} title="Pillar enrollment share" copy="Master profile distribution across programs." />
          <div className="relative h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={charts.beneficiaries_by_program}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  labelLine={false}
                >
                  {charts.beneficiaries_by_program.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <strong className="pointer-events-none absolute inset-0 flex items-center justify-center text-2xl font-black text-slate-800">
              {metrics.unique_beneficiaries}
            </strong>
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <Heading icon={<AreaChartIcon size={16} />} title="ML match score distribution" copy="Confidence buckets generated from identity matching signals." />
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={charts.match_confidence}>
                <defs>
                  <linearGradient id="confidenceFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00828a" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#00828a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="range" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#00828a" fill="url(#confidenceFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <Heading icon={<TrendingUp size={16} />} title="Ingestion scans vs merges" copy="AI scans and human merge activity over the last 30 days." />
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={charts.merges_over_time}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" fontSize={9} interval={5} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="scans" name="AI scans" stroke="#7c3aed" strokeWidth={2} />
                <Line type="monotone" dataKey="merges" name="Human merges" stroke="#d91d4e" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <Heading icon={<ShieldCheck size={16} />} title="Pillar leakage & error matrix" copy="Duplicate rates and quality scores by operational program." />
          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {dimensions.map((dimension) => (
              <div key={dimension.label} className="rounded-lg bg-slate-50 p-3">
                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                  <span>{dimension.label}</span>
                  <span>{dimension.value}%</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-slate-200">
                  <div className="h-full rounded-full" style={{ width: `${dimension.value}%`, backgroundColor: dimension.color }} />
                </div>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 text-[10px] uppercase text-slate-400">
                <tr>
                  <th className="pb-3">Program</th>
                  <th className="pb-3 text-center">Uniques</th>
                  <th className="pb-3 text-center">Duplicates</th>
                  <th className="pb-3 text-right">Influx rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {charts.duplicates_by_program.map((row) => (
                  <tr key={row.program}>
                    <td className="py-3 font-bold text-slate-700">{row.program}</td>
                    <td className="py-3 text-center font-mono">{row.uniques}</td>
                    <td className="py-3 text-center font-mono text-[#d91d4e]">{row.duplicates}</td>
                    <td className="py-3">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-2 w-24 rounded-full bg-slate-100">
                          <div className="h-full rounded-full" style={{ width: `${row.rate}%`, backgroundColor: row.color }} />
                        </div>
                        <span className="w-12 text-right font-mono font-bold" style={{ color: row.color }}>{row.rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}