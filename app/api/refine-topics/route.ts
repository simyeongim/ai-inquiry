import { NextRequest, NextResponse } from 'next/server';

interface GroupInput { key: string; label: string; samples: string[]; }

export async function POST(req: NextRequest) {
  const { groups } = await req.json() as { groups: GroupInput[] };
  if (!Array.isArray(groups) || groups.length === 0) return NextResponse.json({});

  const list = groups
    .map(g => `- key: "${g.key}" | 임시명: "${g.label}" | 대표질문: ${g.samples.join(' / ')}`)
    .join('\n');

  const prompt = `초등학생(3~6학년) 질문 그룹의 탐구 주제명을 자연스러운 한국어로 다듬어 주세요.

규칙:
- 반드시 탐구 대상(명사)이 드러나는 명사구 (예: "식물의 성장과 물", "자석과 금속의 성질")
- 6~16자 이내
- 질문 형태 금지
- 아래 금지 단어는 주제명에 단독 또는 조합으로 사용 불가:
  이유, 방법, 도움, 생활, 관계, 영향, 역할, 특징, 관련, 자랄, 상관관계
- 서로 다른 주제의 질문을 하나로 합치지 말 것
- JSON만 출력 (코드블록 금지)

나쁜 예 → 좋은 예:
  "생활과 도움" ❌  →  "식물의 생활 환경" ✅
  "자랄 이유" ❌  →  "씨앗 발아와 성장 조건" ✅
  "우주의 자전과 식물의 상관관계" ❌  →  "태양계 자전 주기" ✅
  "경제와 환경의 관계" ❌  →  "경제 발전과 환경 보호" ✅

그룹 목록:
${list}

출력 형식 (JSON only, 다른 텍스트 없이):
{"key1":"주제명1","key2":"주제명2"}`;

  try {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        max_tokens: 200,
        messages: [
          { role: 'system', content: '한국어 초등 교육 탐구 주제명 작성 전문가. JSON만 응답.' },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!resp.ok) return NextResponse.json({});

    const data = await resp.json();
    const raw = data.choices[0].message.content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '{}');
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({});
  }
}
