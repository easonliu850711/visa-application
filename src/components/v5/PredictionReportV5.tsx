'use client';

import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Database,
  TrendingUp,
  Users,
  Info,
  CalendarDays,
  Activity,
  ExternalLink,
  BarChart3,
  LineChart as LineIcon,
} from 'lucide-react';
import type { V5Output } from '@/lib/v5/engine';
import {
  MonthlyInflowOutflowChart,
  BacklogTrendChart,
  PermitBreakdownChart,
  PermitRateChart,
  BureauBacklogRankingChart,
  BureauProcessedRankingChart,
  BureauPressureIndexChart,
} from '@/components/charts/VisaCharts';

interface Props {
  result: V5Output;
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'near_final_stage') {
    return (
      <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-sm px-3 py-1 rounded-full border border-emerald-200 shadow-sm">
        <CheckCircle2 className="w-4 h-4" />
        <span className="font-medium">接近完成區間</span>
      </div>
    );
  }

  if (status === 'available') {
    return (
      <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-sm px-3 py-1 rounded-full border border-blue-200 shadow-sm">
        <Clock className="w-4 h-4" />
        <span className="font-medium">審查進度推估中</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-600 text-sm px-3 py-1 rounded-full border border-rose-200 shadow-sm">
      <AlertCircle className="w-4 h-4" />
      <span className="font-medium">資料不足</span>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color = 'text-slate-800',
  subtitle,
  precision,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color?: string;
  subtitle?: string;
  precision?: string;
}) {
  const displayValue = typeof value === 'number' ? value.toLocaleString() : value;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-400 text-xs mb-1.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className={`text-lg font-bold ${color}`}>
        {displayValue}
        {precision && <span className="text-xs text-slate-400 ml-1">{precision}</span>}
      </div>
      {subtitle && <div className="text-[10px] text-slate-500 mt-1 leading-relaxed">{subtitle}</div>}
    </div>
  );
}


function todayLocalDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function diffDays(from: string, to: string) {
  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T00:00:00`);
  return Math.floor((toDate.getTime() - fromDate.getTime()) / 86400000);
}

function getScenarioDateState(date: string) {
  const today = todayLocalDateString();
  const delta = diffDays(today, date);
  if (delta < 0) return { label: `已超過 ${Math.abs(delta).toLocaleString()} 天`, tone: 'text-amber-600' };
  if (delta === 0) return { label: '約今日附近', tone: 'text-emerald-600' };
  return { label: `約剩 ${delta.toLocaleString()} 天`, tone: 'text-slate-500' };
}

function getRemainingLabel(days: number, date: string) {
  const state = getScenarioDateState(date);
  if (days <= 0 && state.label.startsWith('已超過')) return state.label;
  if (days <= 0) return '約今日附近';
  return `約剩 ${days.toLocaleString()} 天`;
}

function getEstimatedTotalDays(applyDate: string, estimatedDate: string) {
  return Math.max(0, diffDays(applyDate, estimatedDate));
}

function ScenarioCard({ title, days, date, basis, dailyRate, highlight }: {
  title: string;
  days: number;
  date: string;
  basis: string;
  dailyRate: number;
  highlight?: boolean;
}) {
  const dateState = getScenarioDateState(date);

  return (
    <div className={`rounded-xl p-4 border transition ${highlight ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 shadow-md shadow-emerald-100' : 'bg-white border-slate-200 shadow-sm'}`}>
      <div className="text-xs text-slate-400 mb-1">{title}</div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-black text-slate-900">
            {days.toLocaleString()}<span className="text-xs font-normal ml-1 text-slate-400">天</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">預估：{date}</div>
          <div className={`text-[10px] font-semibold mt-0.5 ${dateState.tone}`}>{dateState.label}</div>
        </div>
        <div className="text-right text-[10px] text-slate-500 leading-relaxed max-w-[120px]">
          {basis}<br />日均 {dailyRate} 件
        </div>
      </div>
    </div>
  );
}

