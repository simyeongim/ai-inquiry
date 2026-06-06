import { NextRequest, NextResponse } from 'next/server';

function fallbackFeedback() {
  return {
    wellUnderstood: '배운 내용을 자신의 말로 정리하려고 노력한 점이 훌륭해요!',
    needsWork:      '개념들 사이의 연결 관계를 조금 더 구체적으로 설명해보면 이해가 더 깊어질 거예요.',
    deeperQuestion: '"왜 그럴까?", "만약 달라진다면?" 같은 질문을 스스로 던져보면 오늘 배운 내용을 더 깊이 탐구할 수 있어요.',
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
      const prompt = `초등학생이 오늘 수업에서 배운 내용을 3가지로 정리했어요. 개념 이해를 점검하는 따뜻한 피드백을 3가지 항목으로 주세요.

학생이 정리한 내용: "${content}"

[항목 설명]
- wellUnderstood: 학생이 정확히 이해한 개념을 구체적으로 짚어 칭찬해주기 (1~2문장)
- needsWork: 더 정확하게 이해하거나 보완하면 좋을 개념을 부드럽게 안내하기 (1~2문장)
- deeperQuestion: 배운 내용과 연결해 더 탐구해볼 수 있는 질문 1개 제시 (1문장, ?로 끝남)

모든 피드백은 초등학생이 이해할 수 있게 쉽고 따뜻한 말로 써주세요.
JSON으로만 응답하세요: {"wellUnderstood": "...", "needsWork": "...", "deeperQuestion": "..."}`;

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
        if (parsed.wellUnderstood && parsed.needsWork && parsed.deeperQuestion) {
          return NextResponse.json(parsed);
        }
      }
    } catch (err) {
      console.warn('[learn-feedback] Groq fallback:', err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json(fallbackFeedback());
}
