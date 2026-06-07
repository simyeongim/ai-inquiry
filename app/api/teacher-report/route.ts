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

  const system = `당신은 초등학교 IB 탐구 수업 분석가입니다. 교육 조언자가 아니라 학생 질문 데이터 분석가로서 작성하세요.

[절대 원칙]
- JSON만 출력. 코드블록(backtick) 금지.
- 한국어 작성.
- 아래 제공된 실제 학생 질문 텍스트에서 직접 근거를 찾아 작성. 없는 내용 절대 추가 금지.
- 화면에 이미 표시된 숫자(총 개수, 평균, %)를 그대로 반복 금지.

[절대 금지 표현 — 아래 표현이 포함되면 오답]
"이해하고 있다" / "알고 있다" / "파악하고 있다" / "역량이 향상" / "학습이 이루어졌다"
"다음 수업에서 고려할 점" / "수업 설계 시 참고" / "학생 수준에 맞게" / "균형 있게 다루어야"
"추상적인 개념" / "심층적 이해" / "탐구 역량"

[report — 정확히 2문장]
- 문장1: 학생 질문 목록에서 실제로 등장한 구체적 키워드(식물, 자석, 환경 등)를 직접 인용하며
  어떤 주제에 대한 질문이 많았는지 서술.
  예) "식물의 성장 조건과 빛·물의 역할에 대한 질문이 가장 많았다."
  예) "자석에 붙는 물체와 전기 관련 질문이 집중되었다."

- 문장2: 질문 수준 분포의 특징을 구체적으로 서술. 수치 반복 금지.
  예) "조건 변화형 질문이 많아 탐구 의지가 높으며, 가치판단형 질문도 일부 나타났다."
  예) "대부분 사실 확인·개념 이해 수준이며, 일부 비교·조건 탐구 질문도 포함되었다."

[deepQuestions — 최대 2개, 반드시 ?로 끝나는 의문문]
1. 아래 "주제별 질문 그룹"에서 그룹별로 가장 탐구적인 질문 1개를 고른다.
2. 원본 질문의 핵심 주제를 유지하면서 조건·비교·가치 판단을 추가해 발전시킨다.
3. 서로 다른 주제의 그룹이면 각 1개씩(최대 2개). 그룹이 없으면 전체에서 선택.

절대 금지:
- 서로 다른 그룹의 질문을 합치기 ("자전 주기와 식물 성장의 관계" ❌)
- 각 deepQuestion은 반드시 하나의 그룹에서만 출발

예)
  원본: "지구는 왜 자전할까?" → 발전: "지구가 자전을 멈추면 낮과 밤은 어떻게 변할까?"
  원본: "식물은 빛이 없으면 어떻게 될까?" → 발전: "빛의 양이 달라지면 식물의 성장은 어떻게 달라질까?"

[suggestions — 최대 2개]
- 실제 학생 질문에 등장한 키워드를 활동명에 반드시 포함.
- "[실제 주제] + [활동 방식]" 형태로 작성.
- 교사가 내일 바로 실행 가능한 구체적 활동명.
- 올바른 예: "식물 성장 조건 비교 실험", "환경 개발 찬반 토론", "자석에 붙는 물체 분류 활동"
- 잘못된 예: "탐구 활동" / "조사 발표" / "심화 탐구를 제공한다"
- 동사로 끝내기 금지("~한다", "~배운다", "~탐구한다", "~제공한다")`;

  const user = `학생 탐구 질문 (${(questions as string[]).length}개):
${qList}

핵심 주제어: ${kwStr}
질문 수준 분포: ${distStr} / 평균 ${(avg as number).toFixed(1)}단계

주제별 질문 그룹:
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
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSON not found');
    const parsed = JSON.parse(jsonMatch[0]);

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
