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
- 명사구 형태 (예: "식물의 성장과 물", "자석과 금속의 성질", "경제 발전과 환경 보호")
- 6~16자 이내
- 질문 형태 금지
- 추상 명사 단독 사용 금지 ("관계", "이유"만으로 구성 금지)
- JSON만 출력 (코드블록 금지)

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
