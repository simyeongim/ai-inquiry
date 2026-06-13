import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { explanation } = await request.json();

  if (!explanation || explanation.trim().length < 100) {
    return NextResponse.json({ hints: [] });
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ hints: [] });
  }

  const system = `너는 초등학생의 탐구 글쓰기를 돕는 선생님이야.
학생이 이미 쓴 내용을 더 깊게 발전시키도록 돕는 것이 목표야.

절대 금지:
- 학생이 언급하지 않은 새로운 주제 도입 (예: 학생이 바람을 언급했는데 갑자기 "동식물은?" 이런 질문 금지)
- 평가, 정답, 결론, 칭찬 포함 금지
- "인간 생활은?", "미래에는?", "동식물은?" 처럼 학생 글과 무관한 일반 질문 금지
- 학생 글에 없는 단어나 주제를 질문에 포함하지 말 것`;

  const user = `학생이 탐구 결과를 다음과 같이 작성했습니다:

"${explanation.trim()}"

위 내용에서 학생이 실제로 언급한 내용을 한 단계 더 깊게 생각하게 하는 질문 2~3개를 만들어 주세요.

예시 (학생이 "바람 방향이 바뀌면 중국 미세먼지가 줄어들 것 같다"고 썼을 때):
["미세먼지가 줄어들면 사람들의 건강에는 어떤 변화가 있을까?", "바람 방향이 바뀌면 다른 나라의 공기는 어떻게 달라질까?"]

조건:
- 학생이 실제 쓴 단어·소재에서만 출발
- 짧고 구체적 (한 문장)
- ?로 끝남
- 최대 3개

JSON 배열로만 응답 (다른 말 없이): ["질문1", "질문2"]`;

  try {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: system },
          { role: 'user',   content: user },
        ],
        temperature: 0.5,
        max_tokens: 300,
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      const raw  = data.choices[0].message.content.trim();
      const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

      let hints: string[] = JSON.parse(text);
      if (!Array.isArray(hints)) hints = [];
      hints = hints.slice(0, 3).filter(h => typeof h === 'string' && h.trim().length > 0);

      return NextResponse.json({ hints });
    }
  } catch (err) {
    console.warn('[inquiry-hint] error:', err instanceof Error ? err.message : err);
  }

  return NextResponse.json({ hints: [] });
}
