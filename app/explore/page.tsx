'use client';

import { useState } from 'react';
import Link from 'next/link';

const CLASS_LIST = ['3학년 1반','3학년 4반','4학년 4반','6학년 1반','6학년 2반','6학년 3반','6학년 3반 과학','6학년 4반','6학년 5반','6학년 6반'] as const;
const METHODS    = ['자료 조사','생성형 AI 활용','친구와 토론','영상 시청','관찰·실험','사례 분석','기타'] as const;

// ── 탐구 도우미 mock 데이터 ────────────────────────────────
// keywords: 주제 감지용  /  perspectives: 각 관점 + 학생이 다뤘는지 감지할 indicators
interface Perspective { question: string; indicators: string[]; }
interface HintSet     { keywords: string[]; perspectives: Perspective[]; }

const HINT_MAP: HintSet[] = [
  {
    keywords: ['자전','공전','지구','태양','달','계절','낮','밤','방향','해'],
    perspectives: [
      { question: '바람의 방향은 어떻게 달라질까?',              indicators: ['바람'] },
      { question: '기후와 계절에는 어떤 변화가 생길까?',          indicators: ['기후','날씨','온도','기온','더위','추위'] },
      { question: '인간의 생활은 어떻게 달라질까?',              indicators: ['생활','사람','인간','우리','문화','도시'] },
      { question: '갑자기 변화하는 경우와 서서히 변화하는 경우는 어떻게 다를까?', indicators: ['갑자기','천천히','속도','서서히','빠르','느리'] },
    ],
  },
  {
    keywords: ['식물','뿌리','줄기','잎','꽃','씨앗','광합성','성장','영양','나무'],
    perspectives: [
      { question: '동물과 인간의 삶에는 어떤 영향이 있을까?',    indicators: ['동물','인간','사람','먹이','식량'] },
      { question: '환경이 달라지면 식물은 어떻게 달라질까?',      indicators: ['환경','기후','온도','물','토양','땅'] },
      { question: '미래에는 어떤 변화가 생길까?',                indicators: ['미래','앞으로','나중에','발전'] },
      { question: '비슷한 원리가 적용되는 다른 생물은 없을까?',  indicators: ['동물','균','버섯','미생물','세균'] },
    ],
  },
  {
    keywords: ['환경','오염','자연','보호','생태','쓰레기','탄소','멸종','숲','플라스틱'],
    perspectives: [
      { question: '경제와 산업에는 어떤 영향이 있을까?',          indicators: ['경제','산업','돈','비용','기업','일자리'] },
      { question: '미래 세대는 어떤 세상을 물려받게 될까?',       indicators: ['미래','후대','세대','아이','자녀'] },
      { question: '개인과 사회 중 누가 더 큰 책임이 있을까?',    indicators: ['책임','개인','사회','정부','나라','법'] },
      { question: '우리가 당장 실천할 수 있는 일은 무엇일까?',   indicators: ['실천','해결','방법','줄이','재활용','바꾸'] },
    ],
  },
  {
    keywords: ['동물','곤충','물고기','포유류','먹이','서식지','적응','진화','생물'],
    perspectives: [
      { question: '환경이 달라지면 어떻게 적응할까?',             indicators: ['적응','환경','변화','달라','살아'] },
      { question: '인간의 활동과는 어떤 관계가 있을까?',          indicators: ['인간','사람','우리','개발','도시'] },
      { question: '먹이사슬에는 어떤 변화가 생길까?',            indicators: ['먹이','먹','사슬','포식','먹히'] },
      { question: '멸종한다면 생태계에 어떤 일이 생길까?',       indicators: ['멸종','사라','없어','줄어'] },
    ],
  },
  {
    keywords: ['물','강','바다','해양','수자원','홍수','가뭄','강수','기온','날씨'],
    perspectives: [
      { question: '사람들의 생활과 식량에는 어떤 영향이 있을까?', indicators: ['생활','식량','농업','먹','음식'] },
      { question: '다른 나라나 지역에서는 상황이 어떻게 다를까?',indicators: ['나라','지역','해외','나라','세계'] },
      { question: '시간이 지날수록 문제가 더 커질까, 작아질까?', indicators: ['시간','앞으로','미래','점점','갈수록'] },
      { question: '인간이 해결할 수 있는 방법은 있을까?',        indicators: ['해결','방법','기술','댐','저장'] },
    ],
  },
];