function CompactTable({ result }: { result: V5Output }) {
  const rows = result.recentTrend || [];
  if (rows.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-3">
        <LineIcon className="w-4 h-4 text-cyan-600" />
        最近 6 個月統計列表
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] text-left text-slate-400">
          <thead className="text-slate-500 border-b border-slate-200">
            <tr>
              <th className="py-2 pr-3">月份</th>
              <th className="py-2 pr-3">區分</th>
              <th className="py-2 pr-3 text-right">受理総数</th>
              <th className="py-2 pr-3 text-right">旧受</th>
              <th className="py-2 pr-3 text-right">新受</th>
              <th className="py-2 pr-3 text-right">既済</th>
              <th className="py-2 pr-3 text-right">未済</th>
              <th className="py-2 text-right">許可率</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.month} className="border-b border-slate-100 last:border-0">
                <td className="py-2 pr-3 text-slate-700 font-mono">{row.month}</td>
                <td className="py-2 pr-3">{row.estimated ? <span className="inline-flex rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-amber-700">推估</span> : <span className="inline-flex rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-emerald-700">公開</span>}</td>
                <td className="py-2 pr-3 text-right">{row.receivedTotal.toLocaleString()}</td>
                <td className="py-2 pr-3 text-right">{row.oldReceived.toLocaleString()}</td>
                <td className="py-2 pr-3 text-right">{row.applications.toLocaleString()}</td>
                <td className="py-2 pr-3 text-right text-emerald-700">{row.processed.toLocaleString()}</td>
                <td className="py-2 pr-3 text-right text-amber-600">{row.backlog.toLocaleString()}</td>
                <td className="py-2 text-right text-purple-600">{row.permitRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PredictionReportV5({ result }: Props) {
  const actualTrend = result.publicTrend?.length ? result.publicTrend : (result.recentTrend || []).filter(row => !row.estimated);
  const isNearFinal = result.status === 'near_final_stage';
  const isAvailable = result.status === 'available';
  const hasError = result.status === 'insufficient_data' || result.status === 'error';

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <AlertCircle className="w-10 h-10 text-rose-400 mb-2" />
        <p className="text-sm text-rose-600">{result.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-bold text-slate-900">
            {result.bureau} — 審查時間預估
          </div>
          <div className="text-xs text-slate-400 mt-0.5">一般永住申請 · e-Stat old-receipt queue</div>
        </div>
        <StatusBadge status={result.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3">
          <div className="text-[10px] text-cyan-700/70">最新公開統計月</div>
          <div className="text-lg font-black text-cyan-700">{result.latestMonthStats.month || result.latestMonth}</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <div className="text-[10px] text-blue-700/70">推估涵蓋至</div>
          <div className="text-lg font-black text-blue-700">{result.projectedThroughMonth || result.latestMonth}</div>
          <div className="text-[10px] text-blue-700/50 mt-0.5">{result.projectedMonthsCount > 0 ? `含 ${result.projectedMonthsCount} 個未公開月推估` : '無未公開月推估'}</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <div className="text-[10px] text-slate-500">查詢更新日</div>
          <div className="text-lg font-black text-slate-800">{result.latestStatsUpdatedAt}</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <div className="text-[10px] text-slate-500">模型更版日</div>
          <div className="text-lg font-black text-slate-800">{result.modelReleasedAt}</div>
        </div>
      </div>

      <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
          <p className="text-xs text-cyan-700/80 leading-relaxed">
            政府統計通常會滯後約三個月；尚未公開的月份會以近期趨勢補足，並在表格中標示為「推估」。為避免誤解，圖表僅呈現最新 6 個已公開的實際統計月份。成田、羽田、中部、關西空港支局未列入永住申請選項；純東京版與純大阪版為依公開支局數值拆分後的推定值。
          </p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800/85 leading-relaxed">
            依據我們實際詢問到的案例觀察，永住案件不一定完全依照受理順序完成。若前方案件出現補件、局內分流、插隊案件、優先審核案件或個案確認，實際通知時間平均可能比統計推估晚約 1 個月。
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            {isNearFinal ? '目前狀態' : '目前預估'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
            <div className="text-xs text-slate-500 font-bold tracking-wider mb-2">預估總耗時</div>
            <div className="text-4xl md:text-5xl font-black text-slate-800 leading-none">
              {getEstimatedTotalDays(result.userApplyDate, result.estimatedCompletionDate).toLocaleString()}
              <span className="text-base font-bold ml-1 text-slate-500">天</span>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              從申請日至中間推估完成日
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
            <div className="text-xs text-emerald-700 font-bold tracking-wider mb-2">預估仍需等待</div>
            <div className="text-4xl md:text-5xl font-black text-emerald-700 leading-none">
              {result.estimatedDays.toLocaleString()}
              <span className="text-base font-bold ml-1 text-emerald-600">天</span>
            </div>
            <p className="text-xs text-emerald-700 mt-3">
              {getRemainingLabel(result.estimatedDays, result.estimatedCompletionDate)}
            </p>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-slate-500">
            中間推估日期：<span className="font-semibold text-slate-700">{result.estimatedCompletionDate}</span>
          </p>

          {isNearFinal && (
            <p className="text-sm text-amber-700 mt-2 leading-relaxed">
              已接近完成區間；依目前推估日期判斷，
              <span className="font-semibold">{getScenarioDateState(result.estimatedCompletionDate).label}</span>。
              若尚未收到通知，可能進入補件、內部確認、通知等待或個案延遲區間。
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ScenarioCard title="樂觀" {...result.prediction.optimistic} />
        <ScenarioCard title="中間" {...result.prediction.moderate} highlight />
        <ScenarioCard title="保守" {...result.prediction.conservative} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="申請時等待基準" value={result.queuePositionAtApply} icon={Database} color="text-amber-600" subtitle={`基準月份：${result.applyMonth}`} />
        <StatCard label="申請後已完成量" value={result.processedAfterApply} icon={TrendingUp} color="text-emerald-700" subtitle="公開統計與推估月份合計" />
        <StatCard label="目前估計剩餘量" value={result.remainingBacklog} icon={Users} color="text-blue-600" subtitle="用於換算等待時間的參考量" />
        <StatCard label="已等待" value={result.alreadyWaitedDays} icon={CalendarDays} color="text-cyan-600" precision="天" subtitle={`申請日：${result.userApplyDate}`} />
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800 leading-relaxed">
        圖表顯示最新 6 個已公開的實際統計月份；尚未公開月份的推估值僅用於等待時間換算與下方表格標示，不納入圖表趨勢。
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MonthlyInflowOutflowChart data={actualTrend} />
        <BacklogTrendChart data={actualTrend} />
        <PermitBreakdownChart data={actualTrend} />
        <PermitRateChart data={actualTrend} />
      </div>

      <CompactTable result={result} />

      {result.bureauRanking?.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BureauBacklogRankingChart data={result.bureauRanking} />
          <BureauPressureIndexChart data={result.bureauRanking} />
          <BureauProcessedRankingChart data={result.bureauRanking} />
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-3">
              <BarChart3 className="w-4 h-4 text-cyan-600" />
              各局處理壓力列表
            </div>
            <div className="space-y-2 max-h-64 overflow-auto pr-1">
              {result.bureauRanking.slice(0, 12).map(row => (
                <div key={row.bureauCode} className="grid grid-cols-4 gap-2 text-[11px] text-slate-500 border-b border-slate-100 pb-2 last:border-0">
                  <span className="text-slate-700">{row.bureau}</span>
                  <span>受理 {row.receivedTotal.toLocaleString()}</span>
                  <span>完成 {row.processed.toLocaleString()}</span>
                  <span className="text-rose-600">約 {row.estimatedMonthsByLatestSpeed} 月量</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-3">
        <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-2">
          <Activity className="w-3 h-3" />
          申請月隊伍資料
          {result.applyMonthDataMode === 'estimated_from_latest_stats' && (
            <span className="ml-2 text-[10px] text-cyan-600 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-full">未公開月推估</span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-slate-500">
          <div><span className="text-slate-400">受理総数</span><br />{result.applyMonthReceivedTotal.toLocaleString()} 件</div>
          <div><span className="text-slate-400">旧受</span><br />{result.applyMonthOldReceived.toLocaleString()} 件</div>
          <div><span className="text-slate-400">新受</span><br />{result.applyMonthNewReceived.toLocaleString()} 件</div>
          <div><span className="text-slate-400">當月位置</span><br />{result.applyDayRatio}%</div>
        </div>
        {result.applyMonthDataBasis && (
          <div className="mt-2 text-[10px] text-slate-500 leading-relaxed border-t border-slate-200 pt-2">
            {result.applyMonthDataBasis}
          </div>
        )}
        {result.projectionBasis && result.projectedMonthsCount > 0 && (
          <div className="mt-2 text-[10px] text-cyan-700/70 leading-relaxed">
            {result.projectionBasis}
          </div>
        )}
      </div>

      {result.warnings?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
          {result.warnings.map((w, i) => (
            <div key={i} className="text-xs text-amber-700 leading-relaxed">⚠️ {w}</div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl p-3">
        <div className="flex items-center gap-1.5 text-slate-500 text-[10px] mb-1">
          <ExternalLink className="w-3 h-3" />
          資料來源
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          e-Stat 政府統計「出入国管理統計」統計表 ID 0003449073。模型使用公開表中的受理旧受、新受、既済與未済欄位建立隊伍推估；網站僅顯示推估結果與統計證據，不保證個案實際通知日。
        </p>
        <p className="text-[10px] text-slate-400 mt-1 break-all">{result.dataSourceUrl}</p>
      </div>

      <div className="text-xs text-slate-500 text-center leading-relaxed px-2">{result.message}</div>
    </div>
  );
}
