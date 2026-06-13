'use client';

import { useState } from 'react';
import Link from 'next/link';

const CLASS_LIST = ['3학년 1반','3학년 4반','4학년 4반','6학년 1반','6학년 2반','6학년 3반','6학년 3반 과학','6학년 4반','6학년 5반','6학년 6반'] as const;

const METHODS = [
  '자료 조사',
  '생성형 AI 활용',
  '친구와 토론',
  '영상 시청',
  '관찰·실험',
  '사례 분석',
  '기타',
] as const;

const MOCK_PERSPECTIVES = [
  '환경에는 어떤 영향이 있을까?',
  '사람들의 생활은 어떻게 달라질까?',
  '동물과 식물은 어떤 영향을 받을까?',
  '갑자기 변화하는 경우와 천천히 변화하는 경우는 같을까?',
];

export default function ExplorePage() {
  const [classRoom,   setClassRoom]   = useState('');
  const [name,        setName]        = useState('');
  const [question,    setQuestion]    = useState('');
  const [methods,     setMethods]     = useState<string[]>([]);
  const [process,     setProcess]     = useState('');
  const [explanation, setExplanation] = useState('');
  const [insight,     setInsight]     = useState('');
  const [showExpand,  setShowExpand]  = useState(false);

  function toggleMethod(m: string) {
    setMethods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  }

  function handleExpand() {
    setShowExpand(true);
    setTimeout(() => document.getElementById('expand-card')?.scrollIntoView({ behavior: 'smooth' }), 100);
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
        </Card>

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

        {/* 버튼 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button type="button" onClick={handleExpand}
            className="w-full font-bold text-[0.95rem] py-3 rounded-xl border-2 cursor-pointer transition-all hover:opacity-90"
            style={{ background: '#f3f0ff', color: '#667eea', borderColor: '#667eea' }}>
            🔭 탐구 넓히기
          </button>
          <button type="button" onClick={handleSubmit}
            className="w-full text-white font-bold text-[0.95rem] py-3 rounded-xl border-none cursor-pointer transition-all hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0"
            style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
            제출하기 →
          </button>
        </div>

        {/* 탐구 넓히기 mock 카드 */}
        {showExpand && (
          <div id="expand-card"
            className="rounded-2xl p-5 mb-4 shadow-[0_4px_24px_rgba(80,60,160,0.13)]"
            style={{ background: 'white', border: '1.5px solid #e8e4ff' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🔭</span>
              <h3 className="font-black text-[#4a3a8a] text-[0.95rem] m-0">더 생각해 볼 수 있는 관점</h3>
            </div>
            <div className="space-y-2">
              {MOCK_PERSPECTIVES.map((p, i) => (
                <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl"
                  style={{ background: '#f3f0ff' }}>
                  <span className="font-black text-sm shrink-0 mt-0.5" style={{ color: '#667eea' }}>Q.</span>
                  <p className="text-sm font-semibold m-0 leading-relaxed" style={{ color: '#4a3a8a' }}>{p}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

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
