'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

// ─── 분석 폴백 로직 (API 실패 시 사용) ─────────────

const STOP_WORDS = new Set(['왜','어떻게','무엇','언제','어디','누가','어떤','얼마나','어느','만약','모든','모두','각각','서로','여러','아무','이런','그런','저런','같은','다른','은','는','이','가','을','를','의','에','로','도','만','와','과','랑','이랑','나','며','라','이라','이것','그것','저것','이거','그거','저거','정말','매우','아주','너무','많이','적게','조금','더','더욱','항상','자주','가끔','보통','꼭','그리고','하지만','그러나','그런데','또는','또한','따라서','있','없','되','하','않','못','같','크','작','높','낮','것','때','곳','점','경우','중','간','사용','필요','관계','변화','이유','결과','방법','영향','역할','특징','할','될','됨','함','수','살','보','가']);

const ENDINGS = ['하나요','인가요','일까요','될까요','할까요','이에요','는가요','는지요','군요','나요','까요','죠','지','일까','할까','는가','는지','어요','아요','가요','네요','어','아','야'];
const PARTICLES = ['에서는','에게서','으로서','이라면','에서도','에서','으로','이나','에게','한테','은','는','이','가','을','를','의','에','로','도','만','와','과','랑','이랑','나','며'];

function extractTopKeywords(question: string, maxCount = 3) {
  return question
    .replace(/[?!.,~？！。「」\[\]]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0)
    .map(w => {
      for (const e of ENDINGS) { if (w.endsWith(e) && w.length > e.length) { w = w.slice(0, -e.length); break; } }
      for (const p of PARTICLES) { if (w.endsWith(p) && w.length > p.length) { w = w.slice(0, -p.length); break; } }
      return w;
    })
    .filter(w => w.length >= 2 && !STOP_WORDS.has(w))
    .filter(w => !/[했됐졌갔왔겠]$/.test(w))
    .filter((w, i, arr) => arr.indexOf(w) === i)
    .slice(0, maxCount);
}

function analyzeLevel(question: string) {
  const level4 = ['찬성','반대','해결','어떻게 해야 할까','어떻게 해야할까','해야 할까','해야할까','어떻게 해야','더 나은','가장 중요','중요한가','중요할까','옳은','옳을까','해결방법','해결책','어떤 선택','어떻게 하면 좋을까','어떤 방법이 좋을까','좋을까 나쁠까','어떻게 줄일','어떻게 늘릴','어떻게 막을','어떻게 지킬','어떻게 보호','어떻게 개선','해야 하나요','해야 하는가','해야 합니까','해야 할지','어떻게 해결','어떤 노력','우리가 할 수 있는','책임','의무','권리','공평','불공평','정의','윤리','없애야','바꿔야','바꿔야 할까','필요할까','필요한가','필요합니까','꼭 필요','줄여야','늘려야','써야','야 할까','아야 할까','더 필요한','무엇이 더','어느 쪽이 더','중에 더','중 더','중에서 더','더 좋을까','더 나을까','무엇을 선택','더 중요','사라져도 괜찮','없어져도 괜찮','대신해도 괜찮','계속해도 괜찮','사라져도 될까','없어져도 될까','대신해도 될까','어떤 것이 더','어느 것이 더','더 먼저','먼저일까','먼저인가','우선해야','선택해야','우선되어야','우선시되어야','우선시해야','무엇이 우선','어떤 것이 우선','중에 어떤','중 어떤','줄여도 괜찮','훼손해도 괜찮','포기해도 괜찮','희생해도 괜찮','파괴해도 괜찮','제한해도 괜찮','줄여도 될까','훼손해도 될까','포기해도 될까','희생해도 될까','정당한가','정당할까','정당한지','정당한가요','정당합니까','정당한','도 괜찮을까'];
  if (level4.some(w => question.includes(w))) return 4;
  if (question.includes('위해') && (question.includes('도 괜찮') || question.includes('도 될까'))) return 4;
  const level3 = ['만약','다면','이라면','한다면','된다면','라면','바뀐다면','달라진다면','없어진다면','늘어난다면','줄어든다면','없다면','있다면','많아지면','적어지면','달라지면','사라진다면','비교','차이가','다르게','어떻게 다를까','다를까','같을까','영향','관계','조건','어떻게 달라질까','달라질까','어떻게 변','더 많','더 적','어떤 차이','공통점','비슷한 점','다른 점','보다 더','반면','상황이 달라지면','조건이 바뀌면','늘어나면','줄어들면','높아지면','낮아지면','없애면','추가하면','수 있을까','가능할까','변할 수 있','바뀔 수 있','될 수 있','없으면','있으면','어떻게 될까'];
  if (level3.some(w => question.includes(w))) return 3;
  const level2 = ['왜','이유','까닭','원인','무엇 때문에','뜻','의미','특징','역할','구조','원리','개념','방법','과정','차이점','이란 무엇','란 무엇','은 무엇인가','는 무엇인가','성질','어떻게 해서','어떻게 생겨','어떻게 만들어','어떻게 되는','어떻게 일어','어떻게 작동','어떻게 움직','어떻게 되나요','어떻게 이루어','왜 그럴까','왜 그런가','왜 생기','왜 발생','왜 일어','무슨 이유','어떤 이유','어떤 원인'];
  if (level2.some(w => question.includes(w))) return 2;
  return 1;
}

