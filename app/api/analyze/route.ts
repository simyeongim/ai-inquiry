import { NextRequest, NextResponse } from 'next/server';

// ─── 주제 감지 ─────────────────────────────────────
const SUBJECT_KWS: Record<string, string[]> = {
  biology:     ['생물','생명','동물','식물','씨앗','세균','바이러스','미생물','세포','성장','수명','노화','광합성','뿌리','잎','줄기','꽃','열매','곤충','물고기','사자','호랑이','상어','악어','독수리','코끼리','기린','펭귄','뱀'],
  space:       ['지구','우주','달','태양','별','행성','자전','공전','중력','은하','화성','목성','혜성'],
  environment: ['환경','기후','온난화','오염','재활용','쓰레기','탄소','숲','동물원','플라스틱','생태계'],
  material:    ['자석','철','물질','금속','얼음','소금','설탕','전기','빛','소리','열'],
  weather:     ['날씨','구름','비','눈','바람','폭풍','번개','태풍','기온','하늘','무지개','계절'],
  history:     ['공룡','역사','전쟁','멸종','옛날','고대','인류','문명','사라진','사라져'],
  tech:        ['로봇','인공지능','AI','컴퓨터','인터넷','드론','자동차','스마트폰'],
  social:      ['인구','고령화','경제','사회','취업','일자리','복지','도시','농촌','농업','산업','무역','세금','빈곤','불평등','이민','다문화','저출산','실업','노인','청소년','교육','문화'],
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
  3: { biology:['조건 달리해 비교하기','변화 과정 기록하기'], space:['지구본으로 실험하기','변화 전후 비교하기'], material:['조건 달리해 관찰하기','결과 표로 기록하기'], weather:['날씨 조건 비교하기','변화 과정 기록하기'], environment:['변화 전후 비교하기','환경 변화 관찰하기'], history:['변화 전후 비교하기','관련 사례 기록하기'], tech:['기능 표로 비교하기','변화 사례 찾아보기'], social:['변화 전후 비교하기','관련 사례 정리하기'], general:['조건 달리해 비교하기','변화 결과 기록하기'] },
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
  const level4 = ['찬성','반대','해결','어떻게 해야 할까','어떻게 해야할까','해야 할까','해야할까','어떻게 해야','더 나은','가장 중요','중요한가','중요할까','옳은','옳을까','해결방법','해결책','어떤 선택','어떻게 하면 좋을까','어떤 방법이 좋을까','좋을까 나쁠까','어떻게 줄일','어떻게 늘릴','어떻게 막을','어떻게 지킬','어떻게 보호','어떻게 개선','해야 하나요','해야 하는가','해야 합니까','해야 할지','어떻게 해결','어떤 방법','어떤 노력','우리가 할 수 있는','책임','의무','권리','공평','불공평','정의','윤리','없애야','바꿔야','바꿔야 할까','필요할까','필요한가','필요합니까','꼭 필요','필요가 있','필요가 없','줄여야','늘려야','써야','야 할까','아야 할까','더 필요한','무엇이 더','어느 쪽이 더','중에 더','중 더','중에서 더','더 좋을까','더 나을까','무엇을 선택','더 중요','사라져도 괜찮','없어져도 괜찮','대신해도 괜찮','계속해도 괜찮','사라져도 될까','없어져도 될까','대신해도 될까','어떤 것이 더','어느 것이 더','더 먼저','먼저일까','먼저인가','우선해야','선택해야','우선되어야','우선시되어야','우선시해야','무엇이 우선','어떤 것이 우선','중에 어떤','중 어떤','줄여도 괜찮','훼손해도 괜찮','포기해도 괜찮','희생해도 괜찮','파괴해도 괜찮','제한해도 괜찮','줄여도 될까','훼손해도 될까','포기해도 될까','희생해도 될까','정당한가','정당할까','정당한지','정당한가요','정당합니까','정당한'];
  if (level4.some(w => question.includes(w))) return 4;
  if (question.includes('위해') && (question.includes('도 괜찮') || question.includes('도 될까'))) return 4;
  const level3 = ['만약','다면','이라면','한다면','된다면','라면','바뀐다면','달라진다면','없어진다면','늘어난다면','줄어든다면','없다면','있다면','많아지면','적어지면','달라지면','사라진다면','비교','차이','다르게','어떻게 다를까','다를까','같을까','영향','관계','조건','어떻게 달라질까','달라질까','어떻게 변','더 많','더 적','어떤 차이','공통점','비슷한 점','다른 점','보다 더','반면','상황이 달라지면','조건이 바뀌면','늘어나면','줄어들면','높아지면','낮아지면','없애면','추가하면','수 있을까','가능할까','변할 수 있','바뀔 수 있','될 수 있','도 괜찮을까'];
  if (level3.some(w => question.includes(w))) return 3;
  const level2 = ['왜','이유','까닭','원인','무엇 때문에','뜻','의미','특징','역할','구조','원리','개념','어떻게 해서','어떻게 생겨','어떻게 만들어','어떻게 되는','어떻게 일어','어떻게 작동','어떻게 움직','어떻게 되나요','어떻게 이루어','왜 그럴까','왜 그런가','왜 생기','왜 발생','왜 일어','무슨 이유','어떤 이유','어떤 원인'];
  if (level2.some(w => question.includes(w))) return 2;
  return 1;
}

