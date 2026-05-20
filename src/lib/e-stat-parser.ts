// ============================================================
// e-Stat API 資料解析器 — v3（精確入管局/支局 mapping）
// ============================================================

import { MonthlyStats, BureauInfo } from '@/types';

let cachedRaw: string | null = null;

/** level=3 的實際入管局/支局代碼 → 顯示名稱 */
const BUREAU_NAMES: Record<string, string> = {
  '101010': '札幌入管局',
  '101090': '仙台入管局',
  '101170': '東京入管局',
  '101190': '成田空港支局',
  '101200': '羽田空港支局',
  '101210': '横浜支局',
  '101350': '名古屋入管局',
  '101370': '中部空港支局',
  '101460': '大阪入管局',
  '101480': '関西空港支局',
  '101490': '神戸支局',
  '101580': '広島入管局',
  '101670': '高松入管局',
  '101720': '福岡入管局',
  '101740': '那覇支局',
};

/** 自訂簡碼 */
const BUREAU_CODE_MAP: Record<string, string> = {
  '101010': 'sapporo',
  '101090': 'sendai',
  '101170': 'tokyo',
  '101190': 'narita',
  '101200': 'haneda',
  '101210': 'yokohama',
  '101350': 'nagoya',
  '101370': 'chubu-airport',
  '101460': 'osaka',
  '101480': 'kansai-airport',
  '101490': 'kobe',
  '101580': 'hiroshima',
  '101670': 'takamatsu',
  '101720': 'fukuoka',
  '101740': 'naha',
};

const AIRPORT_BRANCH_CODES = new Set(['narita', 'haneda', 'chubu-airport', 'kansai-airport']);
const PURE_TOKYO_CODE = 'tokyo-pure';
const PURE_TOKYO_NAME = '東京入管局（横浜除外・推定）';
const PURE_OSAKA_CODE = 'osaka-pure';
const PURE_OSAKA_NAME = '大阪入管局（神戸除外・推定）';

function parseEStatTime(timeStr: string): { year: number; month: number } | null {
  const value = String(timeStr || '');
  const year = Number(value.slice(0, 4));
  let month = Number(value.slice(4, 6));

  // e-Stat sometimes returns extended codes such as 2026000202.
  // In that case positions 4-5 can be "00" and positions 6-7 are the month.
  if ((month < 1 || month > 12) && value.length >= 8) {
    month = Number(value.slice(6, 8));
  }

  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  if (year < 2015 || year > 2030 || month < 1 || month > 12) return null;
  return { year, month };
}

/**
 * 從 e-Stat API 取得資料並解析
 * 支援指定時間範圍，順向從起點開始抓取，避免單次請求遺漏年資料
 * @param startTime YYYYMM 格式起點，留空則從最早可取得資料開始
 * @param endTime   YYYYMM 格式終點，留空則到最新
 */
