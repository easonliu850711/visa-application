'use client';

import React, { useState, useMemo } from 'react';
import type { BureauInfo } from '@/types';

interface UserInputFormProps {
  bureaus: BureauInfo[];
  onSubmit: (data: {
    bureauCode: string;
    applyDate: string;
  }) => void;
  isLoading: boolean;
}

export default function UserInputForm({ bureaus, onSubmit, isLoading }: UserInputFormProps) {
  const defaultDate = (() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  })();

  const [selectedBureau, setSelectedBureau] = useState(bureaus.length > 0 ? bureaus[0].code : '');
  const [selectedDate, setSelectedDate] = useState(defaultDate);

  const chosenBureau = useMemo(
    () => bureaus.find(b => b.code === selectedBureau),
    [bureaus, selectedBureau],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      bureauCode: selectedBureau,
      applyDate: selectedDate,
    });
  };

  const isPureTokyo = selectedBureau === 'tokyo-pure';
  const isPureOsaka = selectedBureau === 'osaka-pure';

  return (
    <form onSubmit={handleSubmit} className="min-w-0 space-y-5">
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1.5">
          申請入管局
        </label>
        <select
          value={selectedBureau}
          onChange={e => setSelectedBureau(e.target.value)}
          disabled={isLoading}
          className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition disabled:opacity-50 appearance-none cursor-pointer shadow-sm min-w-0"
        >
          {bureaus.map(b => (
            <option key={b.code} value={b.code}>{b.name}</option>
          ))}
        </select>
        <p className="text-xs text-slate-500 mt-1.5">
          {chosenBureau ? `已選擇：${chosenBureau.name}` : ''}
        </p>
        {(isPureTokyo || isPureOsaka) && (
          <p className="w-full mt-2 text-xs leading-relaxed text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 min-w-0">
            {isPureTokyo
              ? '「東京入管局（横浜除外・推定）」為推估項目：以東京入管局公開數字扣除横浜支局公開數字後估算，並非 e-Stat 原始獨立欄位。'
              : '「大阪入管局（神戸除外・推定）」為推估項目：以大阪入管局公開數字扣除神戸支局公開數字後估算，並非 e-Stat 原始獨立欄位。'}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1.5">
          遞交申請日期
        </label>
        <input
          type="date"
          value={selectedDate}
          max={defaultDate}
          onChange={e => setSelectedDate(e.target.value)}
          disabled={isLoading}
          className="block w-full max-w-full min-w-0 box-border px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition disabled:opacity-50 shadow-sm appearance-none [-webkit-appearance:none]"
        />
        <p className="text-xs text-slate-500 mt-1.5">
          預設為今天。若申請月尚未公開，系統會以最新公開月份推估，並在結果中標示。
        </p>
      </div>

      <button
        type="submit"
        disabled={isLoading || !selectedBureau || !selectedDate}
        className="w-full py-3 rounded-2xl font-black text-base transition duration-300
          bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400
          text-white shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30
          disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
          active:scale-[0.98] min-w-0"
      >
        {isLoading ? (
          <span className="flex min-w-0 items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            分析中…
          </span>
        ) : (
          '開始預測'
        )}
      </button>
    </form>
  );
}
