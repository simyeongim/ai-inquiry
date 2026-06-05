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
      const prompt = `초등학생이 오늘 수업에서 배운 내용을 정리했어요. 따뜻하고 짧은 피드백을 3가지 항목으로 주세요.

배운 내용: "${content}"

[항목 설명]
- praise: 학생이 노력한 점, 잘 표현한 점을 짧게 칭찬 (1~2문장)
- understood: 학생이 정확히 이해하고 있는 핵심 내용을 구체적으로 짚어주기 (1~2문장)
- nextStep: 더 깊이 생각해볼 수 있는 질문이나 탐구 방향 제안 (1~2문장)

모든 피드백은 초등학생이 이해할 수 있게 쉽고 따뜻한 말로 써주세요.
JSON으로만 응답하세요: {"praise": "...", "understood": "...", "nextStep": "..."}`;

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
