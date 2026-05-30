import { NextRequest, NextResponse } from 'next/server';

interface TopicGroup { topic: string; questions: string[]; }

export async function POST(req: NextRequest) {
  const { questions, topKeywords, levelDist, avg, topicGroups } = await req.json();

  if (!Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ error: '질문이 없습니다.' }, { status: 400 });
  }

  const qList    = (questions as string[]).slice(0, 30).map((q, i) => `${i + 1}. ${q}`).join('\n');
  const kwStr    = (topKeywords as string[]).join(', ') || '(없음)';
  const distStr  = Object.entries(levelDist as Record<string, number>)
    .map(([l, c]) => `${l}단계 ${c}개`).join(', ');
  const groupStr = Array.isArray(topicGroups) && (topicGroups as TopicGroup[]).length > 0
    ? (topicGroups as TopicGroup[]).map(g =>
        `[주제: ${g.topic}]\n${g.questions.map((q, i) => `  ${i + 1}. ${q}`).join('\n')}`
      ).join('\n\n')
    : '(그룹 없음)';

  const system = `당신은 초등학교 IB 탐구 수업 교사를 돕는 AI입니다.
아래 규칙을 한 항목도 빠짐없이 지키세요.

[공통 원칙]
- JSON만 출력. 코드블록(backtick) 금지.
- 한국어 작성.
- 오직 학생 질문에 실제로 나온 내용만 근거로 작성. 추측·과도한 해석 절대 금지.
- 화면에 이미 표시된 숫자(총 개수, 평균, %)를 그대로 반복 금지.

[report — 정확히 2문장]
- 문장1: 학생들이 어떤 주제에 관심·궁금증을 보였는지. 실제 질문에 나온 키워드를 직접 언급.
  허용 표현: "~에 관심을 보였다", "~를 궁금해했다", "~에 대한 질문을 많이 했다"
  금지 표현: "이해하고 있다", "알고 있다", "파악하고 있다"
- 문장2: 질문 수준의 특징과 다음 수업에서 고려할 점. 수치 반복 금지.

[deepQuestions — 최대 2개, 반드시 ?로 끝나는 의문문]
생성 절차:
1. 아래 "주제별 질문 그룹"에서 각 그룹의 가장 탐구적인 질문 1개를 고른다.
2. 그 질문의 핵심 주제를 유지하면서 조금 더 탐구적인 형태로 발전시킨다.
3. 주제 그룹이 2개 이상이고 서로 다른 주제이면 각 그룹에서 1개씩(최대 2개).
4. 주제 그룹이 없으면 전체 질문 중 가장 탐구적인 것 1~2개를 선택해 발전.

금지: 서로 다른 주제의 질문을 억지로 합치는 것
잘못된 예: "태양계 자전 주기와 식물 성장의 관계는 어떻게 될까?" — 관련 없는 두 주제를 합침
올바른 예:
  원본: "우주에서도 식물이 살 수 있을까?"
  발전: "우주 환경에서 식물이 살아가기 위해 필요한 조건은 무엇일까?"

[suggestions — 최대 2개, 구체적 활동 이름]
- 실제 질문 데이터에 등장한 주제를 기반으로 작성.
- 교사가 다음 차시에 바로 실행할 수 있는 구체적 활동 이름.
- 동사로 끝내기 금지("~한다", "~배운다", "~탐구한다").
- 올바른 형태: "~비교 관찰 활동", "~찬반 토론", "~조사 발표", "~역할극"
- 잘못된 예: "탐구 활동을 제공한다.", "과학적 방법론을 배운다."`;

  const user = `학생 탐구 질문 (${(questions as string[]).length}개):
${qList}

핵심 주제어: ${kwStr}
질문 수준 분포: ${distStr} / 평균 ${(avg as number).toFixed(1)}단계

주제별 질문 그룹 (deepQuestions 생성 시 이 그룹 기준으로 작성할 것):
${groupStr}

출력 형식 (이 형식 그대로, 다른 텍스트 없이):
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
