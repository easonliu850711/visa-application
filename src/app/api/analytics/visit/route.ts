import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

type VisitStore = {
  total: number;
  daily: Record<string, number>;
  lastUpdated: string;
};

function todayJST(): string {
  const d = new Date();
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().split('T')[0];
}

function nowJST(): string {
  const d = new Date();
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString();
}

async function readStore(filePath: string): Promise<VisitStore> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      total: Number(parsed.total || 0),
      daily: parsed.daily || {},
      lastUpdated: parsed.lastUpdated || '',
    };
  } catch {
    return { total: 0, daily: {}, lastUpdated: '' };
  }
}

export async function POST() {
  const filePath = path.join(process.cwd(), 'data', 'analytics', 'visits.json');
  const today = todayJST();

  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const store = await readStore(filePath);
  store.total += 1;
  store.daily[today] = (store.daily[today] || 0) + 1;
  store.lastUpdated = nowJST();

  await fs.writeFile(filePath, JSON.stringify(store, null, 2), 'utf-8');

  return NextResponse.json({
    total: store.total,
    today: store.daily[today],
    date: today,
    lastUpdated: store.lastUpdated,
  });
}
