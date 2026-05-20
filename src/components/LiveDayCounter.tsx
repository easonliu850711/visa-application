'use client';

import React, { useState, useEffect, useRef } from 'react';

interface LiveDayCounterProps {
  days: number;
  isAnimating: boolean;
}

export default function LiveDayCounter({ days, isAnimating }: LiveDayCounterProps) {
  const [displayDays, setDisplayDays] = useState(0);
  const [isCounting, setIsCounting] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 當 days 更新且 isAnimating 時，從 0 跳到目標值
  useEffect(() => {
    if (!days || days <= 0) return;

    if (isAnimating) {
      setIsCounting(true);
      let current = 0;
      const target = days;
      const step = Math.max(1, Math.floor(target / 30)); // 30 步完成
      const duration = 800; // 800ms 動畫
      const intervalMs = Math.max(20, duration / (target / step));

      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        current += step;
        if (current >= target) {
          setDisplayDays(target);
          setIsCounting(false);
          if (intervalRef.current) clearInterval(intervalRef.current);
        } else {
          setDisplayDays(current);
        }
      }, intervalMs);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      setDisplayDays(days);
    }
  }, [days, isAnimating]);

  // 啟動時立即顯示最終值（防止閃爍）
  useEffect(() => {
    if (days > 0 && !isAnimating) {
      setDisplayDays(days);
    }
  }, []);

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div className="text-5xl md:text-6xl font-black tabular-nums tracking-tight">
          <span className={`bg-gradient-to-br from-cyan-300 to-blue-400 bg-clip-text text-transparent transition-all duration-300 ${isCounting ? 'scale-110' : ''}`}>
            {displayDays.toLocaleString()}
          </span>
          <span className="text-lg md:text-xl font-medium text-slate-400 ml-2">天</span>
        </div>
        {isCounting && (
          <div className="absolute -top-1 -right-2">
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
            </span>
          </div>
        )}
      </div>
      <div className="text-xs text-slate-500 mt-1">已遞交天數</div>
    </div>
  );
}