const LEVELS = {
  1: { label:'1단계: 단순 사실 확인 질문', emoji:'🟢', bgColor:'#e8f5e9', textColor:'#2e7d32', desc:'정답이나 정보를 확인하는 질문이에요.', goodPoints:'궁금한 내용을 분명하게 질문으로 표현했어요.', improvements:'이제 그 사실의 뜻, 특징, 역할을 더 알아보면 개념을 깊이 이해할 수 있어요.', thinkingQ:['이 내용은 어떤 뜻을 가지고 있을까요?','비슷한 예를 주변에서 찾아볼 수 있을까요?'], methods:['관련 자료 찾아보기','내용 표로 정리하기'] },
  2: { label:'2단계: 개념 이해 질문', emoji:'🔵', bgColor:'#e3f2fd', textColor:'#1565c0', desc:'뜻, 특징, 역할, 구조, 원리를 이해하려는 질문이에요.', goodPoints:'단순히 답만 찾는 것이 아니라 개념을 이해하려는 점이 좋아요.', improvements:'이제 조건을 바꾸거나 다른 대상과 비교해보면 더 깊은 탐구로 이어질 수 있어요.', thinkingQ:['이 개념은 다른 것과 어떤 점이 비슷하고 다를까요?','이 개념이 실제 생활에서는 어떻게 쓰일까요?'], methods:['개념 자료 찾아보기','다른 대상과 비교하기'] },
  3: { label:'3단계: 비교/조건/영향 탐구 질문', emoji:'🟠', bgColor:'#fff3e0', textColor:'#e65100', desc:'조건이 달라질 때 변화나 영향을 생각하는 질문이에요.', goodPoints:'조건, 비교, 변화에 관심을 가지고 탐구하려는 점이 좋아요.', improvements:'이제 결과의 장단점이나 여러 사람의 입장을 생각하면 토론 질문으로 발전할 수 있어요.', thinkingQ:['조건이 달라지면 가장 크게 변하는 것은 무엇일까요?','이 변화는 우리 생활에 어떤 영향을 줄까요?'], methods:['조건 달리해 비교하기','변화 결과 기록하기'] },
  4: { label:'4단계: 가치판단/토론/해결 질문', emoji:'🔴', bgColor:'#ffebee', textColor:'#c62828', desc:'여러 관점에서 판단하고 토론할 수 있는 질문이에요.', goodPoints:'정답이 하나로 정해지지 않는 문제를 여러 관점에서 생각하려는 점이 좋아요.', improvements:'서로 다른 입장의 근거를 비교하고, 해결 방법까지 생각해보면 더 깊은 탐구가 됩니다.', thinkingQ:['찬성하는 입장과 반대하는 입장의 근거는 무엇일까요?','모두에게 도움이 되는 해결 방법은 무엇일까요?'], methods:['찬반 근거 정리하기','관련 사례 조사하기'] },
} as const;

