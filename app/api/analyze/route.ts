import { NextRequest, NextResponse } from 'next/server';
import { chat } from '@/lib/ai-client';

// ─── 주제 감지 ─────────────────────────────────────
const SUBJECT_KWS: Record<string, string[]> = {
  biology:     ['생물','생명','동물','식물','씨앗','세균','바이러스','미생물','세포','성장','수명','노화','광합성','뿌리','잎','줄기','꽃','열매','곤충','물고기','사자','호랑이','상어','악어','독수리','코끼리','기린','펭귄','뱀'],
  space:       ['지구','우주','달','태양','별','행성','자전','공전','중력','은하','화성','목성','혜성'],
  environment: ['환경','기후','온난화','오염','재활용','쓰레기','탄소','숲','동물원','플라스틱','생태계'],
  material:    ['자석','철','물질','금속','얼음','소금','설탕','전기','빛','소리','열'],
  weather:     ['날씨','구름','비','눈','바람','폭풍','번개','태풍','기온','하늘','무지개','계절'],
  history:     ['공룡','역사','전쟁','멸종','옛날','고대','인류','문명'],
  tech:        ['로봇','인공지능','AI','컴퓨터','인터넷','드론','자동차','스마트폰'],
  social:      ['인구','고령화','경제','사회','취업','일자리','복지','도시','농촌','농업','산업','무역','세금','빈곤','불평등','이민','다문화','저출산','실업','노인','청소년','교육','문화','동네','마을','공원','주민','지역'],
};

function detectSubject(q: string) {
  for (const [s, kws] of Object.entries(SUBJECT_KWS)) {
    if (kws.some(w => q.includes(w))) return s;
  }
  return 'general';
}

// ─── 추천 탐구 방법 ────────────────────────────────
const METHODS_TABLE: Record<number, Record<string, string[]>> = {
  1: { biology:['생물 특징 찾아보기','관찰 내용 기록하기'], space:['우주 자료 찾아보기','행성 특징 비교하기'], material:['물체 직접 관찰하기','특징 표로 정리하기'], history:['역사 자료 조사하기','찾은 내용 정리하기'], tech:['기술 자료 찾아보기','쓰임새 기록하기'], weather:['날씨 변화 관찰하기','기상 자료 찾아보기'], environment:['환경 사례 찾아보기','자료 사진 정리하기'], social:['관련 사례 조사하기','내용 표로 정리하기'], general:['관련 자료 찾아보기','내용 표로 정리하기'] },
  2: { biology:['생물 변화 관찰하기','변화 날짜 기록하기'], space:['원인 자료 조사하기','모형으로 표현하기'], material:['물체 특징 비교하기','관찰 결과 기록하기'], weather:['날씨 원인 조사하기','현상 자료 찾아보기'], history:['원인 자료 조사하기','변화 전후 비교하기'], environment:['환경 사례 기록하기','원인 자료 조사하기'], tech:['기술 자료 조사하기','쓰임새 비교하기'], social:['원인 뉴스 찾아보기','관련 사례 찾아보기'], general:['원인 자료 조사하기','관련 사례 비교하기'] },
  3: { biology:['조건 달리해 비교하기','변화 과정 기록하기'], space:['지구본으로 실험하기','변화 전후 비교하기'], material:['조건 달리해 관찰하기','결과 표로 기록하기'], weather:['날씨 조건 비교하기','변화 과정 기록하기'], environment:['변화 전후 비교하기','환경 변화 관찰하기'], history:['변화 전후 비교하기','관련 사례 기록하기'], tech:['기능 표로 비교하기','변화 사례 찾아보기'], social:['생활 변화 사례 조사하기','변화 영향 목록 정리하기'], general:['조건 달리해 비교하기','변화 결과 기록하기'] },
};

