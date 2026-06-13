'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const CLASS_LIST   = ['3학년 1반','3학년 4반','4학년 4반','6학년 1반','6학년 2반','6학년 3반','6학년 3반 과학','6학년 4반','6학년 5반','6학년 6반'] as const;
const PROJECT_LIST = ['세계는 어떻게 움직이는가','지구와 어떻게 함께 살아갈 것인가','우리는 어떻게 자신을 조직하는가'] as const;
const METHODS      = ['자료 조사','생성형 AI 활용','토론','관찰·실험','사례 분석','기타'] as const;

function countSentences(text: string): number {
  return text.split(/[.!?。]+/).filter(s => s.trim().length > 5).length;
}

export default function ExplorePage() {
  const [classRoom,    setClassRoom]    = useState('');
  const [name,         setName]         = useState('');
  const [project,      setProject]      = useState('');
  const [question,     setQuestion]     = useState('');
  const [method,       setMethod]        = useState('');
  const [process,      setProcess]      = useState('');
  const [explanation,  setExplanation]  = useState('');
  const [insight,      setInsight]      = useState('');

  const [strength,     setStrength]     = useState('');
  const [hints,        setHints]        = useState<string[]>([]);
  const [loadingHints, setLoadingHints] = useState(false);

  const trimmed    = explanation.trim();
  const showHelper = trimmed.length >= 100 && countSentences(trimmed) >= 3;

  useEffect(() => {
    if (!showHelper) {
      setStrength('');
      setHints([]);
      setLoadingHints(false);
      return;
    }
    setLoadingHints(true);
    const timer = setTimeout(async () => {
      try {
        const res  = await fetch('/api/inquiry-hint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ explanation: trimmed }),
        });
        const data = await res.json();
        setStrength(typeof data.strength === 'string' ? data.strength : '');
        setHints(Array.isArray(data.hints) ? data.hints : []);
      } catch {
        setHints([]);
      } finally {
        setLoadingHints(false);
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [explanation, showHelper]);

  function handleSubmit() {
    if (!classRoom)   { alert('학년/반을 선택해주세요!'); return; }
    if (!project)     { alert('프로젝트를 선택해주세요!'); return; }
    if (!name.trim()) { alert('이름을 입력해주세요!'); return; }
    alert('탐구 기록이 작성되었습니다. 다음 단계에서 저장 기능을 연결합니다.');
  }

  return (
    <div className="min-h-screen px-4 pt-2 pb-8"
      style={{ background: '#ffffff', fontFamily: "'Noto Sans KR', '맑은 고딕', sans-serif" }}>
      <div className="max-w-[600px] mx-auto">

        {/* 네비게이션 */}
        <div className="flex justify-between items-center mb-1">
          <Link href="/"
            className="text-[#667eea] text-[0.96rem] font-semibold border border-[#667eea]/30 bg-[#667eea]/5 px-[1.1rem] py-[0.41rem] rounded-full hover:bg-[#667eea]/10 transition-colors no-underline">
            ← 홈
          </Link>
        </div>

        {/* 배너 이미지 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/explore.png" alt="탐구 결과 정리" className="w-full rounded-2xl mb-1 block"
          style={{ maxHeight: '220px', objectFit: 'cover' }} draggable={false} />

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

        {/* 프로젝트 — Select (learn·question 페이지와 동일) */}
        <Card>
          <Label>프로젝트</Label>
          <Select value={project} onChange={e => setProject(e.target.value)}>
            <option value="">프로젝트를 선택하세요</option>
            {PROJECT_LIST.map(v => <option key={v}>{v}</option>)}
          </Select>
        </Card>

        {/* 탐구 질문(좌) + 탐구 방법 토글(우) */}
        <Card>
          <div className="grid grid-cols-2 gap-3 items-start">

            {/* 좌: 탐구 질문 */}
            <div className="flex flex-col">
              <Label>탐구 질문</Label>
              <textarea value={question} onChange={e => setQuestion(e.target.value)}
                placeholder="지구의 자전 방향이 바뀌면 어떤 일이 일어날까?"
                className="w-full border-2 border-[#c5c9f0] rounded-xl p-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#667eea] resize-none leading-relaxed transition-colors"
                style={{ minHeight: '90px' }} />
            </div>

            {/* 우: 탐구 방법 드롭다운 */}
            <div>
              <Label>탐구 방법</Label>
              <Select value={method} onChange={e => setMethod(e.target.value)}>
                <option value="">선택해주세요</option>
                {METHODS.map(v => <option key={v}>{v}</option>)}
              </Select>
            </div>

          </div>
        </Card>

        {/* 탐구 과정에서 중요했던 내용 */}
        <Card>
          <Label>1. 탐구 과정에서 중요했던 내용은 무엇인가요?</Label>
          <textarea value={process} onChange={e => setProcess(e.target.value)}
            placeholder="탐구 중 알게 된 사실, 중요한 자료, 친구들과 나눈 의견을 자유롭게 기록해 보세요."
            className="w-full border-2 border-[#c5c9f0] rounded-xl p-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#667eea] resize-y leading-relaxed transition-colors"
            style={{ minHeight: '88px' }} />
        </Card>

        {/* 탐구를 통해 설명하기 */}
        <Card>
          <Label>2. 탐구를 통해 알게 된 점을 설명해 보세요.</Label>
          <textarea value={explanation} onChange={e => setExplanation(e.target.value)}
            placeholder="탐구를 통해 알게 된 내용을 바탕으로, 나의 생각을 근거와 함께 설명해 보세요."
            className="w-full border-2 border-[#c5c9f0] rounded-xl p-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#667eea] resize-y leading-relaxed transition-colors"
            style={{ minHeight: '220px' }} />
          {!showHelper && trimmed.length > 0 && (
            <p className="text-right text-[11px] mt-1 text-[#ccc]">
              {trimmed.length}/100자 · {countSentences(trimmed)}/3문장
            </p>
          )}
        </Card>

        {/* 🔍 깊이 있는 탐구 */}
        {showHelper && (
          <div className="mb-1.5 rounded-2xl overflow-hidden" style={{ border: '1.5px solid #fde68a' }}>
            <div className="px-4 py-3" style={{ background: '#fffbeb' }}>
              <div className="flex items-center gap-1.5">
                <span className="text-base">🔍</span>
                <span className="text-sm font-black text-[#92400e]">깊이 있는 탐구</span>
              </div>
            </div>
            <div className="px-4 py-3 border-t space-y-2" style={{ background: 'white', borderColor: '#fde68a' }}>
              {loadingHints ? (
                <div className="flex items-center gap-2 py-1">
                  <span className="inline-block w-4 h-4 border-2 border-[#f59e0b] border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-[#a37020]">분석 중...</span>
                </div>
              ) : (strength || hints.length > 0) ? (
                <>
                  {strength && (
                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl" style={{ background: '#f0fdf4' }}>
                      <span className="text-[#16a34a] font-black text-sm shrink-0 mt-0.5">✓</span>
                      <p className="text-sm text-[#166534] m-0 leading-relaxed">{strength}</p>
                    </div>
                  )}
                  {hints.map((q, i) => (
                    <div key={i} className="flex items-start gap-2 px-3 py-2.5 rounded-xl border"
                      style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
                      <span className="text-[#f59e0b] font-black text-sm shrink-0 mt-0.5">•</span>
                      <p className="text-sm font-semibold text-[#78350f] m-0 leading-relaxed">{q}</p>
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-xs text-[#ccc] m-0 py-1">분석 중 문제가 생겼어요. 계속 작성해보세요.</p>
              )}
            </div>
          </div>
        )}

        {/* 새롭게 이해한 점 */}
        <Card>
          <Label>3. 탐구를 통해 어떻게 생각이 달라졌나요?</Label>
          <textarea value={insight} onChange={e => setInsight(e.target.value)}
            placeholder="탐구 전과 달라진 생각, 새롭게 이해하게 된 점을 적어 보세요."
            className="w-full border-2 border-[#c5c9f0] rounded-xl p-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#667eea] resize-y leading-relaxed transition-colors"
            style={{ minHeight: '110px' }} />
        </Card>

        {/* 제출 버튼 */}
        <button type="button" onClick={handleSubmit}
          className="mt-1.5 w-full text-white font-bold text-[0.95rem] py-2.5 rounded-xl border-none cursor-pointer transition-all hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 mb-4"
          style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
          제출하기 →
        </button>

      </div>
    </div>
  );
}

// ── 공통 UI ─────────────────────────────────────────────
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
