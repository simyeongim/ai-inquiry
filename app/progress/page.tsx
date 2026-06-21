'use client';

import { useState } from 'react';
import Link from 'next/link';

const CLASS_LIST   = ['3학년 1반','3학년 4반','4학년 4반','6학년 1반','6학년 2반','6학년 3반','6학년 3반 과학','6학년 4반','6학년 5반','6학년 6반'] as const;
const PROJECT_LIST = ['세계는 어떻게 움직이는가','지구와 어떻게 함께 살아갈 것인가','우리는 어떻게 자신을 조직하는가'] as const;

const PLACEHOLDER = '학교에 나무를 더 심고 학급별로 돌보면 좋겠습니다.\n운동장에 해시계를 설치하면 좋겠습니다.';

export default function ProgressPage() {
  const [classRoom, setClassRoom] = useState('');
  const [name,      setName]      = useState('');
  const [project,   setProject]   = useState('');
  const [idea,      setIdea]      = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    if (!classRoom)      { alert('학년/반을 선택해주세요!'); return; }
    if (!name.trim())    { alert('이름을 입력해주세요!'); return; }
    if (!project)        { alert('프로젝트를 선택해주세요!'); return; }
    if (!idea.trim())    { alert('아이디어를 입력해주세요!'); return; }
    if (idea.trim().length < 5) { alert('아이디어를 조금 더 자세히 적어주세요.'); return; }
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleReset() {
    setIdea('');
    setSubmitted(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="min-h-screen px-4 pt-2 pb-8"
      style={{ background: '#ffffff', fontFamily: "'Noto Sans KR', '맑은 고딕', sans-serif" }}>
      <div className="max-w-[600px] mx-auto">

        {/* 네비게이션 */}
        <div className="flex justify-between items-center mb-2">
          <Link href="/"
            className="text-[#667eea] text-[0.96rem] font-semibold border border-[#667eea]/30 bg-[#667eea]/5 px-[1.1rem] py-[0.41rem] rounded-full hover:bg-[#667eea]/10 transition-colors no-underline">
            ← 홈
          </Link>
        </div>

        {/* 헤더 배너 */}
        <div className="rounded-2xl mb-2 px-5 py-7 text-center"
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <p className="text-white/70 text-[0.7rem] font-bold tracking-widest uppercase mb-1.5">DEEP · P</p>
          <h1 className="text-white text-[1.6rem] font-black mb-2 leading-tight">확장 공유</h1>
          <p className="text-white/90 text-[0.88rem] leading-relaxed m-0">
            탐구를 통해 알게 된 내용을 바탕으로<br />새로운 아이디어나 실천 방법을 나누어 보세요.
          </p>
        </div>

        {/* 학년/반 + 이름 */}
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
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="이름 입력"
                className="w-full border-2 border-[#e0e0f0] rounded-xl p-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#667eea] transition-colors" />
            </div>
          </div>
        </Card>

        {/* 프로젝트 */}
        <Card>
          <Label>프로젝트</Label>
          <Select value={project} onChange={e => setProject(e.target.value)}>
            <option value="">프로젝트를 선택하세요</option>
            {PROJECT_LIST.map(v => <option key={v}>{v}</option>)}
          </Select>
        </Card>

        {/* 아이디어 입력 */}
        <Card>
          <Label>탐구를 바탕으로 어떤 아이디어를 나누고 싶나요?</Label>
          <textarea
            value={idea}
            onChange={e => setIdea(e.target.value.slice(0, 300))}
            placeholder={PLACEHOLDER}
            rows={5}
            maxLength={300}
            className="w-full border-2 border-[#c5c9f0] rounded-xl p-3 text-base text-gray-700 focus:outline-none focus:border-[#667eea] resize-y leading-relaxed transition-colors"
            style={{ minHeight: '140px' }}
          />
          <div className={`text-right text-xs mt-1 ${idea.length > 270 ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
            {idea.length} / 300
          </div>
          <button onClick={handleSubmit}
            className="mt-3 w-full text-white font-bold text-[1rem] py-3 rounded-xl border-none cursor-pointer bg-gradient-to-br from-[#667eea] to-[#764ba2] hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 transition-all">
            아이디어 공유하기 ✨
          </button>
        </Card>

        {/* 제출 완료 */}
        {submitted && (
          <div className="bg-white rounded-[20px] p-6 mb-3.5 shadow-[0_4px_24px_rgba(80,60,160,0.13)] border-l-4 border-[#667eea]">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🎉</div>
              <h2 className="text-xl font-black text-[#4a4a6a] mb-1">아이디어가 공유되었어요!</h2>
              <p className="text-[#888] text-sm m-0">친구들에게 좋은 아이디어를 나눠줘서 고마워요.</p>
            </div>
            <div className="bg-[#f8f8ff] border-l-[3px] border-[#667eea] px-4 py-3 rounded-r-lg mb-4">
              <p className="text-[#333] text-sm leading-relaxed m-0 whitespace-pre-wrap">{idea}</p>
            </div>
            <button onClick={handleReset}
              className="w-full font-bold text-[0.95rem] py-2.5 rounded-xl border-none cursor-pointer transition-all"
              style={{ background: '#ede9fe', color: '#5c35cc' }}>
              다른 아이디어 공유하기
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

// ── 공통 UI ─────────────────────────────────────────────
function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-2xl p-4 mb-2 shadow-[0_4px_20px_rgba(80,60,160,0.10)]">{children}</div>;
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
