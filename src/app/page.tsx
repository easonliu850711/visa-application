'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BookUser,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Database,
  Eye,
  Sparkles,
  RefreshCw,
  HeartHandshake,
} from 'lucide-react';

import UserInputForm from '../components/UserInputForm';
import ContributionForm from '../components/ContributionForm';
import PredictionReportV5 from '../components/v5/PredictionReportV5';
import type { BureauInfo } from '../types';
import type { V5Output } from '../lib/v5/engine';

const MODEL_RELEASED_AT = '2026-05-20';
const MODEL_VERSION = 'V7.5';
const API_PREFIX = '/visa-application';

type AnalyticsSummary = {
  total: number;
  today: number;
  date: string;
  lastUpdated: string | null;
};

export default function HomePage() {
  const [bureaus, setBureaus] = useState<BureauInfo[]>([]);
  const [bureauLoading, setBureauLoading] = useState(true);
  const [bureauError, setBureauError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [v5Result, setV5Result] = useState<V5Output | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadBureaus() {
      setBureauLoading(true);
      setBureauError(null);

      try {
        const res = await fetch(`${API_PREFIX}/api/e-stat`, { cache: 'no-store' });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();

        if (!cancelled) {
          if (data.bureaus?.length > 0) {
            setBureaus(data.bureaus);
          } else {
            setBureauError('目前無可用入管局資料');
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          console.warn('Failed to load bureaus:', e);
          setBureauError('入管局清單載入失敗，請確認 API 路徑或 e-Stat 連線狀態');
        }
      } finally {
        if (!cancelled) {
          setBureauLoading(false);
        }
      }
    }

    async function trackVisit() {
      try {
        const res = await fetch(`${API_PREFIX}/api/analytics/visit`, {
          method: 'POST',
          cache: 'no-store',
        });
        if (res.ok) {
          setAnalytics(await res.json());
        }
      } catch (e) {
        console.warn('Failed to track visit:', e);
      }
    }

    loadBureaus();
    trackVisit();

    return () => {
      cancelled = true;
    };
  }, []);

  const handlePredict = useCallback(async (input: {
    bureauCode: string;
    applyDate: string;
  }) => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    setV5Result(null);

    try {
      const res = await fetch(`${API_PREFIX}/api/prediction/v5`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userApplyDate: input.applyDate,
          userBureau: input.bureauCode,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.status === 'error' || data.status === 'insufficient_data') {
        setError(data.message || data.error || '預測失敗');
        setV5Result(null);
      } else {
        setV5Result(data as V5Output);
      }
    } catch (e: any) {
      setError(`連線錯誤：${e.message}`);
      setV5Result(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen text-slate-900">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-teal-400 to-sky-400 grid place-items-center shadow-lg shadow-teal-500/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-black text-sm tracking-tight text-slate-900">Visa Predictor</span>
              <div className="text-[10px] text-slate-500">更新日 {MODEL_RELEASED_AT}</div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 text-[10px] text-slate-600">
            <span className="bg-white px-2.5 py-1.5 rounded-full border border-slate-200 flex items-center gap-1 shadow-sm">
              <CalendarDays className="w-3 h-3 text-teal-500" /> 更版日 {MODEL_RELEASED_AT}
            </span>
            <span className="bg-white px-2.5 py-1.5 rounded-full border border-slate-200 flex items-center gap-1 shadow-sm">
              <Database className="w-3 h-3 text-sky-500" /> e-Stat 0003449073
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-[11px] text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full mb-3 shadow-sm">
            <Sparkles className="w-3 h-3" />
            Studio Imori
          </div>
          <h1 className="text-3xl md:text-5xl font-black bg-gradient-to-r from-teal-600 via-sky-600 to-blue-600 bg-clip-text text-transparent">
            日本永住申請審查進度預估
          </h1>
          <p className="text-slate-600 text-sm mt-4 max-w-2xl mx-auto leading-relaxed">
            以 e-Stat 公開統計與近期處理趨勢為基礎，提供永住申請等待期間的區間推估。公開資料與推估資料會分開標示，方便判斷可信度。
          </p>
          <div className="flex md:hidden flex-wrap justify-center gap-2 mt-4 text-[10px] text-slate-600">
            <span className="bg-white px-2 py-1 rounded-full border border-slate-200">更版日 {MODEL_RELEASED_AT}</span>
            <span className="bg-white px-2 py-1 rounded-full border border-slate-200">e-Stat 0003449073</span>
            <span className="bg-white px-2 py-1 rounded-full border border-slate-200">累積 {analytics?.total?.toLocaleString() ?? '—'} / 今日 {analytics?.today?.toLocaleString() ?? '—'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="md:col-span-2">
            <div className="card-light rounded-3xl p-5">
              <h2 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-400 inline-block" />
                申請資訊
              </h2>

              {bureauLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-10 bg-slate-200 rounded-lg" />
                  <div className="h-10 bg-slate-200 rounded-lg" />
                  <div className="h-20 bg-slate-100 rounded-xl" />
                </div>
              ) : bureauError ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <AlertTriangle className="w-8 h-8 text-rose-500 mb-2" />
                  <p className="text-xs text-rose-600 leading-relaxed">{bureauError}</p>
                </div>
              ) : bureaus.length > 0 ? (
                <UserInputForm
                  bureaus={bureaus}
                  onSubmit={handlePredict}
                  isLoading={isLoading}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <BookUser className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-xs text-slate-500">目前無可用入管局資料</p>
                </div>
              )}
            </div>

            <div className="mt-4 rounded-3xl border border-sky-100 bg-sky-50/80 p-4 text-xs text-sky-800 leading-relaxed">
              <div className="font-bold flex items-center gap-2 mb-1">
                <RefreshCw className="w-3.5 h-3.5" />
                資料更新說明
              </div>
              政府公開統計通常會延遲約三個月。尚未公開的月份會以近期趨勢補足，並在表格中標示為「推估」；圖表呈現最新 6 個已公開實際月份。申請後至少三個月再查詢會更穩定。
            </div>
          </div>

          <div className="md:col-span-3">
            <div className="card-light rounded-3xl p-5 min-h-[340px]">
              <h2 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                預測報告
              </h2>

              {!hasSearched && !isLoading && !error && !v5Result && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BookUser className="w-12 h-12 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500">請輸入左側申請資訊開始預測</p>
                </div>
              )}

              {isLoading && (
                <div className="animate-pulse space-y-4 py-8">
                  <div className="h-6 bg-slate-200 rounded w-3/4 mx-auto" />
                  <div className="h-20 bg-slate-200 rounded-xl" />
                  <div className="h-12 bg-slate-100 rounded-xl" />
                </div>
              )}

              {error && !isLoading && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <AlertTriangle className="w-10 h-10 text-rose-500 mb-2" />
                  <p className="text-sm text-rose-600">{error}</p>
                </div>
              )}

              {v5Result && !isLoading && !error && (
                <PredictionReportV5 result={v5Result} />
              )}
            </div>
          </div>
        </div>

        {/* 貢獻數據表單 */}
        <div className="mt-16 border-t border-slate-200/60 pt-12">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 text-[11px] text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full mb-3 shadow-sm">
              <HeartHandshake className="w-3 h-3" />
              貢獻數據
            </div>
            <h2 className="text-xl font-black text-slate-800">
              你的實際經驗，能讓預測更準確
            </h2>
            <p className="text-sm text-slate-600 mt-2 max-w-lg mx-auto">
              如果你已取得永住許可，填寫申請日與結果日，幫助我們校正預測模型。
            </p>
          </div>
          <div className="max-w-md mx-auto">
            <ContributionForm bureaus={bureaus} />
          </div>
        </div>

        <footer className="mt-12 text-center">
          <p className="text-xs text-slate-500 leading-relaxed max-w-2xl mx-auto">
            ⚖️ 本網站使用 e-Stat 政府統計「出入国管理統計」統計表 ID 0003449073 作為資料來源，並以近期處理趨勢推估等待區間。結果僅供參考，不保證個案實際通知日。
          </p>
          <div className="mt-4 text-[11px] text-slate-400 flex flex-wrap justify-center gap-3">
            <span>Made with 🌸 by Studio Imori</span>
            <span>·</span>
				<span className="bg-white px-2.5 py-1.5 rounded-full border border-slate-200 flex items-center gap-1 shadow-sm">
					<Eye className="w-3 h-3 text-indigo-500" />
						累積 {analytics?.total?.toLocaleString() ?? '—'} / 今日 {analytics?.today?.toLocaleString() ?? '—'}
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}
