import { NextRequest, NextResponse } from 'next/server';

function fallbackFeedback() {
  return {
    status:         '🟡 핵심 개념을 조금 더 정리해보면 좋아요',
    goodPoint:      '배운 내용의 핵심 개념을 자신의 말로 정리하려고 노력한 점이 잘 드러나요.',
    improvePoint:   '개념들이 서로 어떻게 연결되는지 조금 더 구체적으로 설명해보면 이해가 더 깊어질 거예요.',
    secondTitle:    '🔍 새롭게 이해한 내용',
    secondContent:  '배운 내용을 자신의 말로 표현하려고 한 점이 좋아요.',
    thinkMore:      '"왜 그럴까?", "만약 달라진다면?" 같은 질문을 스스로 던져보면 오늘 배운 내용을 더 깊이 탐구할 수 있어요.',
    _fallback:      true,
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
      const prompt = `초등학생의 개념학습 기록을 바탕으로 핵심 개념 이해를 진단하고 피드백을 작성해주세요.

[반드시 지켜야 할 규칙]
1. 학생에게 새로운 개념을 가르치지 마세요.
2. 교과서 밖 내용이나 선행학습 내용을 제시하지 마세요.
3. 정답을 설명하거나 강의하지 마세요.
4. 학생이 작성한 내용을 바탕으로만 피드백하세요.
5. 무조건 칭찬하지 않고, 무조건 보완점을 만들지도 않습니다.
6. 학생 답변을 근거로 실제 개념 이해 정도를 진단합니다.

학생이 작성한 내용:
${content}

[피드백 항목]
- status: 1번 답변을 기반으로 개념 이해 상태 판단. 다음 중 하나만 선택:
  * "🟢 핵심 개념을 잘 이해했어요" — 핵심 개념을 충분히 설명한 경우
  * "🟡 핵심 개념을 조금 더 정리해보면 좋아요" — 일부만 설명하거나 방향은 맞지만 부족한 경우
  * "🔵 핵심 개념을 다시 살펴보면 좋아요" — 핵심 개념과 거리가 있거나 사실은 맞지만 핵심이 아닌 경우
- goodPoint: 1번에서 학생이 이해한 개념을 구체적으로 언급 (1~2문장, 일반적 칭찬 금지)
- improvePoint: 1번 진단 결과에 따라 작성:
  * 핵심 개념을 충분히 설명한 경우 → 반드시 "핵심 개념을 잘 이해하고 있어요."라고만 작성
  * 핵심 개념의 일부만 설명한 경우 → "설명한 내용은 맞지만 핵심 개념 전체를 담고 있지는 않아요." + 부족한 부분 안내 (1~2문장)
  * 핵심 개념이 아닌 경우 → 핵심 개념과의 차이를 안내 (1~2문장)
- secondTitle: 2번이 새로운 사실/개념 서술이면 "🔍 새롭게 이해한 내용", 질문/궁금증이면 "🔍 좋은 질문" 중 하나만 선택
- secondContent: 새로운 내용이면 학생이 발견한 내용 정리 (정답·강의 금지). 질문이면 탐구 가치 설명하되 답 알려주지 말 것 (1~2문장)
- thinkMore: 현재 학습 범위 안에서 생각거리만 제시. 답 금지 (1문장)

JSON으로만 응답하세요: {"status": "...", "goodPoint": "...", "improvePoint": "...", "secondTitle": "...", "secondContent": "...", "thinkMore": "..."}`;

      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 500,
        }),
      });

      if (resp.ok) {
        const data   = await resp.json();
        const raw    = data.choices[0].message.content.trim();
        const text   = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
        const parsed = JSON.parse(text);
        if (parsed.status && parsed.goodPoint && parsed.improvePoint && parsed.secondTitle && parsed.secondContent && parsed.thinkMore) {
          return NextResponse.json(parsed);
        }
      }
    } catch (err) {
      console.warn('[learn-feedback] Groq fallback:', err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json(fallbackFeedback());
}
