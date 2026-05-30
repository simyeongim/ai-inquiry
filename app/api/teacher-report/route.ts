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

  const system = `당신은 초등학교 IB 탐구 수업 교사를 돕는 AI입니다.
아래 규칙을 한 항목도 빠짐없이 지키세요.

[공통]
- JSON만 출력. 코드블록 금지.
- 한국어로 작성.
- 화면에 이미 표시된 숫자(총 개수, 평균, %)를 그대로 반복 금지.

[report]
- 정확히 2문장.
- 문장1: 학생들이 어떤 주제에 관심·궁금증을 보였는지. "이해하고 있다" "알고 있다" 표현 절대 금지. 반드시 "관심을 보였다" "궁금해한다" "탐구하려 한다" 중 하나 사용.
- 문장2: 질문 수준의 특징과 다음 수업에서 고려할 점.

[deepQuestions]
- 최대 2개.
- 반드시 물음표(?)로 끝나는 탐구 의문문.
- 학생 질문 여러 개를 종합해 새로 재구성. 학생 질문 그대로 복사 절대 금지.
- 올바른 예: "식물 세포와 동물 세포는 어떻게 다를까?", "인간의 개발 활동은 지구 환경에 어떤 영향을 미칠까?"
- 잘못된 예: "식물과 태양계의 관계를 살펴보는 것이 중요하다."

[suggestions]
- 최대 2개.
- 교사가 다음 차시에 바로 실행할 수 있는 구체적 활동 이름 형태로 작성.
- "활동한다" "배운다" "탐구한다" 같은 추상 동사로 끝내기 금지.
- 올바른 예: "식물 세포와 동물 세포 비교 관찰 활동", "환경 보호와 개발 찬반 토론", "태양계 행성 환경 비교 발표"
- 잘못된 예: "탐구 활동을 제공한다.", "과학적 방법론을 배운다."`;

  const user = `학생 탐구 질문 (${(questions as string[]).length}개):
${qList}

핵심 주제어: ${kwStr}
질문 수준 분포: ${distStr} / 평균 ${(avg as number).toFixed(1)}단계

출력 형식 (이 형식 그대로):
{"report":"문장1. 문장2.","deepQuestions":["질문1?","질문2?"],"suggestions":["활동명1","활동명2"]}`;

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
        max_tokens: 500,
      }),
    });

    if (!resp.ok) throw new Error(`Groq ${resp.status}`);

    const data   = await resp.json();
    const raw    = data.choices[0].message.content.trim();
    const text   = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(text);

    // deepQuestions가 ?로 끝나지 않으면 서버 측에서 보정
    const deepQuestions = (Array.isArray(parsed.deepQuestions) ? parsed.deepQuestions : [])
      .map((q: string) => (typeof q === 'string' && !q.endsWith('?') ? q + '?' : q));

    return NextResponse.json({
      report:        typeof parsed.report === 'string' ? parsed.report : '',
      deepQuestions,
      suggestions:   Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    });
  } catch (err) {
    console.error('[teacher-report]', err);
    return NextResponse.json({ error: 'AI 분석 실패' }, { status: 500 });
  }
}
