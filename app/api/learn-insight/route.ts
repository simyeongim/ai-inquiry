import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { improvePoints, revisedImprovePoints, statusDist } = await req.json();

  if (!Array.isArray(improvePoints) || improvePoints.length === 0) {
    return NextResponse.json({ error: '데이터가 없습니다.' }, { status: 400 });
  }

  const allPoints = [
    ...(improvePoints as string[]).map((p, i) => `[최초] ${i + 1}. ${p}`),
    ...(revisedImprovePoints as string[]).map((p, i) => `[수정] ${i + 1}. ${p}`),
  ].join('\n');

  const distStr = Object.entries(statusDist as Record<string, number>)
    .map(([k, v]) => `${k} ${v}명`).join(' · ');

  const system = `당신은 초등학교 IB 탐구 수업 분석가입니다.
[절대 원칙]
- JSON만 출력. 코드블록(backtick) 금지.
- 한국어 작성. 각 항목 2~3문장 이내.
- 아래 제공된 AI 피드백 텍스트에서 직접 근거를 찾아 작성. 없는 내용 추가 금지.
- "학생이"/"학생은"으로 문장 시작 금지.
- "추상적인 개념"/"심층적 이해"/"탐구 역량" 금지.
- 교사가 내일 바로 쓸 수 있는 실용적 언어로 작성.`;

  const user = `아래는 핵심개념 작성 활동에서 AI가 학생에게 제공한 "보완이 필요한 점" 피드백 목록입니다.

이해수준 분포: ${distStr}

--- AI 피드백 목록 ---
${allPoints}
----------------------

아래 3가지를 분석하세요.

misconception: 피드백에서 반복되는 오개념 또는 누락 패턴을 구체적으로 서술하세요. 어떤 개념이 빠졌는지 직접 언급하세요.

suggestion: 위 오개념을 해소할 수 있도록 교사가 다음 수업에서 바로 활용 가능한 활동이나 자료를 1가지 제안하세요. "[실제 개념명] + [활동 방식]" 형태로 작성하고 동사로 끝내지 마세요.

explorationQuestions: 위 피드백 패턴과 오개념을 바탕으로, 다음 탐구 수업에서 학생들이 실제로 탐구할 수 있는 질문 2개를 제안하세요. 반드시 ?로 끝나는 한국어 의문문. 초등학생이 실제로 조사하거나 실험할 수 있는 수준으로 작성. 출력: 배열

출력 형식(다른 텍스트 없이):
{"misconception":"...","suggestion":"...","explorationQuestions":["질문1?","질문2?"]}`;

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'GROQ_API_KEY가 설정되지 않았습니다.' }, { status: 500 });
  }

  try {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: system },
          { role: 'user',   content: user   },
        ],
        temperature: 0.1,
        max_tokens: 800,
      }),
    });

    if (!resp.ok) throw new Error(`Groq ${resp.status}`);

    const data   = await resp.json();
    const raw    = data.choices[0].message.content.trim();
    const text   = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(text);

    const explorationQuestions = (Array.isArray(parsed.explorationQuestions) ? parsed.explorationQuestions : [])
      .map((q: string) => (typeof q === 'string' && !q.endsWith('?') ? q + '?' : q));
    return NextResponse.json({
      misconception:       typeof parsed.misconception === 'string' ? parsed.misconception : '',
      suggestion:          typeof parsed.suggestion    === 'string' ? parsed.suggestion    : '',
      explorationQuestions,
    });
  } catch (err) {
    console.error('[learn-insight]', err);
    return NextResponse.json({ error: 'AI 분석 실패' }, { status: 500 });
  }
}
