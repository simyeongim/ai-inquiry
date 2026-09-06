// 샘플(데모) 학생 데이터를 Supabase에 넣는 스크립트.
// 실행 전 scripts/migrate-is-demo.sql 을 Supabase SQL Editor에서 먼저 실행해 is_demo 컬럼을 추가해야 합니다.
// 실행: node scripts/seed-demo.mjs
//
// 재실행해도 중복되지 않도록, 매번 시작 시 is_demo=true 데이터를 먼저 지우고 다시 채웁니다.
// (실제 데이터는 is_demo=true 가 아니므로 절대 건드리지 않습니다.)

const SUPABASE_URL = 'https://fsrrtopndcrdnqwnspnp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_z7LexdeBdGJqEy5Z8IAyNA_LEGAxPf_';

const GRADE = '6학년';
const CLASS_NAME = '샘플 학급';
const CLASS_ROOM = `${GRADE} ${CLASS_NAME}`; // app의 splitClassRoom()이 "N학년 나머지" 형태를 기대함
const PROJECT = "6학년 2학기 과학 4단원 '미래 과학과 진로'";
const LESSON = '6학년 2학기 과학 4단원 미래 과학과 진로';

const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

async function rest(method, table, { query = '', body, prefer = 'return=minimal' } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    method,
    headers: { ...HEADERS, Prefer: prefer },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${method} ${table} 실패 (HTTP ${res.status}): ${text}`);
  }
  if (prefer.includes('representation')) return res.json();
  return null;
}

// ── 1. 학생 15명 프로필 ──────────────────────────────────
// 랭크 1(가장 어려워함) ~ 15(가장 능숙함) 순으로, 세 가지 지표가 서로 자연스럽게 이어지도록 설계.
// 질문 수준: 1수준 2명·2수준 4명·3수준 6명·4수준 3명
// 개념 이해: 지원필요 2명·지속노력 2명·성장형 7명·즉시이해 4명
// 탐구 깊이: 나열형 4명·연결형 7명·관계탐구형 4명
const TOPICS = [
  '인공지능', '우주 탐사', '로봇공학', '신재생에너지', '유전자 가위 기술',
  '자율주행차', '가상현실', '3D 프린팅', '드론', '스마트팜',
  '해양 탐사 기술', '빅데이터', '나노기술', '바이오헬스', '기후공학',
];

function byRank(rank, breaks) {
  for (const [maxRank, value] of breaks) if (rank <= maxRank) return value;
  return breaks[breaks.length - 1][1];
}

const QUESTION_LEVEL_BREAKS = [[2, 1], [6, 2], [12, 3], [15, 4]];
const CONCEPT_TYPE_BREAKS = [[2, '지원필요'], [4, '지속노력'], [11, '성장형'], [15, '즉시이해']];
const DEPTH_TYPE_BREAKS = [[4, '나열형'], [11, '연결형'], [15, '관계탐구형']];

const STUDENTS = Array.from({ length: 15 }, (_, i) => {
  const rank = i + 1;
  return {
    name: `샘플${String(rank).padStart(2, '0')}`,
    rank,
    topic: TOPICS[i],
    questionLevel: byRank(rank, QUESTION_LEVEL_BREAKS),
    conceptType: byRank(rank, CONCEPT_TYPE_BREAKS),
    depthType: byRank(rank, DEPTH_TYPE_BREAKS),
  };
});

// ── 2. 콘텐츠 생성 헬퍼 ──────────────────────────────────
const LV = {
  1: { emoji: '🟢', label: '단순 사실 확인' },
  2: { emoji: '🔵', label: '개념 이해' },
  3: { emoji: '🟠', label: '비교/조건/영향' },
  4: { emoji: '🔴', label: '가치판단/토론' },
};

function buildQuestion(topic, level) {
  switch (level) {
    case 1: return `${topic} 기술은 무엇인가요?`;
    case 2: return `${topic} 기술은 왜 만들어졌고 어떤 원리로 작동하나요?`;
    case 3: return `${topic} 기술을 기존 방식과 비교하면 어떤 점이 다르고, 어떤 조건에서 더 효과적인가요?`;
    case 4: return `${topic} 기술이 앞으로 널리 퍼진다면 우리 사회와 직업 세계는 어떻게 달라질까요? 찬성과 반대 입장에서 생각해보면 어떨까요?`;
    default: return `${topic} 기술은 무엇인가요?`;
  }
}

// 초기 이해 상태(🟢/🟡/🔴)별 AI 피드백 템플릿
const FEEDBACK_TEMPLATES = {
  '🟢': (topic) => ({
    goodPoint: `${topic}의 핵심 원리를 정확히 설명했어요.`,
    improvePoint: `이제 이 기술과 관련된 다른 사례까지 연결해보면 더 좋겠어요.`,
    secondTitle: '더 나아가기',
    secondContent: `${topic} 기술이 다른 분야와 어떻게 연결되는지 찾아보세요.`,
    thinkMore: `${topic} 기술을 활용하는 새로운 직업에는 무엇이 있을까요?`,
  }),
  '🟡': (topic) => ({
    goodPoint: `${topic}이 어떤 기술인지는 잘 이해했어요.`,
    improvePoint: `왜 이 기술이 필요한지 이유까지 설명해보면 더 좋겠어요.`,
    secondTitle: '조금 더 채우기',
    secondContent: `${topic} 기술이 우리 생활을 어떻게 바꾸는지 이유를 들어 다시 설명해보세요.`,
    thinkMore: `${topic}이 없었다면 어떤 점이 불편했을까요?`,
  }),
  '🔴': (topic) => ({
    goodPoint: `${topic}이라는 낱말은 알고 있네요.`,
    improvePoint: `${topic}이 무엇을 하는 기술인지 설명이 빠졌어요. 다시 정리해보세요.`,
    secondTitle: '다시 정리하기',
    secondContent: `${topic}이 어떤 문제를 해결하기 위해 만들어졌는지부터 찾아보세요.`,
    thinkMore: `${topic}은 어디에서 사용되고 있나요?`,
  }),
};

const CONCEPT_CORE = {
  지원필요: (t) => `${t}은 미래에 사용되는 기술이라고 배웠다.`,
  지속노력: (t) => `${t}은 사람들의 생활을 편리하게 해주는 기술이며, 여러 분야에서 활용된다는 것을 배웠다.`,
  성장형: (t) => `${t}의 원리와 이 기술이 왜 필요한지, 그리고 실생활에 어떻게 활용되는지 배웠다.`,
  즉시이해: (t) => `${t}의 원리를 이해하고, 이 기술이 다른 기술과 어떻게 연결되어 미래 사회를 변화시키는지 설명할 수 있게 되었다.`,
};
const CONCEPT_DISCOVERY = {
  지원필요: (t) => `${t}이 뉴스에도 나온다는 것을 새롭게 알았다.`,
  지속노력: (t) => `${t}과 관련된 직업이 다양하게 있다는 것을 새롭게 알았다.`,
  성장형: (t) => `${t}이 다른 과학 기술과 연결되어 함께 발전하고 있다는 것을 새롭게 알았다.`,
  즉시이해: (t) => `${t}이 발전하면서 새로운 윤리적 문제도 함께 생긴다는 것을 새롭게 알게 되었다.`,
};
// conceptType별 초기/최종 상태, 수정 여부
const CONCEPT_STATUS = {
  지원필요: { initial: '🔴', revised: false, final: '🔴' },
  지속노력: { initial: '🟡', revised: true, final: '🟡' },
  성장형: { initial: '🟡', revised: true, final: '🟢' },
  즉시이해: { initial: '🟢', revised: false, final: '🟢' },
};

const DEPTH_EMOJI = { 나열형: '🟡', 연결형: '🔵', 관계탐구형: '🟢' };
const DEPTH_METHODS = {
  나열형: ['자료 조사'],
  연결형: ['자료 조사', '관찰·실험'],
  관계탐구형: ['자료 조사', '관찰·실험', '토론'],
};
const DEPTH_PROCESS = {
  나열형: (t) => `${t}에 대해 책과 인터넷 자료를 찾아 조사했다.`,
  연결형: (t) => `${t}에 대해 자료를 조사하고, 관련된 사례를 직접 관찰해 비교했다.`,
  관계탐구형: (t) => `${t}에 대해 자료를 조사하고 사례를 관찰한 뒤, 친구들과 토론하며 생각을 넓혔다.`,
};
const DEPTH_EXPLANATION = {
  나열형: (t) => `${t}은 여러 나라에서 이미 사용되고 있다는 사실을 알게 되었다.`,
  연결형: (t) => `${t}이 왜 필요한지, 그리고 다른 기술과 어떻게 연결되어 있는지 설명할 수 있게 되었다.`,
  관계탐구형: (t) => `${t}과 관련 기술들이 서로 어떤 관계를 맺으며 발전해왔는지, 그리고 그 관계가 미래 사회에 미치는 영향까지 탐구했다.`,
};
const DEPTH_INSIGHT = {
  나열형: (t) => `${t}이 신기한 기술이라고만 생각했는데, 실제로 많이 쓰이고 있다는 걸 알고 놀랐다.`,
  연결형: (t) => `${t}을 단순한 신기술이 아니라 우리 생활과 연결된 문제 해결 방법으로 보게 되었다.`,
  관계탐구형: (t) => `${t}을 통해, 하나의 기술이 여러 분야와 얽혀 사회 전체를 바꾼다는 것을 깊이 이해하게 되었다.`,
};
const DEPTH_COMMENT = {
  나열형: '사실을 나열하는 수준이에요. 왜 그런지 이유를 연결해보면 좋겠어요.',
  연결형: '개념을 연결해 설명하고 있어요. 그 관계를 더 깊이 파고들면 좋겠어요.',
  관계탐구형: '여러 개념 간의 관계를 탐구하며 깊이 있게 이해했어요.',
};

// ── 3. 테이블별 payload 생성 ─────────────────────────────
function buildQuestionsRows() {
  return STUDENTS.map((s) => {
    const lv = LV[s.questionLevel];
    return {
      class_room: CLASS_ROOM,
      project: PROJECT,
      name: s.name,
      question: buildQuestion(s.topic, s.questionLevel),
      analysis: { level: s.questionLevel, label: lv.label, emoji: lv.emoji, summary: `${s.topic}에 대한 궁금증을 잘 드러낸 질문이에요.` },
      time: new Date(2026, 7, 20 + (s.rank % 5), 9, 0, 0).toLocaleString('ko-KR'),
      is_demo: true,
    };
  });
}

function buildLearningsRows() {
  return STUDENTS.map((s) => {
    const { initial, revised, final } = CONCEPT_STATUS[s.conceptType];
    const core = CONCEPT_CORE[s.conceptType](s.topic);
    const discovery = CONCEPT_DISCOVERY[s.conceptType](s.topic);
    const content = `[핵심 내용]\n${core}\n\n[새롭게 알게 된 것]\n${discovery}`;
    const feedback = { status: initial, ...FEEDBACK_TEMPLATES[initial](s.topic) };
    // PostgREST 배치 insert는 배열 내 모든 객체의 키 집합이 동일해야 하므로,
    // is_revised가 false인 학생도 revised_* 키를 null로 채워 넣는다.
    let revisedContent = null;
    let revisedFeedback = null;
    let revisedStatus = null;
    if (revised) {
      const revisedCore = final === '🟢'
        ? `${core} 다시 생각해보니, ${s.topic}이 왜 필요한지 이유까지 설명할 수 있다.`
        : `${core} 조금 더 자세히 써보려 했지만 아직 이유를 완전히 설명하지는 못했다.`;
      revisedContent = `[핵심 내용]\n${revisedCore}\n\n[새롭게 알게 된 것]\n${discovery}`;
      const { status: _drop, ...rest } = { status: final, ...FEEDBACK_TEMPLATES[final](s.topic) };
      revisedFeedback = rest;
      revisedStatus = final;
    }
    const row = {
      grade: GRADE,
      class_name: CLASS_NAME,
      student_name: s.name,
      lesson: LESSON,
      content,
      feedback,
      is_revised: revised,
      revised_content: revisedContent,
      revised_feedback: revisedFeedback,
      revised_status: revisedStatus,
      created_at: new Date(2026, 7, 22 + (s.rank % 5), 10, 0, 0).toISOString(),
      is_demo: true,
    };
    return row;
  });
}

function buildExplorationsRows() {
  return STUDENTS.map((s) => ({
    class_room: CLASS_ROOM,
    name: s.name,
    project: PROJECT,
    question: buildQuestion(s.topic, s.questionLevel),
    methods: DEPTH_METHODS[s.depthType].join(', '),
    process: DEPTH_PROCESS[s.depthType](s.topic),
    explanation: DEPTH_EXPLANATION[s.depthType](s.topic),
    insight: DEPTH_INSIGHT[s.depthType](s.topic),
    depth_level: DEPTH_EMOJI[s.depthType],
    depth_comment: DEPTH_COMMENT[s.depthType],
    created_at: new Date(2026, 7, 24 + (s.rank % 5), 11, 0, 0).toISOString(),
    is_demo: true,
  }));
}

function buildProgressPostsRows() {
  return STUDENTS.map((s) => ({
    grade: GRADE,
    class_name: CLASS_NAME,
    student_name: s.name,
    project: PROJECT,
    content: `학교에도 ${s.topic} 기술을 체험할 수 있는 시간이 있으면 좋겠습니다. 직접 보고 만져봐야 더 잘 이해될 것 같습니다.`,
    created_at: new Date(2026, 7, 27 + (s.rank % 5), 13, 0, 0).toISOString(),
    is_demo: true,
  }));
}

function buildProgressQuestionsRows() {
  return STUDENTS.map((s) => ({
    grade: GRADE,
    class_name: CLASS_NAME,
    student_name: s.name,
    project: PROJECT,
    question: `${s.topic} 기술을 학교에 적용한다면 어떤 준비가 필요할까요?`,
    created_at: new Date(2026, 7, 27 + (s.rank % 5), 13, 5, 0).toISOString(),
    is_demo: true,
  }));
}

// ── 4. 실행 ───────────────────────────────────────────────
const DELETE_ORDER = ['progress_likes', 'progress_comments', 'progress_questions', 'progress_posts', 'explorations', 'learnings', 'questions'];

async function clearExistingDemoData() {
  for (const table of DELETE_ORDER) {
    await rest('DELETE', table, { query: '?is_demo=eq.true' });
  }
  console.log('기존 샘플(is_demo=true) 데이터 삭제 완료.');
}

async function main() {
  await clearExistingDemoData();

  await rest('POST', 'questions', { body: buildQuestionsRows() });
  console.log(`questions ${STUDENTS.length}건 추가.`);

  await rest('POST', 'learnings', { body: buildLearningsRows() });
  console.log(`learnings ${STUDENTS.length}건 추가.`);

  await rest('POST', 'explorations', { body: buildExplorationsRows() });
  console.log(`explorations ${STUDENTS.length}건 추가.`);

  const posts = await rest('POST', 'progress_posts', { body: buildProgressPostsRows(), prefer: 'return=representation' });
  console.log(`progress_posts ${posts.length}건 추가.`);

  await rest('POST', 'progress_questions', { body: buildProgressQuestionsRows() });
  console.log(`progress_questions ${STUDENTS.length}건 추가.`);

  // posts 배열은 STUDENTS와 같은 순서로 반환된다고 보장되지 않으므로 student_name으로 다시 매칭
  const postByStudent = new Map(posts.map((p) => [p.student_name, p]));

  const likes = [];
  const comments = [];
  STUDENTS.forEach((s, i) => {
    const post = postByStudent.get(s.name);
    if (!post) return;
    const liker1 = STUDENTS[(i + 1) % STUDENTS.length];
    const liker2 = STUDENTS[(i + 2) % STUDENTS.length];
    likes.push(
      { post_id: post.id, grade: GRADE, class_name: CLASS_NAME, student_name: liker1.name, is_demo: true },
      { post_id: post.id, grade: GRADE, class_name: CLASS_NAME, student_name: liker2.name, is_demo: true },
    );
    const commenter1 = STUDENTS[(i + 3) % STUDENTS.length];
    const commenter2 = STUDENTS[(i + 4) % STUDENTS.length];
    comments.push(
      { post_id: post.id, grade: GRADE, class_name: CLASS_NAME, student_name: commenter1.name, comment_type: '좋은 점', comment: `${s.topic} 아이디어 좋은데요! 저도 궁금했어요.`, created_at: new Date(2026, 7, 28 + (i % 5), 15, 0, 0).toISOString(), is_demo: true },
      { post_id: post.id, grade: GRADE, class_name: CLASS_NAME, student_name: commenter2.name, comment_type: '더 궁금한 점', comment: `${s.topic}을 실제로 학교에 도입하려면 비용은 어떻게 될까요?`, created_at: new Date(2026, 7, 28 + (i % 5), 15, 5, 0).toISOString(), is_demo: true },
    );
  });

  await rest('POST', 'progress_likes', { body: likes });
  console.log(`progress_likes ${likes.length}건 추가.`);
  await rest('POST', 'progress_comments', { body: comments });
  console.log(`progress_comments ${comments.length}건 추가.`);

  console.log('\n샘플 데이터 시딩 완료.');
}

main().catch((err) => {
  console.error('시딩 실패:', err.message);
  process.exit(1);
});
