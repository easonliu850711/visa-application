// ============================================================
// /api/e-stat — 入管局清單 API（輕量 GET，不載入完整數據）
// ============================================================

import { NextResponse } from 'next/server';
import { fetchEStatData } from '@/lib/e-stat-parser';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { bureaus, error } = await fetchEStatData();
    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }
    return NextResponse.json({ bureaus });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
