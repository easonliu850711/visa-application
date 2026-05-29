'use client';

import React, { useState } from 'react';
import type { BureauInfo } from '../types';

const API_PREFIX = '/visa-application';

interface Props {
  bureaus: BureauInfo[];
}

export default function ContributionForm({ bureaus }: Props) {
  const [applyDate, setApplyDate] = useState('');
  const [resultDate, setResultDate] = useState('');
  const [bureau, setBureau] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`${API_PREFIX}/api/contribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'nosae-apikey-202605',
          applyDate,
          resultDate,
          bureau,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setResult({
          success: true,
          message: `感謝你的協助！你提供的資料（${data.actualDays} 天）已收到，幫助審查時間的推估更準確 🙏`,
        });
      } else {
        setResult({
          success: false,
          message: data.error || '送出失敗',
        });
      }
    } catch (e: any) {
      setResult({
        success: false,
        message: `連線錯誤：${e.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card-light rounded-3xl p-5 space-y-4">
      {/* 入管局選擇 */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">
          申請入管局
        </label>
        <select
          value={bureau}
          onChange={(e) => setBureau(e.target.value)}
          required
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400"
        >
          <option value="">選擇入管局</option>
          {bureaus.map((b) => (
            <option key={b.code} value={b.code}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* 申請日期 */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">
          申請日期
        </label>
        <input
          type="date"
          value={applyDate}
          onChange={(e) => setApplyDate(e.target.value)}
          required
          max={new Date().toISOString().split('T')[0]}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400"
        />
      </div>

      {/* 結果日期 */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">
          收到結果日期
        </label>
        <input
          type="date"
          value={resultDate}
          onChange={(e) => setResultDate(e.target.value)}
          required
          max={new Date().toISOString().split('T')[0]}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400"
        />
      </div>

      {/* 送出按鈕 */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-sky-500 text-white text-sm font-bold hover:from-teal-600 hover:to-sky-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? '送出中…' : '送出資料'}
      </button>

      {/* 結果訊息 */}
      {result && (
        <div className={`text-xs leading-relaxed p-3 rounded-xl whitespace-pre-line ${result.success ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
          {result.message}
        </div>
      )}
    </form>
  );
}
