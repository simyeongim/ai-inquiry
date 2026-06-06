import { NextRequest, NextResponse } from 'next/server';

function fallbackFeedback() {
  return {
    goodPoint:      '배운 내용의 핵심 개념을 자신의 말로 정리하려고 노력한 점이 잘 드러나요.',
    improvePoint:   '개념들이 서로 어떻게 연결되는지 조금 더 구체적으로 설명해보면 이해가 더 깊어질 거예요.',
    secondTitle:    '💡 더 생각해볼 점',
    secondContent:  '"왜 그럴까?", "만약 달라진다면?" 같은 질문을 스스로 던져보면 오늘 배운 내용을 더 깊이 탐구할 수 있어요.',
    thinkMore:      '오늘 배운 개념을 실제 생활에서 찾아보면 이해가 더 깊어져요.',
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
      const prompt = `초등학생이 오늘 수업 후 두 가지를 작성했어요. 개념 이해와 탐구 가능성 중심으로 피드백해주세요.

학생이 작성한 내용:
${content}

[피드백 항목 설명]
- goodPoint: 1번(핵심 개념 정리)에서 학생이 정확히 이해한 부분을 구체적으로 언급 (1~2문장, 일반적 칭찬 금지)
- improvePoint: 1번에서 더 구체화하거나 보완하면 좋을 부분 제안 (1~2문장)
- secondTitle: 2번(새롭게 알게 된 내용 또는 궁금한 점)을 분석하여, 새로운 사실/개념을 서술했으면 "🌱 새롭게 이해한 내용", 질문이나 궁금증을 썼으면 "🔍 좋은 탐구 질문이에요" 중 하나만 선택
- secondContent: secondTitle에 맞게, 새로운 내용이면 그 이해에 대한 구체적 피드백 / 질문이면 탐구 방향 제안 (1~2문장)
- thinkMore: 배운 개념과 연결해 더 생각해볼 수 있는 질문이나 관점 제시 (1문장)

모든 피드백은 초등학생이 이해할 수 있게 쉽고 구체적으로 써주세요.
JSON으로만 응답하세요: {"goodPoint": "...", "improvePoint": "...", "secondTitle": "...", "secondContent": "...", "thinkMore": "..."}`;

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
        if (parsed.goodPoint && parsed.improvePoint && parsed.secondTitle && parsed.secondContent && parsed.thinkMore) {
          return NextResponse.json(parsed);
        }
      }
    } catch (err) {
      console.warn('[learn-feedback] Groq fallback:', err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json(fallbackFeedback());
}
