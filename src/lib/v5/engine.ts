// ============================================================
// V7.4 Public Six-Month Charts Engine
// e-Stat 0003449073 的「受理_旧受 / 受理_新受 / 既済」為核心，
// 推估申請當下的前方隊伍，再以近期處理速度形成三情境。
// ============================================================

import { fetchEStatData } from '@/lib/e-stat-parser';
import type { MonthlyStats } from '@/types';

export interface V5Input {
  userApplyDate: string;
  userBureau: string;
  userRoute?: 'normal' | 'hsp_70' | 'hsp_80';
}

export interface ScenarioPrediction {
  days: number;
  date: string;
  basis: string;
  dailyRate: number;
  monthlyProcessed: number;
}

export interface V5Output {
  version: string;
  status: 'available' | 'near_final_stage' | 'insufficient_data' | 'error' | 'delayed_or_final_stage';

  bureau: string;
  bureauCode: string;
  route: string;
  userApplyDate: string;

  applyMonthBacklog: number;
  applyMonthOldReceived: number;
  applyMonthNewReceived: number;
  applyMonthReceivedTotal: number;
  applyDayRatio: number;
  queuePositionAtApply: number;

  processedAfterApply: number;
  remainingBacklog: number;

  latestMonthPermit: number;
  latestMonthProcessed: number;
  dailyProcessRate: number;

  estimatedDays: number;
  permitRate: number;
  estimatedCompletionDate: string;

  optimisticDays: number;
  moderateDays: number;
  conservativeDays: number;
  optimisticDate: string;
  moderateDate: string;
  conservativeDate: string;

  prediction: {
    optimistic: ScenarioPrediction;
    moderate: ScenarioPrediction;
    conservative: ScenarioPrediction;
  };

  routeCalibrationFactor: number;
  routeFloorTotalDays: number;
  alreadyWaitedDays: number;

  latestMonth: string;
  projectedThroughMonth: string;
  projectionBasis: string;
  projectedMonthsCount: number;
  applyMonth: string;
  applyMonthDataMode: 'actual' | 'estimated_from_latest_stats';
  applyMonthDataBasis: string;
  latestStatsUpdatedAt: string;
  modelScope: string;
  modelReleasedAt: string;
  dataSourceUrl: string;
  calculationNarrative: string;

  practicalAnchor: {
    bureau: string;
    route: string;
    normalAnchorTotalDays: number;
    routeAnchorTotalDays: number;
    routeAnchorFactor: number;
    anchorRemainingDays: number;
    anchorApplied: boolean;
    note: string;
  };

  latestMonthStats: {
    month: string;
    receivedTotal: number;
    oldReceived: number;
    applications: number;
    processed: number;
    permit: number;
    denied: number;
    other: number;
    backlog: number;
    permitRate: number;
    processVsApplicationRatio: number;
  };

  recentTrend: {
    month: string;
    receivedTotal: number;
    oldReceived: number;
    applications: number;
    processed: number;
    permit: number;
    denied: number;
    other: number;
    backlog: number;
    permitRate: number;
    processVsApplicationRatio: number;
    estimated?: boolean;
  }[];

  publicTrend: {
    month: string;
    receivedTotal: number;
    oldReceived: number;
    applications: number;
    processed: number;
    permit: number;
    denied: number;
    other: number;
    backlog: number;
    permitRate: number;
    processVsApplicationRatio: number;
    estimated?: boolean;
  }[];

  bureauRanking: {
    bureauCode: string;
    bureau: string;
    latestMonth: string;
    receivedTotal: number;
    oldReceived: number;
    applications: number;
    processed: number;
    backlog: number;
    permitRate: number;
    processVsApplicationRatio: number;
    estimatedMonthsByLatestSpeed: number;
  }[];

  warnings: string[];
  message: string;
}

const MODEL_VERSION = 'v7.4-public-six-month-charts-final';
const MODEL_RELEASED_AT = '2026-05-20';
const DATA_SOURCE_URL = 'https://www.e-stat.go.jp/dbview?sid=0003449073';

const ROUTE_LABELS: Record<NonNullable<V5Input['userRoute']>, string> = {
  normal: '一般申請',
  hsp_70: '高度專門職 70 分',
  hsp_80: '高度專門職 80 分',
};

