'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { BarChart3, LineChart as LineIcon, Activity, Database, Percent, Gauge } from 'lucide-react';
import type { V5Output } from '@/lib/v5/engine';

type TrendRow = V5Output['recentTrend'][number];
type RankingRow = V5Output['bureauRanking'][number];

function fmt(n: number | undefined | null) {
  if (!Number.isFinite(Number(n))) return '0';
  return Number(n).toLocaleString();
}

function ChartCard({
  title,
  description,
  footer,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  footer?: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-lg shadow-slate-200/70">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-slate-900">
            <Icon className="w-4 h-4 text-teal-500" />
            {title}
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
        </div>
      </div>
      <div className="h-64">{children}</div>
      {footer && <div className="text-[10px] text-slate-400 mt-3 leading-relaxed">{footer}</div>}
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.98)',
  border: '1px solid rgba(148, 163, 184, 0.28)',
  borderRadius: '14px',
  color: '#0f172a',
  fontSize: '12px',
  boxShadow: '0 18px 40px rgba(15,23,42,0.12)',
};

const gridStroke = 'rgba(148, 163, 184, 0.22)';
const axisTick = { fill: '#64748b', fontSize: 11 };

export function MonthlyInflowOutflowChart({ data }: { data: TrendRow[] }) {
  return (
    <ChartCard
      title="新受 vs 既済"
      description="比較最近月份每月新增案件與完成審查量。完成量低於新受時，隊伍通常會變長。"
      footer="資料來源：e-Stat 0003449073｜欄位：受理_新受、既済_総数｜推估月份會在表格中標示。"
      icon={BarChart3}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={false} />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={fmt} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => fmt(v) + ' 件'} />
          <Legend wrapperStyle={{ fontSize: 12, color: '#475569' }} />
          <Bar dataKey="applications" name="新受" fill="#38bdf8" radius={[8, 8, 0, 0]} />
          <Bar dataKey="processed" name="既済" fill="#14b8a6" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function BacklogTrendChart({ data }: { data: TrendRow[] }) {
  return (
    <ChartCard
      title="未済趨勢"
      description="觀察月末仍未處理案件量。線往上代表積壓增加，往下代表隊伍正在被消化。"
      footer="資料來源：e-Stat 0003449073｜欄位：未済。"
      icon={LineIcon}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={false} />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={fmt} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => fmt(v) + ' 件'} />
          <Line type="monotone" dataKey="backlog" name="未済" stroke="#0f766e" strokeWidth={3} dot={{ r: 3, fill: '#0f766e' }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function PermitBreakdownChart({ data }: { data: TrendRow[] }) {
  return (
    <ChartCard
      title="許可 / 不許可 / その他"
      description="把完成審查的案件拆成許可、不許可與其他，讓處理結果結構更透明。"
      footer="資料來源：e-Stat 0003449073｜欄位：既済_許可、既済_不許可、既済_その他。"
      icon={Activity}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={false} />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={fmt} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => fmt(v) + ' 件'} />
          <Legend wrapperStyle={{ fontSize: 12, color: '#475569' }} />
          <Bar dataKey="denied" name="不許可" stackId="a" fill="#fb7185" />
          <Bar dataKey="other" name="その他" stackId="a" fill="#f59e0b" />
          <Bar dataKey="permit" name="許可" stackId="a" fill="#14b8a6" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function PermitRateChart({ data }: { data: TrendRow[] }) {
  return (
    <ChartCard
      title="許可率趨勢"
      description="觀察每月完成審查中許可案件占比。這不是等待時間，只是結果結構參考。"
      footer="計算方式：既済_許可 ÷ 既済_総数。推估月份僅依比例估算，需保守解讀。"
      icon={Percent}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={false} />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} unit="%" />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `${v}%`} />
          <Line type="monotone" dataKey="permitRate" name="許可率" stroke="#2563eb" strokeWidth={3} dot={{ r: 3, fill: '#2563eb' }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function RankingBar({ data, dataKey, title, description, footer, icon, suffix = '件' }: {
  data: RankingRow[];
  dataKey: keyof RankingRow;
  title: string;
  description: string;
  footer: string;
  icon: React.ElementType;
  suffix?: string;
}) {
  const top = [...data].sort((a, b) => Number(b[dataKey]) - Number(a[dataKey])).slice(0, 10).reverse();

  return (
    <ChartCard title={title} description={description} footer={footer} icon={icon}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={top} layout="vertical" margin={{ top: 4, right: 20, left: 28, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
          <XAxis type="number" tick={axisTick} tickLine={false} axisLine={false} tickFormatter={fmt} />
          <YAxis type="category" dataKey="bureau" tick={axisTick} tickLine={false} axisLine={false} width={92} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `${fmt(v)} ${suffix}`} />
          <Bar dataKey={dataKey as string} name={title} radius={[0, 8, 8, 0]}>
            {top.map((_, i) => <Cell key={i} fill={i % 2 === 0 ? '#14b8a6' : '#38bdf8'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function BureauBacklogRankingChart({ data }: { data: RankingRow[] }) {
  return (
    <RankingBar
      data={data}
      dataKey="backlog"
      title="各局未済排名"
      description="最新月份各入管局月末積壓量。值越大，代表前方隊伍越長。"
      footer="東京入管局（横浜除外・推定）與大阪入管局（神戸除外・推定）為扣除支局後的推估值。"
      icon={Database}
    />
  );
}

export function BureauProcessedRankingChart({ data }: { data: RankingRow[] }) {
  return (
    <RankingBar
      data={data}
      dataKey="processed"
      title="各局既済處理量"
      description="最新月份完成審查量。值越大，表示該局單月處理能力較高。"
      footer="資料來源：e-Stat 0003449073｜欄位：既済_総数。"
      icon={BarChart3}
    />
  );
}

export function BureauPressureIndexChart({ data }: { data: RankingRow[] }) {
  return (
    <RankingBar
      data={data}
      dataKey="estimatedMonthsByLatestSpeed"
      title="處理壓力指數"
      description="用最新未済除以最新月處理量，近似表示若不再新增案件，需要幾個月才能消化。"
      footer="這是輔助觀察指標，不代表個案保證等待時間。"
      icon={Gauge}
      suffix="個月"
    />
  );
}
