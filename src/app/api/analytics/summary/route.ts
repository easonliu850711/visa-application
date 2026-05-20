import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function todayJST(): string {
  const d = new Date();
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().split('T')[0];
}

export async function GET() {
  const filePath = path.join(process.cwd(), 'data', 'analytics', 'visits.json');
  const today = todayJST();

  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const store = JSON.parse(raw);
    return NextResponse.json({
      total: Number(store.total || 0),
      today: Number(store.daily?.[today] || 0),
      date: today,
      lastUpdated: store.lastUpdated || null,
    });
  } catch {
    return NextResponse.json({
      total: 0,
      today: 0,
      date: today,
      lastUpdated: null,
    });
  }
}
