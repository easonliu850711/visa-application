// ============================================================
// Visa Application Predictor — 型別定義
// ============================================================

/** 遞交通道 */
export type TrackType = 'normal' | 'highly-skilled-70' | 'highly-skilled-80';

/** API 從 e-Stat 解析後的單月單局資料 */
export interface MonthlyStats {
  year: number;
  month: number;
  bureauCode: string;

  /** 受理_総数 */
  receivedTotal: number;
  /** 受理_旧受：本月開始時延續下來的舊案量 */
  oldReceived: number;
  /** 受理_新受：本月新進件數 */
  applications: number;

  /** 既済_総数（若原始資料無總數，則由許可+不許可+その他合計） */
  processed: number;
  /** 既済_許可 */
  permit: number;
  /** 既済_不許可 */
  denied: number;
  /** 既済_その他 */
  other: number;

  /** 未済：月底未處理件數 */
  backlog: number;
}

/** 入管局 */
export interface BureauInfo {
  code: string;
  name: string;
}

/** 前端表單資料 */
export interface UserInput {
  bureauCode: string;
  applyYear: number;
  applyMonth: number;
  track: TrackType;
}

export interface ScenarioResult {
  date: string;
  waitMonths: number;
  description: string;
}

export interface PredictionResult {
  optimistic: ScenarioResult;
  moderate: ScenarioResult;
  conservative: ScenarioResult;
}

export interface PredictRequestBody {
  bureauCode: string;
  applyYear: number;
  applyMonth: number;
  track: TrackType;
}

export interface PredictionResultV3 {
  baseWaitDays: number;
  trendModifier: number;
  backlogDelta: number;
  trendAvailable: boolean;
  daysSinceApply: number;
  expectedTotalDays: number;
  remainingDays: number;
  optimistic: number;
  moderate: number;
  conservative: number;
  progress: number;
  predictedDate: string;
  bureauName: string;
  routeLabel: string;
}

export interface PredictV3RequestBody {
  bureauCode: string;
  applyDate: string;
  track: TrackType;
}

export interface PredictV3Response {
  success: boolean;
  result?: PredictionResultV3;
  error?: string;
}

export interface PredictResponse {
  success: boolean;
  result?: PredictionResult;
  daysSinceApply?: number;
  bureauName?: string;
  backlogTrend?: { date: string; backlog: number }[];
  error?: string;
}
