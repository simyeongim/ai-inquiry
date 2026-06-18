import { NextRequest, NextResponse } from 'next/server';

function fallbackFeedback() {
  return {
    praise:     '오늘 배운 내용을 직접 말로 정리해보려고 노력했어요. 정말 잘했어요!',
    understood: '배운 내용의 핵심을 자신의 말로 표현하려고 한 점이 훌륭해요.',
    nextStep:   '"왜 그럴까?", "만약 다르다면?" 같은 질문을 스스로 던져보면 오늘 배운 내용을 더 깊이 이해할 수 있어요.',
    _fallback:  true,
  };
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { content } = body;

  if (!content) {
    return NextResponse.json({ error: '내용이 없습니다.' }, { status: 400 });
  }

  if (process.env.GROQ_API_KEY) {
    try {
      const system = `당신은 초등학생의 배움 기록에 따뜻한 피드백을 주는 선생님입니다.

[절대 원칙]
- JSON만 출력. 코드블록(backtick) 금지.
- 한국어, 초등학생이 이해할 수 있는 쉬운 말 사용.
- 세 필드 모두 반드시 긍정적·격려적 문장으로 작성.

[필드별 규칙]
- praise: 학생이 잘 쓴 점, 노력한 점을 구체적으로 칭찬. (1~2문장)
- understood: 학생이 쓴 내용 중 과학적으로 옳은 부분을 구체적으로 인용하며 인정. 부족한 점·보완 필요·오류는 절대 언급 금지. (1~2문장)
- nextStep: 더 깊이 탐구할 수 있는 새로운 질문 1개 제안. 학생을 비판하거나 "보완"을 요구하는 표현 금지. (1~2문장)

[절대 금지 표현 — 어느 필드에도 사용 불가]
"보완", "부족", "아쉽", "미흡", "틀렸", "잘못", "더 써야", "추가해야", "포함해야", "설명이 필요"`;

      const user = `초등학생이 오늘 수업에서 배운 내용을 정리했습니다.

배운 내용: "${content}"

출력 형식 (이 형식 그대로, 다른 텍스트 없이):
{"praise":"...","understood":"...","nextStep":"..."}`;

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
          temperature: 0.3,
          max_tokens: 500,
        }),
      });

      if (resp.ok) {
        const data   = await resp.json();
        const raw    = data.choices[0].message.content.trim();
        const text   = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
        const parsed = JSON.parse(text);
        if (parsed.praise && parsed.understood && parsed.nextStep) {
          return NextResponse.json(parsed);
        }
      }
    } catch (err) {
      console.warn('[learn-feedback] Groq fallback:', err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json(fallbackFeedback());
}
