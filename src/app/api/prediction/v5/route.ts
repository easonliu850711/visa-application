// ============================================================
// POST /api/prediction/v5 — Old-Receipt Queue Model
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { calculatePredictionV5, type V5Input } from '@/lib/v5/engine';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.userBureau || !body.userApplyDate) {
      return NextResponse.json(
        { error: '缺少必要參數：userBureau, userApplyDate' },
        { status: 400 },
      );
    }

    const input: V5Input = {
      userBureau: body.userBureau,
      userApplyDate: body.userApplyDate,
      userRoute: 'normal',
    };

    const result = await calculatePredictionV5(input);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { error: `伺服器錯誤: ${e.message}` },
      { status: 500 },
    );
  }
}
