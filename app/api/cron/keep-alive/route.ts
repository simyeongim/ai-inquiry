import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = 'https://fsrrtopndcrdnqwnspnp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_z7LexdeBdGJqEy5Z8IAyNA_LEGAxPf_';

// Supabase 무료 플랜은 7일간 활동 없으면 자동 일시정지되므로 매일 가벼운 쿼리로 깨워둠
export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/questions?select=id&limit=1`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });

  return NextResponse.json({ ok: res.ok, status: res.status });
}
