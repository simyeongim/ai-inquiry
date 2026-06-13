import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { explorations } = await request.json();

  if (!Array.isArray(explorations) || !explorations.length) {
    return NextResponse.json({ results: [] });
  }
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ results: [] });
  }

  const toClassify = explorations.filter(
    (e: { id: string; explanation: string }) => e.explanation?.trim().length > 30
  );
  if (!toClassify.length) return NextResponse.json({ results: [] });

  const system = `너는 초등학생의 탐구 글을 분석하는 교육 전문가야.
각 학생의 탐구 설명을 읽고 탐구 깊이 수준을 분류해야 해.

분류 기준:
🟡 사실 나열형: 탐구에서 알게 된 사실이나 정보를 단순히 나열함. 개념 간 연결이나 관계 설명 없음.
🔵 연결 설명형: 알게 된 사실들을 서로 연결하여 설명함. 원인-결과나 개념 관계를 부분적으로 설명함.
🟢 관계 탐구형: 개념들 사이의 관계를 깊이 탐구하고, 왜 그런지 스스로 설명하거나 다른 상황에 적용함.`;

  const userContent = toClassify
    .map((e: { id: string; explanation: string }, i: number) =>
      `[${i + 1}] id="${e.id}"\n${e.explanation.trim().slice(0, 400)}`
    )
    .join('\n\n---\n\n');

  const user = `다음 학생들의 탐구 설명을 분류해주세요.
각 학생에 대해 id, level(🟡/🔵/🟢 중 하나), comment(학생 글의 특징 한 줄, 15자 이내)를 포함한 JSON 배열로만 응답하세요.

${userContent}

JSON 배열만 응답: [{"id":"...","level":"🟡","comment":"..."},...]`;

  try {
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
        max_tokens: 2000,
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      const raw  = data.choices[0].message.content.trim();
      const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return NextResponse.json({ results: parsed });
      }
    }
  } catch (err) {
    console.warn('[explore-insight] error:', err instanceof Error ? err.message : err);
  }

  return NextResponse.json({ results: [] });
}
