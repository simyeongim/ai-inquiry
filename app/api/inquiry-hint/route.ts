import { NextRequest, NextResponse } from 'next/server';
import { chat } from '@/lib/ai-client';

export async function POST(request: NextRequest) {
  const { explanation } = await request.json();

  if (!explanation || explanation.trim().length < 100) {
    return NextResponse.json({ strength: '', hints: [] });
  }

  const system = `너는 초등학생의 탐구 글쓰기를 돕는 선생님이야.
학생이 이미 쓴 내용을 더 깊게 발전시키도록 돕는 것이 목표야.

절대 금지:
- 학생이 언급하지 않은 새로운 주제 도입
- 평가, 정답, 결론 포함
- 학생 글에 없는 단어나 주제를 질문에 포함
- 학생이 쓴 문장을 그대로 반복`;

  const user = `학생이 탐구 결과를 다음과 같이 작성했습니다:

"${explanation.trim()}"

다음 두 가지를 JSON으로 응답해 주세요.

1. strength: 학생이 탐구한 내용의 강점을 한 문장으로 요약 (학생의 생각이 연결·발전된 점을 칭찬 없이 서술. "~을 연결하여 탐구했어요." 형태)
2. hints: 학생이 실제로 쓴 내용에서 한 단계 더 깊게 생각하게 하는 질문 2~3개 (새 주제 금지, ?로 끝남)

예시 (학생이 "자전 방향이 바뀌면 바람 방향이 달라지고 중국 미세먼지가 줄어들 것 같다"고 썼을 때):
{"strength":"자전 방향의 변화가 바람과 미세먼지에 영향을 줄 수 있다는 점을 연결하여 탐구했어요.","hints":["바람 방향이 바뀌면 우리나라의 계절은 어떻게 달라질까요?","미세먼지가 줄어들면 사람들의 생활에는 어떤 변화가 생길까요?"]}

JSON으로만 응답 (다른 말 없이):`;

  try {
    const raw = await chat(
      [{ role: 'system', content: system }, { role: 'user', content: user }],
      { temperature: 0.5, max_tokens: 400 },
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