const LEVEL_DATA = {
  1: { emoji:'🟢', label:'1단계: 단순 사실 질문', bgColor:'#e8f5e9', textColor:'#2e7d32', desc:'정답이 하나인 질문이에요. 탐구의 좋은 시작점이 될 거예요!', goodPoints:'궁금한 것을 정확하고 명확하게 질문으로 표현했어요. 탐구는 이렇게 뚜렷한 질문에서 시작돼요!', improvements:'질문 뒤에 "왜?"를 붙여보세요. "○○은 무엇인가요?" 대신 "○○은 왜 그런 특징을 가질까요?"처럼 바꾸면 더 깊은 탐구 질문이 돼요.', defaultThinking:['이 사실이 왜 그런지 이유를 생각해본 적 있나요?','비슷한 예를 주변에서 찾아볼 수 있을까요?'] },
  2: { emoji:'🔵', label:'2단계: 이유/원인 질문', bgColor:'#e3f2fd', textColor:'#1565c0', desc:'왜 그런지 이유를 찾으려는 질문이에요. 사실보다 한 단계 깊게 생각했어요!', goodPoints:'"왜"라고 질문한 점이 좋아요. 단순히 사실을 확인하는 데서 한 발 더 나아가 이유와 원인을 찾으려 했어요!', improvements:'이유를 찾은 다음엔 "조건이 달라지면 어떻게 될까?"로 넓혀보세요. 장소, 날씨, 양, 시간이 달라지면 결과도 달라지는지 비교해보면 훨씬 풍부한 탐구가 돼요.', defaultThinking:['이 일이 일어난 까닭은 한 가지일까요, 여러 가지가 함께 영향을 주었을까요?','이 일이 일어나면 주변에는 어떤 변화가 생길까요?'] },
  3: { emoji:'🟠', label:'3단계: 비교/조건/영향 질문', bgColor:'#fff3e0', textColor:'#e65100', desc:'조건이 달라지면 어떻게 되는지 알아보는 질문이에요. 과학자처럼 생각하고 있어요!', goodPoints:'조건이나 상황이 달라지면 어떻게 바뀌는지를 생각한 질문이에요. 과학자처럼 비교하고 분석하는 눈이 생겼어요!', improvements:'"어떻게 해야 할까?", "무엇이 더 중요할까?"처럼 가치 판단이 필요한 질문으로 발전시켜 보세요. 친구들과 서로 다른 의견을 나눌 수 있는 질문이 되면 가장 깊은 탐구가 돼요.', defaultThinking:['조건이 달라지면 어떤 점이 가장 크게 바뀔까요?','이 변화가 우리 일상생활에서 가장 먼저 달라지는 것은 무엇일까요?'] },
  4: { emoji:'🔴', label:'4단계: 가치판단/토론 질문', bgColor:'#ffebee', textColor:'#c62828', desc:'여러 관점에서 생각하고 토론할 수 있는 깊은 수준의 질문이에요!', goodPoints:'정답이 하나가 아닌, 여러 관점에서 생각해볼 수 있는 깊은 질문을 만들었어요. 다양한 의견이 나올 수 있는 훌륭한 질문이에요!', improvements:'이미 아주 깊은 질문이에요! "누구의 입장에서 보느냐"를 구체적으로 추가해보세요. 학생, 어른, 환경, 미래 세대 등 다양한 관점을 넣으면 더욱 풍부한 탐구가 돼요.', defaultThinking:['찬성하는 입장과 반대하는 입장의 이유는 각각 무엇인가요?','이 문제로 가장 불편하거나 어려움을 겪는 사람은 누구일까요?'] },
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

  if (process.env.GROQ_API_KEY) {
    try {
      const prompt = `초등학생의 탐구질문을 분석해주세요.

질문: "${question}"

[수준 분류 기준]
1단계(단순 사실): 하나의 정답이 존재하는 사실 확인 질문
2단계(이유/원인): 왜 그런지, 원인을 묻는 질문
3단계(비교/조건/영향): 조건 변화에 따른 결과, 두 대상 비교, 영향 관계를 묻는 질문
4단계(가치판단/토론): 옳고 그름, 정당성, 가치 우선순위 등 여러 관점에서 의견이 나뉘는 질문

JSON으로만 응답. thinkingQuestions는 초등학생 수준 심화 질문 2개.
{"level": 1~4, "thinkingQuestions": ["질문1", "질문2"]}`;

      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: prompt }], temperature: 0.1, max_tokens: 400 })
      });

      if (resp.ok) {
        const data   = await resp.json();
        const raw    = data.choices[0].message.content.trim();
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
      }
    } catch (err) {
      console.warn('[analyze] Groq fallback:', err instanceof Error ? err.message : err);
    }
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
