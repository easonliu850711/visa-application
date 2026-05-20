'use client';

import React from 'react';
import type { PredictionResultV3 } from '@/types';

interface PredictionCardsProps {
  result: PredictionResultV3;
  isLoading: boolean;
}

export default function PredictionCards({ result, isLoading }: PredictionCardsProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-4 bg-slate-700/50 rounded w-3/4 mx-auto" />
        <div className="h-24 bg-slate-700/30 rounded-xl" />
        <div className="h-24 bg-slate-700/30 rounded-xl" />
        <div className="h-24 bg-slate-700/30 rounded-xl" />
      </div>
    );
  }

  if (!result) return null;

  const {
    daysSinceApply,
    expectedTotalDays,
    remainingDays,
    optimistic,
    moderate,
    conservative,
    progress,
    predictedDate,
    bureauName,
    routeLabel,
    baseWaitDays,
    trendModifier,
    backlogDelta,
    trendAvailable,
  } = result;

  // 格式化日期
  const fmtDate = (d: string) => {
    const [y, m, day] = d.split('-');
    return `${y.slice(2)}/${m}/${day}`;
  };

  const predDateObj = new Date(predictedDate);

  const optDate = new Date(predDateObj.getTime() - 30 * 86400000);
  const conDate = new Date(predDateObj.getTime() + 60 * 86400000);

  return (
    <div className="space-y-5">
      {/* 標頭：入管局 + 通道 */}
      <div className="text-center">
        <div className="text-xs text-slate-500 uppercase tracking-wider">
          {bureauName} · {routeLabel}
        </div>
      </div>

      {/* 進度條 */}
      <div>
        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
          <span>審查進度</span>
          <span className="font-mono">{progress.toFixed(1)}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-slate-700/50 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-1000 ease-out"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>申請日</span>
          <span>預測完成</span>
        </div>
      </div>

      {/* 關鍵數字卡 */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-slate-800/40 border border-slate-600/60 p-3 text-center">
          <div className="text-xs text-slate-500">已等待</div>
          <div className="text-lg font-bold text-cyan-400">{daysSinceApply}<span className="text-xs font-normal ml-0.5">天</span></div>
        </div>
        <div className="rounded-lg bg-slate-800/40 border border-slate-600/60 p-3 text-center">
          <div className="text-xs text-slate-500">預計總長</div>
          <div className="text-lg font-bold text-blue-400">{expectedTotalDays}<span className="text-xs font-normal ml-0.5">天</span></div>
        </div>
        <div className="rounded-lg bg-slate-800/40 border border-slate-600/60 p-3 text-center">
          <div className="text-xs text-slate-500">尚需等待</div>
          <div className="text-lg font-bold text-amber-400">{Math.max(0, remainingDays)}<span className="text-xs font-normal ml-0.5">天</span></div>
        </div>
      </div>

      {/* 三種情境 */}
      <div className="space-y-2.5">
        <ScenarioCard
          title="🟢 樂觀"
          days={optimistic}
          date={optDate}
          color="text-emerald-400"
        />
        <ScenarioCard
          title="🟡 最可能結果"
          days={moderate}
          date={predDateObj}
          color="text-amber-400"
          isCenter
        />
        <ScenarioCard
          title="🔴 保守（含補件緩衝）"
          days={conservative}
          date={conDate}
          color="text-rose-400"
        />
      </div>

      {/* 基準資料區 */}
      <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/40">
        <div className="text-xs font-medium text-slate-400 mb-2">📊 基準資料</div>
        <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-500">
          <span>基準天數</span>
          <span className="text-right font-mono text-slate-300">{baseWaitDays} 天</span>
          <span>趨勢修正</span>
          <span className="text-right font-mono text-slate-300">
            {trendAvailable ? `× ${trendModifier.toFixed(2)} (Δ ${(backlogDelta * 100).toFixed(1)}%)` : '資料不足，暫無修正'}
          </span>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-600/60">
        <div className="text-xs text-slate-500 leading-relaxed">
          💡 實際審查時間受多項因素影響（文件完備度、補件次數、入管局當月工作量）。
          保守預估已包含行政延遲緩衝。高度人才為獨立審查軌道，不受一般案件壅塞影響。
          請以入管局正式通知為準。
        </div>
      </div>
    </div>
  );
}

function ScenarioCard({
  title,
  days,
  date,
  color,
  isCenter,
}: {
  title: string;
  days: number;
  date: Date;
  color: string;
  isCenter?: boolean;
}) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');

  return (
    <div
      className={`
        rounded-xl p-4 border transition-all duration-300
        ${isCenter ? 'scale-[1.02] border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/10' : 'border-slate-600 bg-slate-800/40'}
      `}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-0.5">{title}</div>
          <div className={`text-xl font-bold ${color}`}>{y}/{m}/{d}</div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-black ${color}`}>{days}</div>
          <div className="text-xs text-slate-500">剩餘天數</div>
        </div>
      </div>
      {isCenter && (
        <div className="mt-2 pt-2 border-t border-cyan-500/20 text-xs text-cyan-300 flex items-center gap-1">
          👑 基於歷史基準 + e-Stat 趨勢修正
        </div>
      )}
    </div>
  );
}