function analyzeQuestionLocally(question: string) {
  const level = analyzeLevel(question) as 1 | 2 | 3 | 4;
  const info  = LEVELS[level];
  return { level, emoji: info.emoji, label: info.label, bgColor: info.bgColor, textColor: info.textColor, desc: info.desc, goodPoints: info.goodPoints, improvements: info.improvements, thinkingQuestions: [...info.thinkingQ], methods: [...info.methods], _fallback: true };
}

// ─── 유효성 검사 ────────────────────────────────────
const BLOCKED_WORDS = ['씨발','시발','씨팔','시팔','개새끼','개새','새끼','지랄','병신','니애미','느금마','엠창','창녀','섹스','야동','야설','성관계','강간','자위','음란','죽어라','자살해','살인해','폭발물'];

function validateQuestion(q: string) {
  if (!q || q.trim().length === 0) return '질문을 입력해주세요.';
  if (q.trim().length < 5) return '탐구할 수 있는 의미 있는 질문을 입력해 주세요.';
  if (q.length > 100) return '질문은 100자 이내로 적어 주세요.';
  if (/^[ㄱ-ㅎㅏ-ㅣ\s]+$/.test(q)) return '탐구할 수 있는 의미 있는 질문을 입력해 주세요.';
  if (/(.)\1{3,}/.test(q)) return '탐구할 수 있는 의미 있는 질문을 입력해 주세요.';
  if (BLOCKED_WORDS.some(w => q.includes(w))) return '탐구할 수 있는 의미 있는 질문을 입력해 주세요.';
  return '';
}

// ─── Supabase 저장 (publishable key) ────────────────
const SUPABASE_URL = 'https://fsrrtopndcrdnqwnspnp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_z7LexdeBdGJqEy5Z8IAyNA_LEGAxPf_';

async function saveQuestion(classRoom: string, project: string, name: string, question: string, analysis: Record<string, unknown>) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ class_room: classRoom, project, name, question, analysis: { level: analysis.level, label: analysis.label, emoji: analysis.emoji, summary: analysis.goodPoints }, time: new Date().toLocaleString('ko-KR') })
    });
  } catch { /* 저장 실패 시 무시 */ }
}

// ─── 타입 ────────────────────────────────────────────
interface Result {
  level: number; emoji: string; label: string; bgColor: string; textColor: string;
  desc: string; goodPoints: string; improvements: string;
  thinkingQuestions: string[]; methods: string[]; _fallback?: boolean;
}