const DEFAULT_PERSPECTIVES: Perspective[] = [
  { question: '다른 관점에서 보면 어떻게 달라질까?',            indicators: ['관점','입장','시각','다르게'] },
  { question: '시간이 지나면 어떤 변화가 생길까?',              indicators: ['시간','미래','나중','앞으로','변화'] },
  { question: '가장 큰 영향을 받는 대상은 누구(무엇)일까?',     indicators: ['영향','대상','누구','피해','받는'] },
  { question: '찬성하는 입장과 반대하는 입장은 어떻게 다를까?', indicators: ['찬성','반대','입장','의견','생각'] },
];

// ── 분석 함수 ─────────────────────────────────────────────
function countSentences(text: string): number {
  return text.split(/[.!?。]+/).filter(s => s.trim().length > 5).length;
}

function analyzeExplanation(text: string): { covered: string[]; uncovered: string[] } {
  const set = HINT_MAP.find(h => h.keywords.some(k => text.includes(k)));
  const perspectives = set?.perspectives ?? DEFAULT_PERSPECTIVES;

  const covered:   string[] = [];
  const uncovered: string[] = [];
  for (const p of perspectives) {
    if (p.indicators.some(ind => text.includes(ind))) covered.push(p.question);
    else uncovered.push(p.question);
  }
  return { covered, uncovered };
}

