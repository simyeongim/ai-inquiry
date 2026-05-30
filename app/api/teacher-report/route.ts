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

  const prompt = `당신은 초등학교 IB 탐구 수업을 운영하는 교사를 돕는 교육 AI입니다.
목적: 교사가 10초 안에 읽고 수업 의사결정에 바로 활용할 수 있는 간결한 분석.

학생 탐구 질문 (${(questions as string[]).length}개):
${qList}

핵심 주제어: ${kwStr}
질문 수준 분포: ${distStr} / 평균 ${(avg as number).toFixed(1)}단계

JSON으로만 응답. 한국어. 통계 수치 반복 금지.

"report": 2문장만. ①많이 나온 주제, ②질문 수준 특징과 수업 시사점. 이미 화면에 있는 숫자(총 개수, 평균, 비율)는 언급하지 말 것.

"deepQuestions": 최대 2개. 학생 질문 전체를 종합해 재구성. 학생 질문 그대로 복사 절대 금지. 한 문장으로 간결하게.

"suggestions": 최대 2개. 학생 질문 전체 패턴을 분석해 다음 차시 구체적 활동 제안. 특정 질문 하나만 기반으로 작성하지 말 것. 한 문장씩.

{"report":"문장1. 문장2.","deepQuestions":["질문1","질문2"],"suggestions":["제안1","제안2"]}`;

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
        temperature: 0.5,
        max_tokens: 500,
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
