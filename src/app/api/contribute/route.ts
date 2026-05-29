import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { fetchEStatData } from '@/lib/e-stat-parser';

export const dynamic = 'force-dynamic';

const SYNC_TOKEN = 'nosae-apikey-202605';

interface ContributionEntry {
  id: number;
  applyDate: string;
  resultDate: string;
  actualDays: number;
  estimatedDays: number | null;
  bureau: string;
  diffDays: number;
  valid: boolean;
  createdAt: string;
  userAgent: string;
}

interface ContributionStore {
  nextId: number;
  entries: ContributionEntry[];
}

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 分鐘
const RATE_LIMIT_MAX = 3; // 每分鐘最多 3 次
const ipHits = new Map<string, { count: number; resetAt: number }>();

function todayJST(): string {
  const d = new Date();
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().split('T')[0];
}

async function readStore(filePath: string): Promise<ContributionStore> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { nextId: 1, entries: [] };
  }
}

async function getEstimatedDays(bureauCode: string, applyDate: string): Promise<number | null> {
  try {
    const applyYear = Number(applyDate.slice(0, 4));
    const applyMonth = Number(applyDate.slice(5, 7));
    const endYM = todayJST().slice(0, 4) + todayJST().slice(5, 7);
    const { stats } = await fetchEStatData(true, `${applyYear}${String(applyMonth).padStart(2, '0')}`, endYM);
    if (!stats || stats.length === 0) return null;

    const bureauStats = stats
      .filter(s => s.bureauCode === bureauCode)
      .sort((a, b) => a.year - b.year || a.month - b.month);

    if (bureauStats.length < 3) return null;

    // 用最新的 backlog / processed 推估
    const latest = bureauStats[bureauStats.length - 1];
    const processed = latest.processed || 0;
    const backlog = latest.oldReceived || 0;
    if (processed <= 0) return null;

    const monthsToClear = backlog / processed;
    return Math.round(monthsToClear * 30);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  // === Rate Limit ===
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const hit = ipHits.get(ip);
  if (hit && now < hit.resetAt) {
    hit.count += 1;
    if (hit.count > RATE_LIMIT_MAX) {
      return NextResponse.json(
        { error: '送出次數過於頻繁，請稍後再試' },
        { status: 429 }
      );
    }
  } else {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  }

  // === Parse Body ===
  let body: { token?: string; applyDate?: string; resultDate?: string; bureau?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '無效的 JSON 格式' }, { status: 400 });
  }

  // === Token Check ===
  const authHeader = request.headers.get('authorization')?.replace('Bearer ', '');
  const token = body.token || authHeader;
  if (token !== SYNC_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { applyDate, resultDate, bureau } = body;

  // === Validate Dates ===
  if (!applyDate || !resultDate || !bureau) {
    return NextResponse.json({ error: '申請日期、結果日期、入管局為必填' }, { status: 400 });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(applyDate) || !/^\d{4}-\d{2}-\d{2}$/.test(resultDate)) {
    return NextResponse.json({ error: '日期格式需為 YYYY-MM-DD' }, { status: 400 });
  }

  if (resultDate <= applyDate) {
    return NextResponse.json({ error: '結果日期必須晚於申請日期' }, { status: 400 });
  }

  // === Calculate ===
  const d1 = new Date(`${applyDate}T00:00:00+09:00`);
  const d2 = new Date(`${resultDate}T00:00:00+09:00`);
  const actualDays = Math.round((d2.getTime() - d1.getTime()) / 86400000);

  const estimatedDays = await getEstimatedDays(bureau!, applyDate);

  let diffDays = 0;
  let valid = true;
  if (estimatedDays !== null) {
    diffDays = actualDays - estimatedDays;
    if (Math.abs(diffDays) > 90) {
      valid = false;
    }
  }

  // === Store ===
  const filePath = path.join(process.cwd(), 'data', 'contributions.json');
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const store = await readStore(filePath);

  const entry: ContributionEntry = {
    id: store.nextId++,
    applyDate,
    resultDate,
    actualDays,
    estimatedDays,
    bureau,
    diffDays,
    valid,
    createdAt: new Date().toISOString(),
    userAgent: request.headers.get('user-agent') || '',
  };
  store.entries.push(entry);
  await fs.writeFile(filePath, JSON.stringify(store, null, 2), 'utf-8');

  return NextResponse.json({
    success: true,
    id: entry.id,
    actualDays,
  });
}

// GET: 回傳統計摘要（管理用）
export async function GET() {
  const filePath = path.join(process.cwd(), 'data', 'contributions.json');
  const store = await readStore(filePath);
  const validEntries = store.entries.filter(e => e.valid);
  const invalidEntries = store.entries.filter(e => !e.valid);

  return NextResponse.json({
    total: store.entries.length,
    valid: validEntries.length,
    invalid: invalidEntries.length,
    avgActualDays: validEntries.length > 0
      ? Math.round(validEntries.reduce((s, e) => s + e.actualDays, 0) / validEntries.length)
      : null,
    avgDiffDays: validEntries.length > 0
      ? Math.round(validEntries.reduce((s, e) => s + e.diffDays, 0) / validEntries.length)
      : null,
  });
}
