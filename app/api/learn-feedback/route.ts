import { NextRequest, NextResponse } from 'next/server';

function fallbackFeedback() {
  return {
    status:         '🟡 핵심 개념을 찾아 조금 더 보완해보세요.',
    goodPoint:      '배운 내용의 핵심 개념을 자신의 말로 정리하려고 노력한 점이 잘 드러나요.',
    improvePoint:   '개념들이 서로 어떻게 연결되는지 조금 더 구체적으로 설명해보면 이해가 더 깊어질 거예요.',
    secondTitle:    '🔍 핵심 개념과 연결하기',
    secondContent:  '작성한 내용은 오늘 배운 핵심 개념과 연결해서 생각해볼 수 있어요.',
    thinkMore:      '오늘 배운 핵심 개념을 자신의 말로 다시 한번 설명해볼 수 있나요?',
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

[절대 금지 사항]
- 학생의 문장을 그대로 복사하거나 인용하지 마세요. goodPoint는 반드시 교사의 언어로 재서술하세요.
- 학생이 작성하지 않은 새로운 개념을 설명하거나 가르치지 마세요.
- 교과서 밖 내용이나 선행학습 내용을 제시하지 마세요.
- 보완점이 없는데 억지로 만들지 마세요.
- 잘못 설명하지 않았는데 틀렸다고 하지 마세요.

학생이 작성한 내용:
${content}

[피드백 항목 — 순서대로 판단하세요]

1. status 판단 (1번 답변 기준):
   - 학생 답변이 핵심 개념의 주요 요소를 대부분 포함하고 있으면 → "🟢 핵심 개념을 정확히 이해했어요."
     (표현이 완벽하지 않아도 핵심 내용이 담겨 있으면 🟢입니다. 사소한 세부 누락으로 🟡를 주지 마세요.)
   - 방향은 맞지만 핵심 요소의 일부가 빠진 경우 → "🟡 핵심 개념을 찾아 조금 더 보완해보세요."
   - 핵심 개념과 거리가 있거나 사실이지만 핵심이 아닌 경우 → "🔴 핵심 개념을 다시 살펴보면 좋아요."

2. goodPoint (1번 답변 기준):
   - 학생이 이해한 부분을 교사의 언어로 한 문장으로 재서술하세요.
   - 학생 답변을 그대로 복사하면 안 됩니다.
   - 학생이 쓰지 않은 내용을 추가하면 안 됩니다.

3. improvePoint (1번 답변 기준):
   - status가 🟢이면 → 반드시 "핵심 개념을 잘 정리했어요."라고만 작성하세요.
   - status가 🟡이면 → 부족한 부분과 수정 방향을 1~2문장으로 안내하세요.
   - status가 🔴이면 → 무엇이 부족한지, 어떻게 보완할 수 있는지 1~2문장으로 안내하세요.

4. secondTitle: 항상 "🔍 핵심 개념과 연결하기"로 고정

5. secondContent: 2번 답변이 핵심 개념과 어떻게 연결되는지 설명 (정답·강의 금지, 1~2문장)

6. thinkMore: 핵심 개념을 한 번 더 떠올릴 수 있는 질문 제시. 답 알려주지 말 것 (1문장)

JSON으로만 응답하세요: {"status": "...", "goodPoint": "...", "improvePoint": "...", "secondTitle": "...", "secondContent": "...", "thinkMore": "..."}`;

      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 600,
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