function isCompareChoice(q: string) {
  return ['더 필요한','무엇이 더','어느 쪽이 더','중에 더','중 더','중에서 더','더 좋을까','더 나을까','무엇을 선택','더 중요','어떤 것이 더','어느 것이 더','더 먼저','먼저일까','먼저인가','우선해야','선택해야','중에 어떤','중 어떤'].some(p => q.includes(p));
}
function isSocialChange(q: string) {
  return ['사라져도 괜찮','없어져도 괜찮','대신해도 괜찮','계속해도 괜찮','사라져도 될까','없어져도 될까','대신해도 될까'].some(p => q.includes(p));
}
function isValueTradeoff(q: string) {
  if (['줄여도 괜찮','훼손해도 괜찮','포기해도 괜찮','희생해도 괜찮','파괴해도 괜찮','제한해도 괜찮','줄여도 될까','훼손해도 될까','포기해도 될까','희생해도 될까'].some(p => q.includes(p))) return true;
  return q.includes('위해') && (q.includes('도 괜찮') || q.includes('도 될까'));
}

function getMethods(level: number, question: string) {
  const q = question || '';
  if (level === 4) {
    if (isCompareChoice(q)) return ['장단점 비교하기','찬반 토론하기'];
    if (isSocialChange(q))  return ['관련 사례 조사하기','찬반 토론하기'];
    if (isValueTradeoff(q)) return ['장단점 비교하기','찬반 토론하기'];
    return ['찬반 근거 정리하기','관련 사례 조사하기'];
  }
  const subject = detectSubject(q);
  const row = METHODS_TABLE[level] || METHODS_TABLE[1];
  return row[subject] || row['general'];
}

function analyzeLevel(question: string) {
  const level4 = ['찬성','반대','해결','어떻게 해야 할까','어떻게 해야할까','해야 할까','해야할까','어떻게 해야','더 나은','가장 중요','중요한가','중요할까','옳은','옳을까','해결방법','해결책','어떤 선택','어떻게 하면 좋을까','어떤 방법이 좋을까','좋을까 나쁠까','어떻게 줄일','어떻게 늘릴','어떻게 막을','어떻게 지킬','어떻게 보호','어떻게 개선','해야 하나요','해야 하는가','해야 합니까','해야 할지','어떻게 해결','어떤 노력','우리가 할 수 있는','책임','의무','권리','공평','불공평','정의','윤리','없애야','바꿔야','바꿔야 할까','필요할까','필요한가','필요합니까','꼭 필요','줄여야','늘려야','써야','야 할까','아야 할까','더 필요한','무엇이 더','어느 쪽이 더','중에 더','중 더','중에서 더','더 좋을까','더 나을까','무엇을 선택','더 중요','사라져도 괜찮','없어져도 괜찮','대신해도 괜찮','계속해도 괜찮','사라져도 될까','없어져도 될까','대신해도 될까','어떤 것이 더','어느 것이 더','더 먼저','먼저일까','먼저인가','우선해야','선택해야','우선되어야','우선시되어야','우선시해야','무엇이 우선','어떤 것이 우선','중에 어떤','중 어떤','줄여도 괜찮','훼손해도 괜찮','포기해도 괜찮','희생해도 괜찮','파괴해도 괜찮','제한해도 괜찮','줄여도 될까','훼손해도 될까','포기해도 될까','희생해도 될까','정당한가','정당할까','정당한지','정당한가요','정당합니까','정당한','도 괜찮을까'];
  if (level4.some(w => question.includes(w))) return 4;
  if (question.includes('위해') && (question.includes('도 괜찮') || question.includes('도 될까'))) return 4;
  // 조건 변화·영향·가능성 → 3단계 (순수 비교 키워드는 제외)
  const level3 = ['만약','다면','이라면','한다면','된다면','라면','바뀐다면','달라진다면','없어진다면','늘어난다면','줄어든다면','없다면','있다면','많아지면','적어지면','달라지면','사라진다면','다르게','영향','관계','조건','어떻게 달라질까','달라질까','어떻게 변','더 많','더 적','상황이 달라지면','조건이 바뀌면','늘어나면','줄어들면','높아지면','낮아지면','없애면','추가하면','수 있을까','가능할까','변할 수 있','바뀔 수 있','될 수 있','없으면','있으면','어떻게 될까'];
  if (level3.some(w => question.includes(w))) return 3;
  // 개념 이해·공통점·차이점·비교 → 2단계
  const level2 = ['왜','이유','까닭','원인','무엇 때문에','뜻','의미','특징','역할','구조','원리','개념','방법','과정','순서','차이점','이란 무엇','란 무엇','은 무엇인가','는 무엇인가','성질','어떻게 해서','어떻게 생겨','어떻게 만들어','어떻게 되는','어떻게 일어','어떻게 작동','어떻게 움직','어떻게 되나요','어떻게 이루어','왜 그럴까','왜 그런가','왜 생기','왜 발생','왜 일어','무슨 이유','어떤 이유','어떤 원인','공통점','비교','차이가','비슷한 점','다른 점','어떤 차이','어떻게 다를까','다를까','같을까'];
  if (level2.some(w => question.includes(w))) return 2;
  return 1;
}