// ─── 컴포넌트 ─────────────────────────────────────────
export default function QuestionPage() {
  const [classRoom, setClassRoom] = useState('');
  const [project,   setProject]   = useState('');
  const [name,      setName]      = useState('');
  const [question,  setQuestion]  = useState('');
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState<Result | null>(null);
  const [qError,    setQError]    = useState('');
  const resultRef = useRef<HTMLDivElement>(null);

  async function handleSubmit() {
    if (!classRoom) { alert('학년/반을 선택해주세요!'); return; }
    if (!project)   { alert('프로젝트를 선택해주세요!'); return; }
    if (!name.trim()) { alert('이름을 입력해주세요!'); return; }
    const err = validateQuestion(question);
    if (err) { setQError(err); return; }
    setQError('');
    setLoading(true);
    setResult(null);

    let data: Result;
    try {
      const res  = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question }) });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      data = json;
    } catch {
      data = analyzeQuestionLocally(question);
    }

    await saveQuestion(classRoom, project, name.trim(), question, data as unknown as Record<string, unknown>);
    setLoading(false);
    setResult(data);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }

  const HINTS = [
    { text: '🟢 무엇일까?',          cls: 'text-[#2e7d32] border-[#a5d6a7] bg-[#f1f8e9]' },
    { text: '🔵 어떤 특징이 있을까?', cls: 'text-[#1565c0] border-[#90caf9] bg-[#e3f2fd]' },
    { text: '🟠 만약 ~라면?',        cls: 'text-[#e65100] border-[#ffcc80] bg-[#fff8f0]' },
    { text: '🔴 무엇이 더 중요할까?', cls: 'text-[#c62828] border-[#ef9a9a] bg-[#ffebee]' },
  ];

  return (
    <div className="min-h-screen px-5 pt-4 pb-12"
      style={{ background: '#ffffff', fontFamily: "'Noto Sans KR', '맑은 고딕', sans-serif" }}>
      <div className="max-w-[680px] mx-auto">

        {/* 네비게이션 */}
        <div className="flex justify-between items-center mb-4">
          <Link href="/"
            className="text-[#667eea] text-sm font-semibold border border-[#667eea]/30 bg-[#667eea]/5 px-4 py-1.5 rounded-full hover:bg-[#667eea]/10 transition-colors no-underline">
            ← 홈
          </Link>
          <a href="/teacher"
            className="text-[#667eea] text-sm font-semibold border border-[#667eea]/30 bg-[#667eea]/5 px-4 py-1.5 rounded-full hover:bg-[#667eea]/10 transition-colors no-underline">
            🔒 교사용
          </a>
        </div>

        {/* 배너 이미지 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/discover.png" alt="질문 발견" className="w-full rounded-2xl mb-4 block" style={{ maxHeight: '28vh', objectFit: 'cover', objectPosition: 'center top' }} />

        {/* 학년/반 & 프로젝트 */}
        <Card>
          <Label>학년/반</Label>
          <Select value={classRoom} onChange={e => setClassRoom(e.target.value)}>
            <option value="">-- 학년/반을 선택하세요 --</option>
            {['3학년 1반','3학년 4반','4학년 4반','6학년 1반','6학년 2반','6학년 3반','6학년 3반 과학','6학년 4반','6학년 5반','6학년 6반'].map(v => <option key={v}>{v}</option>)}
          </Select>
          <Label className="mt-4">프로젝트</Label>
          <Select value={project} onChange={e => setProject(e.target.value)}>
            <option value="">-- 프로젝트를 선택하세요 --</option>
            {['세계는 어떻게 움직이는가','지구와 어떻게 함께 살아갈 것인가','우리는 어떻게 자신을 조직하는가'].map(v => <option key={v}>{v}</option>)}
          </Select>
        </Card>

        {/* 이름 */}
        <Card>
          <Label>내 이름</Label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="이름을 입력하세요"
            className="w-full border-2 border-[#e0e0f0] rounded-[10px] p-3 text-base text-gray-700 focus:outline-none focus:border-[#667eea] transition-colors" />
        </Card>

        {/* 질문 입력 */}
        <Card>
          <Label>내 질문</Label>
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {HINTS.map(({ text, cls }) => (
              <span key={text}
                className={`text-[0.8rem] font-semibold px-3 py-1.5 rounded-full border-[1.5px] select-none ${cls}`}>
                {text}
              </span>
            ))}
          </div>
          <textarea value={question} onChange={e => { setQuestion(e.target.value.slice(0, 150)); setQError(''); }}
            placeholder="무엇이 궁금한가요? 자유롭게 써보세요!" rows={4} maxLength={150}
            className="w-full border-2 border-[#e0e0f0] rounded-[10px] p-3 text-base text-gray-700 focus:outline-none focus:border-[#667eea] resize-y leading-relaxed transition-colors" />
          <div className={`text-right text-sm mt-1 ${question.length > 100 ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
            {question.length} / 100
          </div>
          {qError && <p className="text-red-600 text-sm mt-1.5 min-h-[1.2em]">{qError}</p>}
          <button onClick={handleSubmit} disabled={loading}
            className="mt-3.5 w-full text-white font-bold text-[1.1rem] py-3.5 rounded-[10px] border-none cursor-pointer bg-gradient-to-br from-[#667eea] to-[#764ba2] hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            {loading ? '분석 중...' : '질문 보내기 ✨'}
          </button>
        </Card>

        {/* 로딩 */}
        {loading && (
          <div className="text-center text-white text-[1.1rem] py-5 animate-pulse">
            AI가 생각 중이에요...
          </div>
        )}

        {/* 결과 */}
        {result && (
          <div ref={resultRef}
            className="bg-white rounded-[20px] p-6 mb-3.5 shadow-[0_4px_24px_rgba(80,60,160,0.13)] border-l-4 border-[#667eea]">
            <h2 className="text-xl font-bold text-[#4a4a6a] mb-4">🤖 AI 분석 결과</h2>

            {result._fallback && (
              <div className="bg-[#fff8e1] border-l-4 border-[#ffc107] p-3 rounded-md mb-4 text-sm text-[#795548]">
                AI 연결이 잠시 원활하지 않아 기본 분석으로 결과를 보여드릴게요.
              </div>
            )}

            <ResultSection>
              <span className="inline-block font-bold text-base px-4 py-2 rounded-full"
                style={{ background: result.bgColor, color: result.textColor }}>
                {result.emoji} {result.label}
              </span>
              <p className="text-[#555] text-[0.95rem] mt-2 mb-0">{result.desc}</p>
            </ResultSection>

            <ResultSection title="👍 현재 질문의 좋은 점">
              <p className="text-[#555] leading-[1.7] m-0 bg-[#f8f8ff] p-3 rounded-lg">{result.goodPoints}</p>
            </ResultSection>

            <ResultSection title="💡 이렇게 더 깊게 만들어 보세요">
              <p className="text-[#555] leading-[1.7] m-0 bg-[#f8f8ff] p-3 rounded-lg">{result.improvements}</p>
            </ResultSection>

            <ResultSection title="🤔 더 생각해볼 질문">
              <ul className="list-none m-0 p-0 space-y-2">
                {result.thinkingQuestions.map((q, i) => (
                  <li key={i} className="bg-[#f8f8ff] border-l-[3px] border-[#667eea] px-3.5 py-2.5 rounded-r-lg text-[#333] leading-relaxed">
                    {q}
                  </li>
                ))}
              </ul>
            </ResultSection>

            <ResultSection title="🔬 추천 탐구 방법" last>
              <div className="flex flex-wrap gap-2">
                {result.methods.map((m, i) => (
                  <span key={i} className="bg-[#667eea] text-white text-sm font-bold px-3.5 py-1.5 rounded-full">{m}</span>
                ))}
              </div>
            </ResultSection>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 공통 UI 서브컴포넌트 ────────────────────────────
function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-[20px] p-6 mb-3.5 shadow-[0_4px_24px_rgba(80,60,160,0.13)]">{children}</div>;
}
function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <label className={`block font-bold text-[#4a4a6a] mb-2 text-[0.95rem] ${className}`}>{children}</label>;
}
function Select({ children, value, onChange }: { children: React.ReactNode; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void }) {
  return (
    <select value={value} onChange={onChange}
      className="w-full border-2 border-[#e0e0f0] rounded-[10px] p-3 text-base text-gray-700 focus:outline-none focus:border-[#667eea] bg-white cursor-pointer transition-colors appearance-none">
      {children}
    </select>
  );
}
function ResultSection({ title, children, last = false }: { title?: string; children: React.ReactNode; last?: boolean }) {
  return <div className={last ? '' : 'mb-5'}>{title && <h3 className="text-[#4a4a6a] text-base font-bold mb-2.5">{title}</h3>}{children}</div>;
}
