'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

interface BacklogChartProps {
  data: { date: string; backlog: number }[];
}

// 自定義 Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-imori-800/90 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 shadow-xl">
        <p className="text-imori-200 text-xs mb-1">{label}</p>
        <p className="text-white font-semibold text-sm">
          積壓件數: {payload[0].value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

export default function BacklogChart({ data }: BacklogChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10 text-center text-imori-400">
        暫無歷史數據可顯示
      </div>
    );
  }

  // 最新值和趨勢
  const latestValue = data[data.length - 1]?.backlog || 0;
  const prevValue = data.length > 1 ? data[data.length - 2]?.backlog : latestValue;
  const trend = latestValue - prevValue;
  const trendLabel = trend > 0 ? '↑ 增加中 (塞車)' : trend < 0 ? '↓ 減少中 (清庫存)' : '→ 持平';

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-imori-100 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-imori-400" />
          歷史積壓趨勢
        </h3>
        <div className={`
          text-xs px-3 py-1 rounded-full
          ${trend > 0 ? 'bg-red-500/20 text-red-300' : trend < 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-imori-500/20 text-imori-300'}
        `}>
          {trendLabel}
        </div>
      </div>

      <div className="text-xs text-imori-400 mb-4 text-center">
        最新積壓: <span className="text-white font-semibold">{latestValue.toLocaleString()}</span> 件
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#8fc5b6', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#8fc5b6', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => val.toLocaleString()}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={latestValue}
              stroke="rgba(238, 139, 139, 0.3)"
              strokeDasharray="5 5"
              label={{
                value: '目前',
                fill: '#ee8b8b',
                fontSize: 11,
                position: 'right',
              }}
            />
            <Line
              type="monotone"
              dataKey="backlog"
              stroke="#478d7d"
              strokeWidth={2.5}
              dot={false}
              activeDot={{
                r: 5,
                fill: '#65a997',
                stroke: '#478d7d',
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 text-xs text-imori-400 text-center">
        資料來源: e-Stat 政府統計 (7天更新一次)
      </div>
    </div>
  );
}
