import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { questions, topKeywords, levelDist, avg } = await req.json();

  if (!Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ error: '질문이 없습니다.' }, { status: 400 });
  }

  const qList   = (questions as string[]).slice(0, 30).map((q, i) => `${i + 1}. ${q}`).join('\n');
  const kwStr   = (topKeywords as string[]).join(', ') || '(없음)';
  const distStr = Object.entries(levelDist as Record<string, number>)
    .map(([l, c]) => `${l}단계 ${c}개`).join(', ');

  const prompt = `당신은 IB 프로그램을 운영하는 초등학교 교사를 돕는 교육 AI입니다.

학생들이 제출한 탐구 질문:
${qList}

분석 정보:
- 핵심 탐구 주제어: ${kwStr}
- 질문 수준 분포: ${distStr}
- 평균 단계: ${(avg as number).toFixed(1)}단계

아래 세 가지를 JSON 형식으로만 응답하세요. 반드시 한국어로 작성.

1. "report": 학생들의 탐구 주제와 사고 수준을 2~3문장으로 분석. 어떤 주제에 관심이 많은지, 어떤 수준의 사고를 하고 있는지 교사가 한눈에 파악할 수 있도록 구체적으로 작성.

2. "deepQuestions": 학생 질문 중 가장 탐구적인 것을 골라 더 깊고 성찰적인 질문으로 발전시켜 1~2개 작성. 학생 질문을 그대로 복사하지 말고, 핵심 가치나 개념을 확장하여 새로 작성. 배열로 반환.

3. "suggestions": 수집된 학생 질문 데이터를 근거로 다음 차시에 활용 가능한 구체적인 수업 활동 제안 2~3개. 일반적인 템플릿이 아니라 실제 학생들의 관심 주제와 질문 내용을 반영할 것. 배열로 반환.

{"report":"...","deepQuestions":["질문1","질문2"],"suggestions":["제안1","제안2","제안3"]}`;

  try {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 900,
      }),
    });

    if (!resp.ok) throw new Error(`Groq ${resp.status}`);

    const data   = await resp.json();
    const raw    = data.choices[0].message.content.trim();
    const text   = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(text);

    return NextResponse.json({
      report:        typeof parsed.report === 'string' ? parsed.report : '',
      deepQuestions: Array.isArray(parsed.deepQuestions) ? parsed.deepQuestions : [],
      suggestions:   Array.isArray(parsed.suggestions)   ? parsed.suggestions   : [],
    });
  } catch (err) {
    console.error('[teacher-report]', err);
    return NextResponse.json({ error: 'AI 분석 실패' }, { status: 500 });
  }
}