// 高度人才在永住審查中沒有公開獨立的處理速度統計。
// V5.8 起不再對高度人才做較快或較慢的天數修正；僅保留通道標示與說明。
const ROUTE_FACTORS: Record<NonNullable<V5Input['userRoute']>, number> = {
  normal: 1,
  hsp_70: 1,
  hsp_80: 1,
};

const ROUTE_CONSERVATIVE_FLOOR_TOTAL_DAYS: Record<NonNullable<V5Input['userRoute']>, number> = {
  normal: 0,
  hsp_70: 0,
  hsp_80: 0,
};

const BUREAU_LABELS: Record<string, string> = {
  sapporo: '札幌入管局',
  sendai: '仙台入管局',
  tokyo: '東京入管局',
  'tokyo-pure': '東京入管局（横浜除外・推定）',
  'osaka-pure': '大阪入管局（神戸除外・推定）',
  narita: '成田空港支局',
  haneda: '羽田空港支局',
  yokohama: '横浜支局',
  nagoya: '名古屋入管局',
  'chubu-airport': '中部空港支局',
  osaka: '大阪入管局',
  'kansai-airport': '関西空港支局',
  kobe: '神戸支局',
  hiroshima: '広島入管局',
  takamatsu: '高松入管局',
  fukuoka: '福岡入管局',
  naha: '那覇支局',
};

function todayJST(): string {
  const d = new Date();
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().split('T')[0];
}

function toDateJST(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00+09:00`);
}

function addDays(dateStr: string, days: number): string {
  const d = toDateJST(dateStr);
  d.setDate(d.getDate() + Math.max(0, Math.ceil(days)));
  return d.toISOString().split('T')[0];
}

function daysBetween(from: string, to: string): number {
  return Math.max(0, Math.floor((toDateJST(to).getTime() - toDateJST(from).getTime()) / 86400000));
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function monthEndDate(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth(year, month)).padStart(2, '0')}`;
}

