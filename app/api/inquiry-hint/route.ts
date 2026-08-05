import { NextRequest, NextResponse } from 'next/server';
import { chat } from '@/lib/ai-client';

export async function POST(request: NextRequest) {
  const { explanation } = await request.json();

  if (!explanation || explanation.trim().length < 100) {
    return NextResponse.json({ strength: '', hints: [] });
  }

  const system = `너는 초등학생의 탐구 글쓰기 코치야.
반드시 아래 [학생 글]에 실제로 등장한 단어와 개념만 사용해야 해.
학생 글에 없는 주제·단어는 절대 언급 금지.`;

  const user = `[학생 글]
"${explanation.trim()}"

위 학생 글을 읽고 다음 JSON을 작성해줘.

1. strength: 위 학생 글에 실제로 나온 핵심 단어(예: 광합성, 빛에너지 등)를 직접 넣어서 "~을 연결하여 탐구했어요." 형태로 한 문장
2. hints: 위 학생 글에 실제로 등장한 개념에서만 출발한 심화 질문 2개 (?로 끝남, 학생 글에 없는 새 주제 금지)

JSON만 응답:
{"strength":"...","hints":["...?","...?"]}`;

  try {
    const raw = await chat(
      [{ role: 'system', content: system }, { role: 'user', content: user }],
      { temperature: 0.1, max_tokens: 400 },
    );
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    const parsed = JSON.parse(text);
    const strength: string = typeof parsed.strength === 'string' ? parsed.strength.trim() : '';
    let hints: string[] = Array.isArray(parsed.hints) ? parsed.hints : [];
    hints = hints.slice(0, 3).filter((h: unknown) => typeof h === 'string' && (h as string).trim().length > 0);

    return NextResponse.json({ strength, hints });
  } catch (err) {
    console.warn('[inquiry-hint] error:', err instanceof Error ? err.message : err);
  }

  return NextResponse.json({ strength: '', hints: [] });
}
