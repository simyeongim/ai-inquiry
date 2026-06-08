import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = 'https://fsrrtopndcrdnqwnspnp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_z7LexdeBdGJqEy5Z8IAyNA_LEGAxPf_';

async function fetchMatchedConcepts(content: string): Promise<string> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/concepts?select=keyword,key_concept`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) return '';
    const concepts: { keyword: string; key_concept: string }[] = await res.json();

    const scored = concepts
      .map(c => {
        const keywords = c.keyword.split(',').map((k: string) => k.trim()).filter(Boolean);
        const matchCount = keywords.filter((k: string) => content.includes(k)).length;
        return { concept: c, matchCount };
      })
      .filter(({ matchCount }) => matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, 3);

    if (!scored.length) return '';
    return '\n[교사 제공 핵심 개념 — 이것이 정답 기준입니다. 이 내용을 기준으로 학생 답변의 정확성을 판단하세요.]\n'
      + scored.map(({ concept: c }) => `• ${c.keyword.split(',')[0].trim()}: ${c.key_concept}`).join('\n');
  } catch {
    return '';
  }
}

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
      const conceptSection = await fetchMatchedConcepts(content);

      const system = `당신은 초등학교 교사입니다. 초등학교 3~6학년 학생의 개념 이해 수준을 진단하는 역할을 합니다.
평가 기준: 대학교나 중·고등학교 수준이 아닌, 초등 교과서 수준에서 판단하세요. 초등학생이 배운 내용의 핵심을 자신의 말로 설명했다면 충분합니다.
절대 금지: 학생 문장 그대로 복사, 새로운 개념 강의, 교과서 밖 내용 제시, 억지 보완점 생성, "학생이"·"학생은"으로 문장 시작.
문장 시작: "학생이" 또는 "학생은"으로 시작하지 마세요. 개념이나 내용을 주어로 하거나 서술형으로 시작하세요.
[goodPoint 작성 원칙] goodPoint는 학생이 어떤 개념을 얼마나 잘 이해했는지 교사가 평가하는 문장입니다. 학생 문장을 다시 쓰는 것이 아닙니다. "~을/를 정확히 파악했어요", "~의 핵심을 잘 짚었어요", "~와 ~의 관계를 바르게 연결했어요" 형태로 작성하세요. 학생 답변에 없는 과학적 사실을 추가하지 마세요.`;

      const user = `아래 학생 답변을 분석하여 JSON 피드백을 작성하세요.
${conceptSection}
--- 학생 답변 ---
${content}
-----------------

[분석 규칙]
■ status / goodPoint / improvePoint → [핵심 내용] 섹션만 사용. [새롭게 알게 된 것] 섹션은 절대 참고하지 마세요.
■ secondContent / thinkMore → [새롭게 알게 된 것] 섹션만 사용.

[status 판단 기준 — [핵심 내용]만 보세요. 초등 3~6학년 교과서 수준으로 판단하세요.]
- 단순 사실 한 가지만 짧게 언급 (예: "타조알도 세포다", "세포가 있다") → 🔴
- 핵심 개념 일부만 설명, 방향은 맞지만 중요한 요소가 빠진 경우 → 🟡
- 초등 교과서에서 배운 핵심 내용을 2가지 이상 자신의 말로 설명한 경우 → 🟢

🟢 판단 예시 (이 수준이면 반드시 🟢):
"생물은 세포로 이루어져 있고 세포에는 세포막과 핵이 있다." → 🟢
"생물은 크기와 모양이 다양한 세포로 이루어져 있다. 세포는 세포막으로 둘러싸여 있으며 그 안에 핵이 있다." → 🟢
"세포는 생물의 기본 단위이고 세포막이 세포를 둘러싸고 있다." → 🟢

⚠️ 주의: 초등학생이 여러 핵심 요소를 설명했다면 표현이 완벽하지 않아도 🟢입니다. 더 전문적인 설명을 요구하지 마세요.

🚨 사실 오류 검증 필수: 내용이 풍부해도 과학적으로 틀린 사실이 포함되면 🟢를 줄 수 없습니다. 틀린 내용은 반드시 improvePoint에서 구체적으로 지적하고 올바른 개념을 안내하세요.
예) "자전은 태양을 중심으로 회전" → 오류. 자전은 지구 자전축을 중심으로 하루에 한 바퀴 회전. 태양 중심 회전은 공전(1년).
예) "자전은 1년에 한 바퀴" → 오류. 자전은 하루(약 24시간)에 한 바퀴. 1년에 한 바퀴는 공전.

[각 항목 작성 규칙]
- status: 위 기준에 따라 "🟢 핵심 개념을 정확히 이해했어요." / "🟡 핵심 개념을 찾아 조금 더 보완해보세요." / "🔴 핵심 개념을 다시 살펴보면 좋아요." 중 하나
- goodPoint: 학생이 어떤 개념적 이해를 보였는지 교사의 시각으로 평가하는 1~2문장. 학생 문장을 그대로 옮기거나 바꿔 쓰는 것이 아님. "~을 정확히 파악했어요", "~의 핵심을 잘 짚었어요", "~와 ~의 관계를 바르게 연결했어요" 형태 사용.
  ✗ 나쁜 예: "자전은 지구가 자전축을 중심으로 하루에 한 바퀴 돈다고 이해했어요." (학생 문장 반복)
  ✓ 좋은 예: "자전의 기준(자전축)과 주기(하루)를 정확히 연결지은 점이 돋보여요."
  * status 🟢 → 학생이 이해한 핵심 개념 요소 2가지를 교사 평가 어조로 작성하세요.
  * status 🟡·🔴 → 이해한 부분이 무엇인지 한 문장으로 평가하세요.
- improvePoint: 학생 답변에서 실제로 빠진 핵심 개념 요소만 지적할 것. 답변에 언급되지 않은 새로운 주제(예: 밤, 계절, 기후 등)를 임의로 추가 금지. 어미는 "~노력해보세요.", "~생각해보세요.", "~써보세요." 형태. "~도와주세요.", "~바랍니다." 금지.
  * status 🟢 → 반드시 "핵심 개념을 잘 정리했어요."라고만 작성하세요.
  * status 🟡 → 학생이 쓴 내용에서 실제로 빠진 핵심 요소 한 가지만 콕 집어 안내하세요. 빠진 요소가 불분명하면 "어떤 이유에서인지도 함께 써보세요." 처럼 답변 속 누락된 설명을 요청하세요.
  * status 🔴 → 학생이 쓴 내용이 왜 핵심에서 벗어났는지 짚고, 어떤 개념 요소를 추가해야 하는지 2문장으로 안내하세요.
- secondTitle: 항상 "🔍 핵심 개념과 연결하기"
- secondContent: [새롭게 알게 된 것] 섹션 답변만 보고, 그 내용이 핵심 개념과 어떻게 연결되는지 1~2문장 (강의·정답 금지)
- thinkMore: 두 답변을 단순히 합치지 말고 종합적으로 분석하여, 이 학생에게 실제로 필요한 탐구 방향이나 질문 1문장을 제시할 것. 이미 잘 이해한 내용을 반복하거나, 두 답변 내용을 나열하지 말 것. 답 알려주지 말 것.

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
          temperature: 0,
          seed: 42,
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
