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
      const system = `당신은 초등학교 교사입니다. 학생의 개념 이해 수준을 진단하는 역할을 합니다.
절대 금지: 학생 문장 그대로 복사, 새로운 개념 강의, 교과서 밖 내용 제시, 억지 보완점 생성.`;

      const user = `아래 학생 답변을 분석하여 JSON 피드백을 작성하세요.

--- 학생 답변 ---
${content}
-----------------

[분석 규칙]
■ status / goodPoint / improvePoint → [핵심 내용] 섹션만 사용. [새롭게 알게 된 것] 섹션은 절대 참고하지 마세요.
■ secondContent / thinkMore → [새롭게 알게 된 것] 섹션만 사용.

[status 판단 기준 — [핵심 내용]만 보세요]
- 단순 사실 하나만 언급 (예: "타조알도 세포다") → 🔴
- 핵심 개념의 일부 요소만 포함, 방향은 맞지만 불완전 → 🟡
- 핵심 개념의 주요 요소를 충분히 설명한 경우 → 🟢
(🟢 기준: 단순 사실 언급이 아닌, 개념 간 관계나 원리를 설명했을 때)

[각 항목 작성 규칙]
- status: 위 기준에 따라 "🟢 핵심 개념을 정확히 이해했어요." / "🟡 핵심 개념을 찾아 조금 더 보완해보세요." / "🔴 핵심 개념을 다시 살펴보면 좋아요." 중 하나
- goodPoint: [핵심 내용]에서 학생이 이해한 부분을 교사 언어로 한 문장 재서술 (복사 금지, 신규 개념 추가 금지)
- improvePoint: status 🟢 → "핵심 개념을 잘 정리했어요." / 🟡·🔴 → 부족한 부분과 수정 방향 1~2문장
- secondTitle: 항상 "🔍 핵심 개념과 연결하기"
- secondContent: [새롭게 알게 된 것]이 핵심 개념과 어떻게 연결되는지 1~2문장 (강의·정답 금지)
- thinkMore: 핵심 개념을 다시 떠올릴 수 있는 질문 1문장 (답 금지)

JSON으로만 응답: {"status":"...","goodPoint":"...","improvePoint":"...","secondTitle":"...","secondContent":"...","thinkMore":"..."}`;

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
          temperature: 0.1,
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