// ── 메인 컴포넌트 ─────────────────────────────────────────
export default function ExplorePage() {
  const [classRoom,   setClassRoom]   = useState('');
  const [name,        setName]        = useState('');
  const [question,    setQuestion]    = useState('');
  const [methods,     setMethods]     = useState<string[]>([]);
  const [process,     setProcess]     = useState('');
  const [explanation, setExplanation] = useState('');
  const [insight,     setInsight]     = useState('');

  const trimmed    = explanation.trim();
  const showHelper = trimmed.length >= 150 && countSentences(trimmed) >= 3;
  const { covered, uncovered } = showHelper ? analyzeExplanation(trimmed) : { covered: [], uncovered: [] };

  function toggleMethod(m: string) {
    setMethods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  }

  function handleSubmit() {
    alert('탐구 기록이 작성되었습니다. 다음 단계에서 저장 기능을 연결합니다.');
  }

  return (
    <div className="min-h-screen px-4 pt-2 pb-8"
      style={{ background: '#ffffff', fontFamily: "'Noto Sans KR', '맑은 고딕', sans-serif" }}>
      <div className="max-w-[600px] mx-auto">

        {/* 네비게이션 */}
        <div className="flex items-center mb-1">
          <Link href="/"
            className="text-[#667eea] text-[0.96rem] font-semibold border border-[#667eea]/30 bg-[#667eea]/5 px-[1.1rem] py-[0.41rem] rounded-full hover:bg-[#667eea]/10 transition-colors no-underline">
            ← 홈
          </Link>
        </div>

        {/* 헤더 배너 */}
        <div className="w-full rounded-2xl mb-1.5 px-6 pt-7 pb-6 flex flex-col justify-end"
          style={{ background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)', minHeight: '140px' }}>
          <p className="text-white/60 text-[11px] font-bold tracking-widest uppercase m-0 mb-1">Inquiry Report</p>
          <h1 className="text-white text-2xl font-black leading-tight m-0">탐구 결과 정리</h1>
          <p className="text-white/75 text-sm mt-1 m-0">탐구 과정과 결과를 나만의 말로 기록해 보세요.</p>
        </div>

        {/* 학년/반 · 이름 */}
        <Card>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>학년/반</Label>
              <Select value={classRoom} onChange={e => setClassRoom(e.target.value)}>
                <option value="">학년/반 선택</option>
                {CLASS_LIST.map(v => <option key={v}>{v}</option>)}
              </Select>
            </div>
            <div>
              <Label>이름</Label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="이름"
                className="w-full border-2 border-[#e0e0f0] rounded-xl p-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#667eea] transition-colors" />
            </div>
          </div>
        </Card>

        {/* 탐구 질문 */}
        <Card>
          <Label>탐구 질문</Label>
          <textarea value={question} onChange={e => setQuestion(e.target.value)}
            placeholder="지구의 자전 방향이 바뀌면 어떤 일이 일어날까?"
            className="w-full border-2 border-[#c5c9f0] rounded-xl p-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#667eea] resize-y leading-relaxed transition-colors"
            style={{ minHeight: '80px' }} />
        </Card>

        {/* 탐구 방법 */}
        <Card>
          <Label>탐구 방법 <span className="text-xs font-normal text-[#bbb] ml-1">복수 선택 가능</span></Label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {METHODS.map(m => {
              const checked = methods.includes(m);
              return (
                <button key={m} type="button" onClick={() => toggleMethod(m)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold text-left cursor-pointer transition-all"
                  style={checked
                    ? { background: '#ede9fe', borderColor: '#667eea', color: '#5c35cc' }
                    : { background: '#f8f8fc', borderColor: '#e0e0f0', color: '#666' }}>
                  <span className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors"
                    style={checked ? { borderColor: '#667eea', background: '#667eea' } : { borderColor: '#ccc', background: 'white' }}>
                    {checked && <span className="text-white text-[9px] font-black leading-none">✓</span>}
                  </span>
                  {m}
                </button>
              );
            })}
          </div>
        </Card>

        {/* 탐구 과정에서 중요했던 내용 */}
        <Card>
          <Label>탐구 과정에서 중요했던 내용</Label>
          <p className="text-xs text-[#bbb] mb-2 mt-[-4px]">
            탐구 과정에서 알게 된 사실, 중요했던 자료, 친구들과 나눈 의견 등을 적어 보세요.
          </p>
          <textarea value={process} onChange={e => setProcess(e.target.value)}
            placeholder="탐구 중 알게 된 사실, 중요한 자료, 친구들과 나눈 의견을 자유롭게 기록해 보세요."
            className="w-full border-2 border-[#c5c9f0] rounded-xl p-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#667eea] resize-y leading-relaxed transition-colors"
            style={{ minHeight: '110px' }} />
        </Card>

        {/* 탐구를 통해 설명하기 — 가장 크게 */}
        <Card>
          <Label>탐구를 통해 설명하기</Label>
          <p className="text-xs text-[#bbb] mb-2 mt-[-4px]">
            탐구 질문에 대한 자신의 생각을 근거와 함께 자세히 설명해 보세요.
          </p>
          <textarea value={explanation} onChange={e => setExplanation(e.target.value)}
            placeholder="탐구를 통해 알게 된 내용을 바탕으로, 나의 생각을 근거와 함께 설명해 보세요."
            className="w-full border-2 border-[#c5c9f0] rounded-xl p-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#667eea] resize-y leading-relaxed transition-colors"
            style={{ minHeight: '220px' }} />
          {/* 글자 수 / 문장 수 힌트 */}
          {!showHelper && trimmed.length > 0 && (
            <p className="text-right text-[11px] mt-1 text-[#ccc]">
              {trimmed.length}/150자 · {countSentences(trimmed)}/3문장
            </p>
          )}
        </Card>

        {/* 💡 탐구 도우미 — 150자·3문장 이상 시 자동 표시 */}
        {showHelper && (
          <div className="mb-1.5 rounded-2xl overflow-hidden" style={{ border: '1.5px solid #fde68a' }}>
            {/* 헤더 */}
            <div className="px-4 py-3" style={{ background: '#fffbeb' }}>
              <div className="flex items-center gap-1.5">
                <span className="text-base">💡</span>
                <span className="text-sm font-black text-[#92400e]">탐구 도우미</span>
              </div>
              <p className="text-xs text-[#a37020] mt-0.5 m-0">
                지금까지 탐구한 관점과 더 넓혀볼 수 있는 방향을 보여줍니다.
              </p>
            </div>

            {/* 이미 탐구한 관점 */}
            {covered.length > 0 && (
              <div className="px-4 py-3 border-t" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                <p className="text-[11px] font-bold text-[#166534] mb-2">✓ 이미 탐구한 관점</p>
                <div className="space-y-1.5">
                  {covered.map((q, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#dcfce7' }}>
                      <span className="text-[#16a34a] font-black text-xs shrink-0">✓</span>
                      <p className="text-sm text-[#166534] m-0 leading-relaxed">{q}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 더 탐구해볼 관점 */}
            {uncovered.length > 0 && (
              <div className="px-4 py-3 border-t" style={{ background: 'white', borderColor: '#fde68a' }}>
                <p className="text-[11px] font-bold text-[#92400e] mb-2">→ 아직 탐구하지 않은 관점</p>
                <div className="space-y-1.5">
                  {uncovered.map((q, i) => (
                    <div key={i} className="flex items-start gap-2 px-3 py-2.5 rounded-xl border" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
                      <span className="text-[#f59e0b] font-black text-sm shrink-0 mt-0.5">•</span>
                      <p className="text-sm font-semibold text-[#78350f] m-0 leading-relaxed">{q}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 모두 탐구한 경우 */}
            {uncovered.length === 0 && covered.length > 0 && (
              <div className="px-4 py-3 text-center border-t" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                <p className="text-sm font-bold text-[#166534] m-0">탐구 내용이 매우 풍부해요! 🎉</p>
                <p className="text-xs text-[#4ade80] mt-0.5 m-0">다양한 관점을 모두 담았습니다.</p>
              </div>
            )}
          </div>
        )}

        {/* 새롭게 이해한 점 */}
        <Card>
          <Label>새롭게 이해한 점</Label>
          <p className="text-xs text-[#bbb] mb-2 mt-[-4px]">
            탐구 전과 비교했을 때 새롭게 이해하게 된 점이나 달라진 생각을 적어 보세요.
          </p>
          <textarea value={insight} onChange={e => setInsight(e.target.value)}
            placeholder="탐구 전과 달라진 생각, 새롭게 이해하게 된 점을 적어 보세요."
            className="w-full border-2 border-[#c5c9f0] rounded-xl p-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#667eea] resize-y leading-relaxed transition-colors"
            style={{ minHeight: '110px' }} />
        </Card>

        {/* 제출 버튼 */}
        <button type="button" onClick={handleSubmit}
          className="w-full text-white font-bold text-[0.95rem] py-3.5 rounded-xl border-none cursor-pointer transition-all hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 mb-4"
          style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
          제출하기 →
        </button>

      </div>
    </div>
  );
}

// ── 공통 UI 서브컴포넌트 ─────────────────────────────────
function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-2xl p-3 mb-1.5 shadow-[0_4px_20px_rgba(80,60,160,0.10)]">{children}</div>;
}
function Label({ children }: { children: React.ReactNode }) {
  return <label className="block font-bold text-[#4a4a6a] mb-1.5 text-[0.9rem]">{children}</label>;
}
function Select({ children, value, onChange }: {
  children: React.ReactNode;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <select value={value} onChange={onChange}
      className="w-full border-2 border-[#e0e0f0] rounded-xl p-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#667eea] bg-white cursor-pointer transition-colors appearance-none">
      {children}
    </select>
  );
}