function compareMonth(a: { year: number; month: number }, b: { year: number; month: number }): number {
  return a.year - b.year || a.month - b.month;
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function filterBureauStats(allStats: MonthlyStats[], bureauCode: string): MonthlyStats[] {
  return allStats
    .filter(s => s.bureauCode === bureauCode)
    .sort((a, b) => a.year - b.year || a.month - b.month);
}

function latestUsableStat(rows: MonthlyStats[]): MonthlyStats | undefined {
  const usable = rows.filter(s => (s.processed || 0) > 0 || (s.receivedTotal || 0) > 0);
  return usable[usable.length - 1] || rows[rows.length - 1];
}

function recentRows(rows: MonthlyStats[], months: number): MonthlyStats[] {
  // 重要：三情境速度只使用「已公開的實際統計月」，不可使用未公開月推估資料。
  return rows.filter(s => s.processed > 0).slice(-months);
}

function getMonthRow(rows: MonthlyStats[], year: number, month: number): MonthlyStats | undefined {
  return rows.find(row => row.year === year && row.month === month);
}

function dateFromMonthDay(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isMonthAfterLatestActual(cursor: { year: number; month: number }, latestActual: MonthlyStats | undefined): boolean {
  if (!latestActual) return true;
  return compareMonth(cursor, latestActual) > 0;
}

function monthlyProcessedForSimulation(
  actualRows: MonthlyStats[],
  cursor: { year: number; month: number },
  latestActual: MonthlyStats | undefined,
  scenarioMonthlyProcessed: number,
): { processed: number; estimated: boolean } {
  const actualRow = getMonthRow(actualRows, cursor.year, cursor.month);
  if (actualRow && !isMonthAfterLatestActual(cursor, latestActual) && actualRow.processed > 0) {
    return { processed: actualRow.processed, estimated: false };
  }
  return { processed: scenarioMonthlyProcessed, estimated: true };
}

function estimateRemainingQueueAtDate(
  actualRows: MonthlyStats[],
  queueAtApply: number,
  routeFactor: number,
  applyDate: string,
  targetDate: string,
  speedRows: MonthlyStats[],
): { remaining: number; processedAfterApply: number } {
  const applyYear = Number(applyDate.slice(0, 4));
  const applyMonth = Number(applyDate.slice(5, 7));
  const applyDay = Number(applyDate.slice(8, 10));
  const targetYear = Number(targetDate.slice(0, 4));
  const targetMonth = Number(targetDate.slice(5, 7));
  const targetDay = Number(targetDate.slice(8, 10));
  const latestActual = latestUsableStat(actualRows);
  const scenarioMonthlyProcessed = Math.max(0, avg(speedRows.map(row => row.processed || 0)));

  let remainingQueue = Math.max(0, Math.ceil(queueAtApply * routeFactor));
  let cursor = { year: applyYear, month: applyMonth };

  for (let i = 0; i < 240; i += 1) {
    if (compareMonth(cursor, { year: targetYear, month: targetMonth }) > 0) break;

    const dim = daysInMonth(cursor.year, cursor.month);
    const { processed: monthlyProcessed } = monthlyProcessedForSimulation(actualRows, cursor, latestActual, scenarioMonthlyProcessed);
    if (monthlyProcessed <= 0) break;

    const isApplyMonth = cursor.year === applyYear && cursor.month === applyMonth;
    const isTargetMonth = cursor.year === targetYear && cursor.month === targetMonth;

    let activeDays = dim;
    if (isApplyMonth && isTargetMonth) {
      activeDays = Math.max(0, targetDay - applyDay);
    } else if (isApplyMonth) {
      activeDays = Math.max(0, dim - applyDay);
    } else if (isTargetMonth) {
      activeDays = Math.max(0, targetDay);
    }

    remainingQueue = Math.max(0, remainingQueue - monthlyProcessed * (activeDays / dim));
    cursor = addOneMonth(cursor.year, cursor.month);
  }

  const roundedRemaining = Math.max(0, Math.round(remainingQueue));
  return {
    remaining: roundedRemaining,
    processedAfterApply: Math.max(0, Math.round(queueAtApply * routeFactor - roundedRemaining)),
  };
}

function simulateScenarioFromApplyQueue(
  label: string,
  actualRows: MonthlyStats[],
  speedRows: MonthlyStats[],
  queueAtApply: number,
  routeFactor: number,
  applyDate: string,
  today: string,
): ScenarioPrediction {
  const applyYear = Number(applyDate.slice(0, 4));
  const applyMonth = Number(applyDate.slice(5, 7));
  const applyDay = Number(applyDate.slice(8, 10));
  const latestActual = latestUsableStat(actualRows);
  const scenarioMonthlyProcessed = Math.max(0, avg(speedRows.map(row => row.processed || 0)));
  const scenarioDailyRate = scenarioMonthlyProcessed > 0 ? scenarioMonthlyProcessed / 20 : 0;

  let remainingQueue = Math.max(0, Math.ceil(queueAtApply * routeFactor));
  let cursor = { year: applyYear, month: applyMonth };

  if (remainingQueue <= 0) {
    return {
      days: 0,
      date: applyDate,
      basis: `${label}（逐月消化推估）`,
      dailyRate: round1(scenarioDailyRate),
      monthlyProcessed: Math.round(scenarioMonthlyProcessed),
    };
  }

  for (let i = 0; i < 240; i += 1) {
    const dim = daysInMonth(cursor.year, cursor.month);
    const { processed: monthlyProcessed, estimated } = monthlyProcessedForSimulation(actualRows, cursor, latestActual, scenarioMonthlyProcessed);

    if (monthlyProcessed <= 0) break;

    const isApplyMonth = cursor.year === applyYear && cursor.month === applyMonth;
    const activeDays = isApplyMonth ? Math.max(0, dim - applyDay) : dim;
    const availableProcessedThisMonth = monthlyProcessed * (activeDays / dim);

    if (availableProcessedThisMonth > 0 && remainingQueue <= availableProcessedThisMonth) {
      const daysNeeded = Math.max(1, Math.ceil((remainingQueue / monthlyProcessed) * dim));
      const startDate = isApplyMonth
        ? applyDate
        : dateFromMonthDay(cursor.year, cursor.month, 1);
      const completionDate = isApplyMonth
        ? addDays(startDate, daysNeeded)
        : addDays(startDate, daysNeeded - 1);

      return {
        days: Math.max(0, daysBetween(today, completionDate)),
        date: completionDate,
        basis: estimated
          ? `${label}（最新公開月後推估）`
          : `${label}（公開月逐月扣除）`,
        dailyRate: round1(monthlyProcessed / 20),
        monthlyProcessed: Math.round(monthlyProcessed),
      };
    }

    remainingQueue = Math.max(0, remainingQueue - availableProcessedThisMonth);
    cursor = addOneMonth(cursor.year, cursor.month);
  }

  const estimatedFutureDays = scenarioDailyRate > 0 ? Math.ceil(remainingQueue / scenarioDailyRate) : 0;
  const fallbackDate = addDays(today, estimatedFutureDays);
  return {
    days: Math.max(0, estimatedFutureDays),
    date: fallbackDate,
    basis: `${label}（長期外推）`,
    dailyRate: round1(scenarioDailyRate),
    monthlyProcessed: Math.round(scenarioMonthlyProcessed),
  };
}

function sortScenarios(scenarios: ScenarioPrediction[]) {
  const sorted = [...scenarios].sort((a, b) => (a.days - b.days) || a.date.localeCompare(b.date));
  return {
    optimistic: sorted[0],
    moderate: sorted[1] || sorted[0],
    conservative: sorted[2] || sorted[sorted.length - 1] || sorted[0],
  };
}

function buildStatRow(row: MonthlyStats, estimated = false) {
  const permitRate = row.processed > 0 ? round1((row.permit / row.processed) * 100) : 0;
  const processVsApplicationRatio = row.applications > 0 ? round1((row.processed / row.applications) * 100) : 0;
  return {
    month: monthKey(row.year, row.month),
    receivedTotal: row.receivedTotal || ((row.oldReceived || 0) + (row.applications || 0)),
    oldReceived: row.oldReceived || 0,
    applications: row.applications || 0,
    processed: row.processed || 0,
    permit: row.permit || 0,
    denied: row.denied || 0,
    other: row.other || 0,
    backlog: row.backlog || 0,
    permitRate,
    processVsApplicationRatio,
    estimated,
  };
}

function monthIndexOf(year: number, month: number): number {
  return year * 12 + month;
}

function addOneMonth(year: number, month: number): { year: number; month: number } {
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

function buildProjectedRows(rows: MonthlyStats[], targetYear: number, targetMonth: number): { rows: MonthlyStats[]; projectedRows: MonthlyStats[]; basis: string } {
  const sorted = [...rows].sort((a, b) => a.year - b.year || a.month - b.month);
  const latest = latestUsableStat(sorted);
  if (!latest) return { rows: sorted, projectedRows: [], basis: '' };

  const latestIndex = monthIndexOf(latest.year, latest.month);
  const targetIndex = monthIndexOf(targetYear, targetMonth);
  if (targetIndex <= latestIndex) {
    return { rows: sorted, projectedRows: [], basis: '申請月已有公開統計，未使用未公開月份推估。' };
  }

  const basisRows = sorted.filter(r => r.processed > 0 || r.applications > 0).slice(-2);
  const divisor = Math.max(1, basisRows.length);
  const avgApplications = Math.round(basisRows.reduce((sum, r) => sum + (r.applications || 0), 0) / divisor);
  const avgProcessed = Math.round(basisRows.reduce((sum, r) => sum + (r.processed || 0), 0) / divisor);
  const avgPermit = Math.round(basisRows.reduce((sum, r) => sum + (r.permit || 0), 0) / divisor);
  const avgDenied = Math.round(basisRows.reduce((sum, r) => sum + (r.denied || 0), 0) / divisor);
  const avgOther = Math.max(0, avgProcessed - avgPermit - avgDenied);

  const projectedRows: MonthlyStats[] = [];
  let cursor = addOneMonth(latest.year, latest.month);
  let previousBacklog = latest.backlog || latest.oldReceived || 0;

  while (monthIndexOf(cursor.year, cursor.month) <= targetIndex) {
    const oldReceived = previousBacklog;
    const applications = Math.max(0, avgApplications);
    const processed = Math.max(0, avgProcessed);
    const backlog = Math.max(0, oldReceived + applications - processed);
    const row: MonthlyStats = {
      year: cursor.year,
      month: cursor.month,
      bureauCode: latest.bureauCode,
      receivedTotal: oldReceived + applications,
      oldReceived,
      applications,
      processed,
      permit: Math.min(processed, Math.max(0, avgPermit)),
      denied: Math.min(processed, Math.max(0, avgDenied)),
      other: Math.max(0, Math.min(processed, avgOther)),
      backlog,
    };
    projectedRows.push(row);
    previousBacklog = backlog;
    cursor = addOneMonth(cursor.year, cursor.month);
  }

  const latestText = monthKey(latest.year, latest.month);
  const targetText = monthKey(targetYear, targetMonth);
  return {
    rows: [...sorted, ...projectedRows],
    projectedRows,
    basis: `最新公開統計月為 ${latestText}；${targetText} 尚未公開，因此以最新兩個公開月份平均值逐月推估未公開月份。`,
  };
}

function emptyScenario(): ScenarioPrediction {
  const today = todayJST();
  return { days: 0, date: today, basis: '', dailyRate: 0, monthlyProcessed: 0 };
}

function makeEmptyOutput(input: V5Input, status: V5Output['status'], message: string): V5Output {
  const today = todayJST();
  const scenario = emptyScenario();
  return {
    version: MODEL_VERSION,
    status,
    bureau: BUREAU_LABELS[input.userBureau] || input.userBureau,
    bureauCode: input.userBureau,
    route: '一般申請',
    userApplyDate: input.userApplyDate,

    applyMonthBacklog: 0,
    applyMonthOldReceived: 0,
    applyMonthNewReceived: 0,
    applyMonthReceivedTotal: 0,
    applyDayRatio: 0,
    queuePositionAtApply: 0,
    processedAfterApply: 0,
    remainingBacklog: 0,
    latestMonthPermit: 0,
    latestMonthProcessed: 0,
    dailyProcessRate: 0,
    estimatedDays: 0,
    permitRate: 0,
    estimatedCompletionDate: today,
    optimisticDays: 0,
    moderateDays: 0,
    conservativeDays: 0,
    optimisticDate: today,
    moderateDate: today,
    conservativeDate: today,
    prediction: { optimistic: scenario, moderate: scenario, conservative: scenario },
    routeCalibrationFactor: 1,
    routeFloorTotalDays: 0,
    alreadyWaitedDays: 0,
    latestMonth: '',
    projectedThroughMonth: '',
    projectionBasis: '',
    projectedMonthsCount: 0,
    applyMonth: '',
    applyMonthDataMode: 'actual',
    applyMonthDataBasis: '',
    latestStatsUpdatedAt: today,
    modelScope: 'old_receipt_queue_simulation',
    modelReleasedAt: MODEL_RELEASED_AT,
    dataSourceUrl: DATA_SOURCE_URL,
    calculationNarrative: '本模型使用 e-Stat 公開統計中的旧受・新受・既済資料，推估申請時前方隊伍與後續消化速度。',
    practicalAnchor: {
      bureau: input.userBureau,
      route: 'normal',
      normalAnchorTotalDays: 0,
      routeAnchorTotalDays: 0,
      routeAnchorFactor: 1,
      anchorRemainingDays: 0,
      anchorApplied: false,
      note: 'V5.8 改以旧受為主要隊伍起點；若申請月尚未公開，會用最近兩個月平均收受/處理結構向前推估。',
    },
    latestMonthStats: {
      month: '', receivedTotal: 0, oldReceived: 0, applications: 0, processed: 0,
      permit: 0, denied: 0, other: 0, backlog: 0, permitRate: 0, processVsApplicationRatio: 0,
    },
    recentTrend: [],
    publicTrend: [],
    bureauRanking: [],
    warnings: [],
    message,
  };
}

function getApplyMonthStat(rows: MonthlyStats[], year: number, month: number): MonthlyStats | undefined {
  return rows.find(s => s.year === year && s.month === month);
}
function getApplyStatOrEstimate(rows: MonthlyStats[], projectedRows: MonthlyStats[], year: number, month: number, projectionBasis: string): { stat: MonthlyStats; mode: 'actual' | 'estimated_from_latest_stats'; basis: string } | undefined {
  const stat = getApplyMonthStat(rows, year, month);
  if (!stat) return undefined;

  const isProjected = projectedRows.some(r => r.year === year && r.month === month);
  if (isProjected) {
    return {
      stat,
      mode: 'estimated_from_latest_stats',
      basis: projectionBasis || ``,
    };
  }

  return {
    stat,
    mode: 'actual',
    basis: `申請月 ${monthKey(year, month)} 已有公開統計，直接使用該月資料。`,
  };
}


function processedAfterApply(rows: MonthlyStats[], applyDate: string, today: string): number {
  const applyYear = Number(applyDate.slice(0, 4));
  const applyMonth = Number(applyDate.slice(5, 7));
  const applyDay = Number(applyDate.slice(8, 10));
  const todayYear = Number(today.slice(0, 4));
  const todayMonth = Number(today.slice(5, 7));
  const todayDay = Number(today.slice(8, 10));
  let total = 0;

  for (const row of rows) {
    const cmpApply = compareMonth(row, { year: applyYear, month: applyMonth });
    const cmpToday = compareMonth(row, { year: todayYear, month: todayMonth });
    if (cmpApply < 0 || cmpToday > 0) continue;

    const dim = daysInMonth(row.year, row.month);

    if (row.year === applyYear && row.month === applyMonth && row.year === todayYear && row.month === todayMonth) {
      const activeDays = Math.max(0, todayDay - applyDay);
      total += row.processed * (activeDays / dim);
    } else if (row.year === applyYear && row.month === applyMonth) {
      const afterApplyDays = Math.max(0, dim - applyDay);
      total += row.processed * (afterApplyDays / dim);
    } else if (row.year === todayYear && row.month === todayMonth) {
      total += row.processed * (todayDay / dim);
    } else {
      total += row.processed;
    }
  }

  return Math.max(0, Math.round(total));
}

function buildBureauRanking(stats: MonthlyStats[], bureaus: { code: string; name: string }[]): V5Output['bureauRanking'] {
  const result: V5Output['bureauRanking'] = [];
  for (const bureau of bureaus) {
    const rows = filterBureauStats(stats, bureau.code);
    const latest = latestUsableStat(rows);
    if (!latest) continue;
    const stat = buildStatRow(latest);
    const estimatedMonthsByLatestSpeed = stat.processed > 0 ? round1(stat.receivedTotal / stat.processed) : 0;
    result.push({
      bureauCode: bureau.code,
      bureau: bureau.name,
      latestMonth: stat.month,
      receivedTotal: stat.receivedTotal,
      oldReceived: stat.oldReceived,
      applications: stat.applications,
      processed: stat.processed,
      backlog: stat.backlog,
      permitRate: stat.permitRate,
      processVsApplicationRatio: stat.processVsApplicationRatio,
      estimatedMonthsByLatestSpeed,
    });
  }
  return result.sort((a, b) => b.estimatedMonthsByLatestSpeed - a.estimatedMonthsByLatestSpeed);
}

export async function calculatePredictionV5(input: V5Input): Promise<V5Output> {
  const today = todayJST();
  const { userApplyDate, userBureau } = input;
  const userRoute: NonNullable<V5Input['userRoute']> = 'normal';

  console.info('[V7.1] Prediction Request', { bureau: userBureau, applyDate: userApplyDate });

  if (!/^\d{4}-\d{2}-\d{2}$/.test(userApplyDate)) {
    return makeEmptyOutput(input, 'error', '請輸入有效的申請日期格式 YYYY-MM-DD');
  }

  if (userApplyDate > today) {
    return makeEmptyOutput(input, 'error', '申請日期不可晚於今天');
  }

  const applyYear = Number(userApplyDate.slice(0, 4));
  const applyMonth = Number(userApplyDate.slice(5, 7));
  const applyDay = Number(userApplyDate.slice(8, 10));
  const applyMonthText = monthKey(applyYear, applyMonth);
  const alreadyWaitedDays = daysBetween(userApplyDate, today);
  const todayYear = Number(today.slice(0, 4));
  const todayMonth = Number(today.slice(5, 7));
  const targetIndex = Math.max(monthIndexOf(applyYear, applyMonth), monthIndexOf(todayYear, todayMonth));
  const projectionTargetYear = Math.floor((targetIndex - 1) / 12);
  const projectionTargetMonth = targetIndex - projectionTargetYear * 12;
  const endYM = today.slice(0, 4) + today.slice(5, 7);

  const { stats, bureaus, error } = await fetchEStatData(true, '202001', endYM);
  if (error || stats.length === 0) {
    return makeEmptyOutput(input, 'insufficient_data', 'e-Stat 資料取得失敗，請稍後再試');
  }

  const bureauStats = filterBureauStats(stats, userBureau);
  if (bureauStats.length < 3) {
    return makeEmptyOutput(input, 'insufficient_data', '此入管局目前統計資料不足，無法進行估算');
  }

  const warnings: string[] = [];
  const latestActual = latestUsableStat(bureauStats);
  if (!latestActual) {
    return makeEmptyOutput(input, 'insufficient_data', '找不到可用的最新統計月份');
  }

  const projection = buildProjectedRows(bureauStats, projectionTargetYear, projectionTargetMonth);
  const calculationRows = projection.rows;
  const applyStatSource = getApplyStatOrEstimate(calculationRows, projection.projectedRows, applyYear, applyMonth, projection.basis);
  if (!applyStatSource) {
    return makeEmptyOutput(input, 'insufficient_data', '找不到申請月份的統計資料，請確認申請日期是否落在公開資料範圍內');
  }

  const applyStat = applyStatSource.stat;
  if (userBureau === 'tokyo-pure') {
    warnings.push('純東京版為「東京入管局統計 - 横浜支局統計」的推定值，用於避免東京數字可能含横浜支局造成的混雜；此為系統推估，不是政府原始獨立欄位。');
  } else if (userBureau === 'osaka-pure') {
    warnings.push('純大阪版為「大阪入管局統計 - 神戸支局統計」的推定值，用於避免大阪數字可能含神戸支局造成的混雜；此為系統推估，不是政府原始獨立欄位。');
  }

  const latestMonth = monthKey(latestActual.year, latestActual.month);
  const latestMonthEnd = monthEndDate(latestActual.year, latestActual.month);
  const projectedThroughRow = calculationRows[calculationRows.length - 1] || latestActual;
  const projectedThroughMonth = monthKey(projectedThroughRow.year, projectedThroughRow.month);
  const bureauName = bureaus.find(b => b.code === userBureau)?.name || BUREAU_LABELS[userBureau] || userBureau;

  const dim = daysInMonth(applyYear, applyMonth);
  const dayRatio = Math.min(1, Math.max(0, applyDay / dim));
  const oldReceived = applyStat.oldReceived || Math.max(0, (applyStat.receivedTotal || 0) - (applyStat.applications || 0));
  const newReceived = applyStat.applications || 0;
  const receivedTotal = applyStat.receivedTotal || oldReceived + newReceived;

  // 申請當時的前方隊伍。UI 不直接揭露細公式，只描述為「旧受與當月新受位置推估」。
  const queueAtApply = Math.max(1, Math.round(oldReceived + newReceived * dayRatio));
  const routeFactor = ROUTE_FACTORS[userRoute] || 1;
  const r1 = recentRows(bureauStats, 1);
  const r3 = recentRows(bureauStats, 3);
  const r6 = recentRows(bureauStats, 6);
  const moderateSpeedRows = r3.length ? r3 : r1;
  const queueAsOfToday = estimateRemainingQueueAtDate(bureauStats, queueAtApply, routeFactor, userApplyDate, today, moderateSpeedRows);
  const processedAfter = queueAsOfToday.processedAfterApply;
  const remainingQueue = queueAsOfToday.remaining;

  if (r1.length === 0 || r3.length === 0 || r6.length === 0) {
    warnings.push('公開處理量資料不足，三情境可能無法完整反映速度變化。');
  }

  if (projection.projectedRows.length > 0) {
    warnings.push('政府統計通常約延遲數個月；未公開月份以最新兩個公開月平均值補足隊伍位置，但樂觀/中間/保守速度均只使用最新公開資料往回計算。');
  }

  const rawScenarios = [
    simulateScenarioFromApplyQueue('最新公開 1 個月處理速度', bureauStats, r1.length ? r1 : r3, queueAtApply, routeFactor, userApplyDate, today),
    simulateScenarioFromApplyQueue('最新公開 3 個月平均處理速度', bureauStats, r3.length ? r3 : r1, queueAtApply, routeFactor, userApplyDate, today),
    simulateScenarioFromApplyQueue('最新公開 6 個月平均處理速度', bureauStats, r6.length ? r6 : r3, queueAtApply, routeFactor, userApplyDate, today),
  ];

  const sorted = sortScenarios(rawScenarios);
  let optimistic = sorted.optimistic;
  let moderate = sorted.moderate;
  let conservative = sorted.conservative;

  const routeFloorTotalDays = ROUTE_CONSERVATIVE_FLOOR_TOTAL_DAYS[userRoute] || 0;
  const status: V5Output['status'] = remainingQueue <= 0 ? 'near_final_stage' : 'available';
  const latestStats = buildStatRow(latestActual);
  const projectedKeys = new Set(projection.projectedRows.map(r => `${r.year}-${r.month}`));
  const recentTrend = calculationRows.slice(-6).map(row => buildStatRow(row, projectedKeys.has(`${row.year}-${row.month}`)));
  const publicTrend = bureauStats.slice(-6).map(row => buildStatRow(row, false));
  const permitRate = latestStats.permitRate;
  const bureauRanking = buildBureauRanking(stats, bureaus);

  const message = status === 'near_final_stage'
    ? '依據目前公開統計推估，申請時前方隊伍可能已接近消化完畢；下方仍保留原模型推估日期。實際案件可能因補件、局內分流、插隊案件、優先審核案件或個案確認而比推估晚約 2～3 個月。'
    : '本結果依 e-Stat 公開統計中受理舊案、新受案件與已處理量建立隊伍推估，並以最新公開 1 / 3 / 6 個月處理速度形成三種情境。實際案件不一定完全依受理順序處理，可能比統計推估晚約 2～3 個月。';

  return {
    version: MODEL_VERSION,
    status,
    bureau: bureauName,
    bureauCode: userBureau,
    route: ROUTE_LABELS[userRoute],
    userApplyDate,

    applyMonthBacklog: queueAtApply,
    applyMonthOldReceived: oldReceived,
    applyMonthNewReceived: newReceived,
    applyMonthReceivedTotal: receivedTotal,
    applyDayRatio: round1(dayRatio * 100),
    queuePositionAtApply: queueAtApply,
    processedAfterApply: processedAfter,
    remainingBacklog: remainingQueue,

    latestMonthPermit: latestActual.permit || 0,
    latestMonthProcessed: latestActual.processed || 0,
    dailyProcessRate: moderate.dailyRate,

    estimatedDays: moderate.days,
    permitRate,
    estimatedCompletionDate: moderate.date,

    optimisticDays: optimistic.days,
    moderateDays: moderate.days,
    conservativeDays: conservative.days,
    optimisticDate: optimistic.date,
    moderateDate: moderate.date,
    conservativeDate: conservative.date,

    prediction: { optimistic, moderate, conservative },

    routeCalibrationFactor: routeFactor,
    routeFloorTotalDays,
    alreadyWaitedDays,

    latestMonth,
    projectedThroughMonth,
    projectionBasis: projection.basis,
    projectedMonthsCount: projection.projectedRows.length,
    applyMonth: applyMonthText,
    applyMonthDataMode: applyStatSource.mode,
    applyMonthDataBasis: applyStatSource.basis,
    latestStatsUpdatedAt: today,
    modelScope: 'old_receipt_queue_simulation_from_e_stat_0003449073',
    modelReleasedAt: MODEL_RELEASED_AT,
    dataSourceUrl: DATA_SOURCE_URL,
    calculationNarrative: '以申請月的旧受為前期累積基礎，依申請日在當月新受中的位置估算號碼牌；接著按月逐月扣除後續既済総数（許可・不許可・その他）。公開資料扣到最新公開月份為止，之後才使用最新公開 1 / 3 / 6 個月處理速度外推，直到隊伍歸零推估完成日；若申請月尚未公開，使用最新兩個公開月份平均值補足未公開月份的受理結構。',

    practicalAnchor: {
      bureau: userBureau,
      route: userRoute,
      normalAnchorTotalDays: 0,
      routeAnchorTotalDays: 0,
      routeAnchorFactor: routeFactor,
      anchorRemainingDays: 0,
      anchorApplied: false,
      note: 'V5.8 使用 e-Stat 旧受 / 新受 / 既済推估；未公開月份使用最近兩個公開月份平均值外推。',
    },

    latestMonthStats: latestStats,
    recentTrend,
    publicTrend,
    bureauRanking,
    warnings,
    message,
  };
}