const LEVEL_DATA = {
  1: { emoji:'🟢', label:'1단계: 단순 사실 확인 질문', bgColor:'#e8f5e9', textColor:'#2e7d32', desc:'정답이나 정보를 확인하는 질문이에요.', goodPoints:'궁금한 내용을 분명하게 질문으로 표현했어요.', improvements:'이제 그 사실의 뜻, 특징, 역할을 더 알아보면 개념을 깊이 이해할 수 있어요.', defaultThinking:['이 내용은 어떤 뜻을 가지고 있을까요?','비슷한 예를 주변에서 찾아볼 수 있을까요?'] },
  2: { emoji:'🔵', label:'2단계: 개념 이해 질문', bgColor:'#e3f2fd', textColor:'#1565c0', desc:'뜻, 특징, 역할, 구조, 원리를 이해하려는 질문이에요.', goodPoints:'단순히 답만 찾는 것이 아니라 개념을 이해하려는 점이 좋아요.', improvements:'이제 조건을 바꾸거나 다른 대상과 비교해보면 더 깊은 탐구로 이어질 수 있어요.', defaultThinking:['이 개념은 다른 것과 어떤 점이 비슷하고 다를까요?','이 개념이 실제 생활에서는 어떻게 쓰일까요?'] },
  3: { emoji:'🟠', label:'3단계: 비교/조건/영향 탐구 질문', bgColor:'#fff3e0', textColor:'#e65100', desc:'조건이 달라질 때 변화나 영향을 생각하는 질문이에요.', goodPoints:'조건, 비교, 변화에 관심을 가지고 탐구하려는 점이 좋아요.', improvements:'이제 결과의 장단점이나 여러 사람의 입장을 생각하면 토론 질문으로 발전할 수 있어요.', defaultThinking:['조건이 달라지면 가장 크게 변하는 것은 무엇일까요?','이 변화는 우리 생활에 어떤 영향을 줄까요?'] },
  4: { emoji:'🔴', label:'4단계: 가치판단/토론/해결 질문', bgColor:'#ffebee', textColor:'#c62828', desc:'여러 관점에서 판단하고 토론할 수 있는 질문이에요.', goodPoints:'정답이 하나로 정해지지 않는 문제를 여러 관점에서 생각하려는 점이 좋아요.', improvements:'서로 다른 입장의 근거를 비교하고, 해결 방법까지 생각해보면 더 깊은 탐구가 됩니다.', defaultThinking:['찬성하는 입장과 반대하는 입장의 근거는 무엇일까요?','모두에게 도움이 되는 해결 방법은 무엇일까요?'] },
} as const;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { question } = body;

  if (!question) {
    return NextResponse.json({ error: '질문이 없습니다.' }, { status: 400 });
  }

  let level = analyzeLevel(question) as 1 | 2 | 3 | 4;
  let info  = LEVEL_DATA[level];
  const methods = getMethods(level, question);

  let desc: string       = info.desc;
  let goodPoints: string = info.goodPoints;
  if (level === 4 && isCompareChoice(question)) {
    desc       = '두 가치를 비교하고 무엇을 더 우선해야 할지 토론할 수 있는 최고 수준의 탐구질문이에요!';
    goodPoints = '정답이 하나로 정해지지 않는, 두 가치를 비교하고 우선순위를 생각해야 하는 훌륭한 탐구질문이에요!';
  } else if (level === 4 && isValueTradeoff(question)) {
    desc       = '서로 다른 두 가치가 충돌할 때 무엇을 더 중요하게 봐야 할지 판단하는 깊은 탐구질문이에요!';
    goodPoints = '사람마다 의견이 다를 수 있는, 찬성과 반대가 모두 가능한 훌륭한 탐구질문이에요!';
  }

  let thinkingQuestions: string[] = [...info.defaultThinking];

  try {
    const prompt = `초등학생의 탐구질문을 분석해주세요.

질문: "${question}"

[수준 분류 기준]
1단계(단순 사실): 하나의 정답이 존재하는 사실 확인 질문
2단계(개념 이해): 뜻·특징·역할·원리·순서·과정을 묻거나, 두 대상의 공통점·차이점을 개념적으로 비교하는 질문 (조건 변화 없음). 예: "어떤 순서로 자라는가", "어떻게 만들어지는가"
3단계(조건/영향): 조건이 달라질 때 결과 변화, 영향 관계를 묻는 질문. ※ 단순 공통점·차이점 질문은 2단계
4단계(가치판단/토론): 옳고 그름, 정당성, 가치 우선순위 등 여러 관점에서 의견이 나뉘는 질문

[중요] 질문에 구체적인 탐구 대상(명사·개념·현상)이 없고 질문 형태만 있는 경우(예: "무엇이 더 중요할까?", "무엇일까?", "어떤 특징이 있을까?"), 반드시 1단계로 분류하세요.

JSON으로만 응답. thinkingQuestions는 원본 질문을 반복하지 말고, 더 깊이 탐구할 수 있는 새로운 심화 질문 2개.
{"level": 1~4, "thinkingQuestions": ["질문1", "질문2"]}`;

    const raw    = await chat(
      [{ role: 'user', content: prompt }],
      { model: 'openai/gpt-oss-20b', temperature: 0.1, max_tokens: 400 },
    );
    const text   = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(text);

    if (parsed.level >= 1 && parsed.level <= 4) {
      level = parsed.level as 1 | 2 | 3 | 4;
      info  = LEVEL_DATA[level];
      desc       = info.desc as string;
      goodPoints = info.goodPoints as string;
      if (level === 4 && isCompareChoice(question)) {
        desc = '두 가치를 비교하고 무엇을 더 우선해야 할지 토론할 수 있는 최고 수준의 탐구질문이에요!';
        goodPoints = '정답이 하나로 정해지지 않는, 두 가치를 비교하고 우선순위를 생각해야 하는 훌륭한 탐구질문이에요!';
      } else if (level === 4 && isValueTradeoff(question)) {
        desc = '서로 다른 두 가치가 충돌할 때 무엇을 더 중요하게 봐야 할지 판단하는 깊은 탐구질문이에요!';
        goodPoints = '사람마다 의견이 다를 수 있는, 찬성과 반대가 모두 가능한 훌륭한 탐구질문이에요!';
      }
    }
    if (Array.isArray(parsed.thinkingQuestions) && parsed.thinkingQuestions.length === 2) {
      thinkingQuestions = parsed.thinkingQuestions;
    }
  } catch (err) {
    console.warn('[analyze] AI fallback:', err instanceof Error ? err.message : err);
  }

  return NextResponse.json({
    level,
    emoji:             info.emoji,
    label:             info.label,
    bgColor:           info.bgColor,
    textColor:         info.textColor,
    desc,
    goodPoints,
    improvements:      info.improvements,
    thinkingQuestions,
    methods,
  });
}