export async function fetchEStatData(
  _forceNoCache?: boolean,
  startTime?: string,
  endTime?: string
): Promise<{
  stats: MonthlyStats[];
  bureaus: BureauInfo[];
  error?: string;
}> {
  const appId = process.env.ESTAT_APP_ID;
  if (!appId) {
	  throw new Error('ESTAT_APP_ID is not configured');
  }
  if (!_forceNoCache && cachedRaw) {
    return parseEStatData(cachedRaw);
  }

  const startParam = startTime ? `&startTime=${startTime}` : '';
  const endParam = endTime ? `&endTime=${endTime}` : '';

  const url = `https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData?appId=${appId}&statsDataId=0003449073&metaGetFlg=Y&cntGetFlg=N${startParam}${endParam}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return { stats: [], bureaus: [], error: `HTTP ${res.status}` };
    }

    const raw = await res.text();
    cachedRaw = raw;
    return parseEStatData(raw);
  } catch (e: any) {
    console.error('[e-stat-parser] fetch error:', e);
    return { stats: [], bureaus: [], error: `連線失敗: ${e.message}` };
  }
}

function parseEStatData(raw: string): {
  stats: MonthlyStats[];
  bureaus: BureauInfo[];
  error?: string;
} {
  try {
    const json = JSON.parse(raw);
    const dataObj = json?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF;
    const classObj = json?.GET_STATS_DATA?.STATISTICAL_DATA?.CLASS_INF?.CLASS_OBJ || [];

    if (!dataObj || !classObj) {
      return { stats: [], bureaus: [], error: 'API 回應結構異常' };
    }

    // ── 解析 CLASS_OBJ 取得入管局清單（level=3 的）──
    const officeClass = classObj.find((c: any) => c['@id'] === 'cat03');
    const officeEntries: { estatCode: string; name: string }[] = [];

    if (officeClass?.CLASS) {
      const classes = Array.isArray(officeClass.CLASS)
        ? officeClass.CLASS
        : [officeClass.CLASS];

      for (const cls of classes) {
        if (cls['@level'] === '3' && BUREAU_NAMES[cls['@code']]) {
          officeEntries.push({
            estatCode: cls['@code'],
            name: BUREAU_NAMES[cls['@code']],
          });
        }
      }
    }

    const baseBureaus: BureauInfo[] = officeEntries
      .map(e => ({ code: BUREAU_CODE_MAP[e.estatCode], name: e.name }))
      .filter(b => !!b.code && !AIRPORT_BRANCH_CODES.has(b.code));

    const tokyoIndex = baseBureaus.findIndex(b => b.code === 'tokyo');
    const bureaus: BureauInfo[] = [...baseBureaus];
    if (tokyoIndex >= 0 && !bureaus.some(b => b.code === PURE_TOKYO_CODE)) {
      bureaus.splice(tokyoIndex + 1, 0, {
        code: PURE_TOKYO_CODE,
        name: PURE_TOKYO_NAME,
      });
    }

    const osakaIndex = bureaus.findIndex(b => b.code === 'osaka');
    if (osakaIndex >= 0 && !bureaus.some(b => b.code === PURE_OSAKA_CODE)) {
      bureaus.splice(osakaIndex + 1, 0, {
        code: PURE_OSAKA_CODE,
        name: PURE_OSAKA_NAME,
      });
    }

    // ── 解析 VALUE 陣列 ──
    interface EStatValue {
      '@tab': string;
      '@cat01': string;
      '@cat02': string;
      '@cat03': string;
      '@time': string;
      '@unit': string;
      $: string;
    }

    const values: EStatValue[] = dataObj.VALUE || [];

    if (values.length === 0) {
      return { stats: [], bureaus, error: '無有效資料' };
    }

    // 過濾：永住（cat02=60）+ 已知入管局 + 正確年份
    const statsMap = new Map<string, MonthlyStats>();

    for (const v of values) {
      // 只處理永住
      if (v['@cat02'] !== '60') continue;

      // 時間解析
      const timeStr = v['@time'];
      const parsedTime = parseEStatTime(timeStr);
      if (!parsedTime) continue;
      const { year, month } = parsedTime;

      const estatCode = v['@cat03'];
      const ourCode = BUREAU_CODE_MAP[estatCode];
      if (!ourCode) continue; // 跳過不在對照表的

      const num = parseInt(v['$'], 10);
      if (isNaN(num)) continue;

      const cat01 = v['@cat01'];
      // 用字串 key 保留月份前導零
      const key = `${ourCode}-${year}-${String(month).padStart(2, '0')}`;

      let entry = statsMap.get(key);
      if (!entry) {
        entry = { bureauCode: ourCode, year, month, receivedTotal: 0, oldReceived: 0, applications: 0, processed: 0, permit: 0, denied: 0, other: 0, backlog: 0 };
        statsMap.set(key, entry);
      }

      // cat01 code mapping:
      // 101000 = 受理_総数
      // 102000 = 受理_旧受
      // 103000 = 受理_新受
      // 300000 = 既済_総数（有些回應可能不含，保留相容）
      // 301000 = 既済_許可
      // 302000 = 既済_不許可
      // 305000 = 既済_その他
      // 400000 = 未済
      if (cat01 === '101000') {
        entry.receivedTotal += num;
      } else if (cat01 === '102000') {
        entry.oldReceived += num;
      } else if (cat01 === '103000') {
        entry.applications += num;
      } else if (cat01 === '300000') {
        entry.processed += num;
      } else if (cat01 === '301000') {
        entry.permit += num;
      } else if (cat01 === '302000') {
        entry.denied += num;
      } else if (cat01 === '305000') {
        entry.other += num;
      } else if (cat01 === '400000') {
        entry.backlog = num;
      }
    }

    const stats = Array.from(statsMap.values());

    for (const row of stats) {
      const closedTotal = (row.permit || 0) + (row.denied || 0) + (row.other || 0);
      if (!row.processed || row.processed <= 0) row.processed = closedTotal;
      if (!row.receivedTotal || row.receivedTotal <= 0) row.receivedTotal = (row.oldReceived || 0) + (row.applications || 0);
    }

    // 修正未済積壓：必須每個入管局獨立回推，不可跨局共用 lastBacklog。
    const result: MonthlyStats[] = [];
    const bureauCodes = Array.from(new Set(Array.from(statsMap.values()).map(s => s.bureauCode))).sort();

    for (const bureauCode of bureauCodes) {
      const bureauRows = Array.from(statsMap.values())
        .filter(s => s.bureauCode === bureauCode)
        .sort((a, b) => a.year - b.year || a.month - b.month);

      let lastBacklog: number | null = null;
      for (const row of bureauRows) {
        if ((!row.oldReceived || row.oldReceived <= 0) && lastBacklog !== null) {
          row.oldReceived = lastBacklog;
        }

        if (row.backlog > 0) {
          lastBacklog = row.backlog;
        } else if (lastBacklog !== null) {
          row.backlog = Math.max(0, lastBacklog + row.applications - row.processed);
          lastBacklog = row.backlog;
        }

        if (!row.receivedTotal || row.receivedTotal <= 0) {
          row.receivedTotal = (row.oldReceived || 0) + (row.applications || 0);
        }
      }

      result.push(...bureauRows);
    }

    // 東京入管局統計中可能包含横浜支局分。
    // 便於使用者查詢「純東京」時，提供一個「東京 - 横浜」的推定版本。
    const byMonth = new Map<string, MonthlyStats>();
    for (const row of result) {
      byMonth.set(`${row.bureauCode}-${row.year}-${String(row.month).padStart(2, '0')}`, row);
    }

    const pureTokyoRows: MonthlyStats[] = [];
    for (const tokyo of result.filter(r => r.bureauCode === 'tokyo')) {
      const ym = `${tokyo.year}-${String(tokyo.month).padStart(2, '0')}`;
      const yokohama = byMonth.get(`yokohama-${ym}`);
      if (!yokohama) continue;

      const diff = (a: number, b: number) => Math.max(0, (a || 0) - (b || 0));
      pureTokyoRows.push({
        year: tokyo.year,
        month: tokyo.month,
        bureauCode: PURE_TOKYO_CODE,
        receivedTotal: diff(tokyo.receivedTotal, yokohama.receivedTotal),
        oldReceived: diff(tokyo.oldReceived, yokohama.oldReceived),
        applications: diff(tokyo.applications, yokohama.applications),
        processed: diff(tokyo.processed, yokohama.processed),
        permit: diff(tokyo.permit, yokohama.permit),
        denied: diff(tokyo.denied, yokohama.denied),
        other: diff(tokyo.other, yokohama.other),
        backlog: diff(tokyo.backlog, yokohama.backlog),
      });
    }

    result.push(...pureTokyoRows);

    // 大阪入管局統計中可能包含神戸支局分。
    // 便於使用者查詢「純大阪」時，提供一個「大阪 - 神戸」的推定版本。
    const pureOsakaRows: MonthlyStats[] = [];
    for (const osaka of result.filter(r => r.bureauCode === 'osaka')) {
      const ym = `${osaka.year}-${String(osaka.month).padStart(2, '0')}`;
      const kobe = byMonth.get(`kobe-${ym}`);
      if (!kobe) continue;

      const diff = (a: number, b: number) => Math.max(0, (a || 0) - (b || 0));
      pureOsakaRows.push({
        year: osaka.year,
        month: osaka.month,
        bureauCode: PURE_OSAKA_CODE,
        receivedTotal: diff(osaka.receivedTotal, kobe.receivedTotal),
        oldReceived: diff(osaka.oldReceived, kobe.oldReceived),
        applications: diff(osaka.applications, kobe.applications),
        processed: diff(osaka.processed, kobe.processed),
        permit: diff(osaka.permit, kobe.permit),
        denied: diff(osaka.denied, kobe.denied),
        other: diff(osaka.other, kobe.other),
        backlog: diff(osaka.backlog, kobe.backlog),
      });
    }

    result.push(...pureOsakaRows);

    result.sort((a, b) => {
      if (a.bureauCode !== b.bureauCode) return a.bureauCode.localeCompare(b.bureauCode);
      return a.year - b.year || a.month - b.month;
    });

    return { stats: result, bureaus };
  } catch (e: any) {
    console.error('[e-stat-parser] parse error:', e);
    return { stats: [], bureaus: [], error: `解析失敗: ${e.message}` };
  }
}
