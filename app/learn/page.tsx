'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

const SUPABASE_URL = 'https://fsrrtopndcrdnqwnspnp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_z7LexdeBdGJqEy5Z8IAyNA_LEGAxPf_';

const CLASS_LIST   = ['3학년 1반','3학년 4반','4학년 4반','6학년 1반','6학년 2반','6학년 3반','6학년 3반 과학','6학년 4반','6학년 5반','6학년 6반'] as const;
const PROJECT_LIST = ['세계는 어떻게 움직이는가','지구와 어떻게 함께 살아갈 것인가','우리는 어떻게 자신을 조직하는가'] as const;

interface Feedback {
  status: string;
  goodPoint: string;
  improvePoint: string;
  secondTitle: string;
  secondContent: string;
  thinkMore: string;
  _fallback?: boolean;
}

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

function buildFeedbackObj(feedback: Feedback) {
  return { goodPoint: feedback.goodPoint, improvePoint: feedback.improvePoint, secondTitle: feedback.secondTitle, secondContent: feedback.secondContent, thinkMore: feedback.thinkMore };
}

async function saveLearning(
  grade: string,
  className: string,
  studentName: string,
  lesson: string,
  content: string,
  feedback: Feedback,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const payload = {
    grade, class_name: className, student_name: studentName, lesson,
    original_content: content,
    original_feedback: buildFeedbackObj(feedback),
    original_status: feedback.status,
    is_revised: false,
    created_at: new Date().toISOString(),
    type: 'learn',
  };
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/learnings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Prefer': 'return=representation' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) { const body = await resp.text(); return { ok: false, error: `HTTP ${resp.status}: ${body}` }; }
    const data = await resp.json();
    return { ok: true, id: data[0]?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function updateLearning(
  id: string,
  content: string,
  feedback: Feedback,
): Promise<{ ok: boolean; error?: string }> {
  const patch = {
    revised_content: content,
    revised_feedback: buildFeedbackObj(feedback),
    revised_status: feedback.status,
    is_revised: true,
  };
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/learnings?id=eq.${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Prefer': 'return=minimal' },
      body: JSON.stringify(patch),
    });
    if (!resp.ok) { const body = await resp.text(); return { ok: false, error: `HTTP ${resp.status}: ${body}` }; }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── 컴포넌트 ─────────────────────────────────────────
export default function LearnPage() {
  const [classRoom,   setClassRoom]   = useState('');
  const [project,     setProject]     = useState('');
  const [name,        setName]        = useState('');
  const [important,   setImportant]   = useState('');
  const [curious,     setCurious]     = useState('');
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState<Feedback | null>(null);
  const [inputError,  setInputError]  = useState('');
  const [saveStatus,  setSaveStatus]  = useState<SaveStatus>('idle');
  const [saveError,   setSaveError]   = useState('');
  const [recordId,    setRecordId]    = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const formRef   = useRef<HTMLDivElement>(null);

  async function handleSubmit() {
    if (!classRoom)      { alert('학년/반을 선택해주세요!'); return; }
    if (!project)        { alert('프로젝트를 선택해주세요!'); return; }
    if (!name.trim())    { alert('이름을 입력해주세요!'); return; }
    if (!important.trim() || !curious.trim()) {
      setInputError('두 항목을 모두 입력해주세요.'); return;
    }
    if ([important, curious].some(v => v.trim().length < 5)) {
      setInputError('각 항목을 조금 더 자세히 작성해주세요.'); return;
    }
    setInputError('');
    setLoading(true);
    setResult(null);

    const content = `[핵심 내용]\n${important.trim()}\n\n[새롭게 알게 된 것·더 궁금한 것]\n${curious.trim()}`;

    let feedback: Feedback;
    try {
      const res  = await fetch('/api/learn-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      feedback = json;
    } catch {
      feedback = {
        status:         '🟡 핵심 개념을 찾아 조금 더 보완해보세요.',
        goodPoint:      '배운 내용의 핵심 개념을 자신의 말로 정리하려고 노력한 점이 잘 드러나요.',
        improvePoint:   '개념들이 서로 어떻게 연결되는지 조금 더 구체적으로 설명해보면 이해가 더 깊어질 거예요.',
        secondTitle:    '🔍 핵심 개념과 연결하기',
        secondContent:  '작성한 내용은 오늘 배운 핵심 개념과 연결해서 생각해볼 수 있어요.',
        thinkMore:      '오늘 배운 핵심 개념을 자신의 말로 다시 한번 설명해볼 수 있나요?',
        _fallback:      true,
      };
    }

    setSaveStatus('saving');
    let saved: { ok: boolean; error?: string };
    if (recordId) {
      saved = await updateLearning(recordId, content, feedback);
    } else {
      const res = await saveLearning(classRoom, '', name.trim(), project, content, feedback);
      if (res.ok && res.id) setRecordId(res.id);
      saved = res;
    }
    if (saved.ok) {
      setSaveStatus('success');
      setSaveError('');
    } else {
      setSaveStatus('error');
      setSaveError(saved.error ?? '알 수 없는 오류');
    }
    setLoading(false);
    setResult(feedback);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }

  function handleRevise() {
    setResult(null);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  function handleComplete() {
    setResult(null);
    setImportant('');
    setCurious('');
    setRecordId(null);
    setSaveStatus('idle');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        <img src="/learn.png" alt="개념학습" className="w-full rounded-2xl mb-1 block" style={{ maxHeight: '220px', objectFit: 'cover' }} />

        {/* 학년/반 + 이름 — 2열 */}
        <div ref={formRef} />
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

        {/* 1·2 통합 카드 */}
        <Card>
          <p className="font-bold text-[#3a3a5a] mb-1.5 text-[0.9rem]">1. 배운 내용 중에 가장 중요한 개념을 정리해보세요.</p>
          <textarea value={important}
            onChange={e => { setImportant(e.target.value.slice(0, 200)); setInputError(''); }}
            placeholder="식물의 뿌리는 물을 흡수하고 줄기는 물을 이동시킨다. 뿌리, 줄기, 잎은 서로 다른 역할을 하지만 식물이 살아가기 위해 함께 작용한다." rows={2} maxLength={200}
            className="w-full border-2 border-[#c5c9f0] rounded-xl p-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#667eea] resize-y leading-relaxed transition-colors"
            style={{ minHeight: '105px' }} />
          <div className={`text-right text-xs mt-0.5 mb-3 ${important.length > 180 ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
            {important.length} / 200
          </div>

          <p className="font-bold text-[#3a3a5a] mb-1.5 text-[0.9rem]">2. 새롭게 알게 된 내용이나 더 궁금한 것은 무엇인가요?</p>
          <textarea value={curious}
            onChange={e => { setCurious(e.target.value.slice(0, 200)); setInputError(''); }}
            placeholder="식물의 뿌리가 다양한 모양이라는 것을 알게 되었다. 뿌리가 물을 충분히 흡수하지 못하면 식물에는 어떤 변화가 나타날까?" rows={2} maxLength={200}
            className="w-full border-2 border-[#c5c9f0] rounded-xl p-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#667eea] resize-y leading-relaxed transition-colors"
            style={{ minHeight: '105px' }} />
          <div className={`text-right text-xs mt-0.5 ${curious.length > 180 ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
            {curious.length} / 200
          </div>
          {inputError && <p className="text-red-600 text-sm mt-1">{inputError}</p>}
          <p className="text-xs text-center text-[#999] mt-2 mb-1">
            작성한 내용을 바탕으로 AI가 여러분의 개념 이해를 점검하고 더 생각해볼 점을 알려줍니다.
          </p>
          <button onClick={handleSubmit} disabled={loading}
            className="mt-1.5 w-full text-white font-bold text-[0.95rem] py-2.5 rounded-xl border-none cursor-pointer bg-gradient-to-br from-[#667eea] to-[#764ba2] hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            {loading ? '점검 중...' : '개념 이해 점검 및 피드백'}
          </button>
        </Card>

        {/* 로딩 */}
        {loading && (
          <div className="text-center text-[#667eea] text-[1.1rem] py-5 animate-pulse">
            AI가 개념 이해를 점검 중이에요...
          </div>
        )}

        {/* 결과 */}
        {result && (
          <div ref={resultRef}
            className="bg-white rounded-[20px] mb-3.5 shadow-[0_4px_24px_rgba(80,60,160,0.13)] overflow-hidden">

            {/* 상태 배너 */}
            <div className="px-5 py-3 flex items-center justify-center"
              style={{
                background: result.status.startsWith('🟢') ? '#e8f5e9' : result.status.startsWith('🔴') ? '#ffebee' : '#fff8e1',
                borderBottom: `2px solid ${result.status.startsWith('🟢') ? '#a5d6a7' : result.status.startsWith('🔴') ? '#ef9a9a' : '#ffe082'}`,
              }}>
              <span className="font-bold text-sm"
                style={{ color: result.status.startsWith('🟢') ? '#2e7d32' : result.status.startsWith('🔴') ? '#c62828' : '#f57f17' }}>
                {result.status}
              </span>
            </div>

            {/* 본문 */}
            <div className="px-5 py-4">
              {saveStatus === 'error' && (
                <div className="bg-[#ffebee] border-l-4 border-[#e53935] p-3 rounded-lg mb-4 text-sm text-[#c62828]">
                  <p className="font-semibold mb-1">⚠️ 저장에 실패했어요.</p>
                  <p className="font-mono text-xs break-all whitespace-pre-wrap">{saveError}</p>
                </div>
              )}
              {result._fallback && (
                <div className="bg-[#fff8e1] border-l-4 border-[#ffc107] p-3 rounded-md mb-4 text-sm text-[#795548]">
                  AI 연결이 잠시 원활하지 않아 기본 피드백으로 보여드릴게요.
                </div>
              )}

              <FeedbackSection title="✓ 잘 이해한 점" titleColor="#2e7d32" bgColor="#f1f8f1" borderColor="#a5d6a7">
                {result.goodPoint}
              </FeedbackSection>

              <FeedbackSection title="△ 보완하면 좋은 점" titleColor="#b45309" bgColor="#fffbf0" borderColor="#fcd34d">
                {result.improvePoint}
              </FeedbackSection>

              <div className="border-t border-[#eeeef8] my-3" />

              <FeedbackSection title="🔍 핵심 개념과 연결하기" titleColor="#5c35cc" bgColor="#f3f0ff" borderColor="#c5b8f0">
                {result.secondContent}
              </FeedbackSection>

              <FeedbackSection title="💡 깊이 생각해보기" titleColor="#1565c0" bgColor="#f0f4ff" borderColor="#90caf9" last>
                {result.thinkMore}
              </FeedbackSection>

              <div className="mt-4">
                {result.status.startsWith('🟢') ? (
                  <button onClick={handleComplete}
                    className="w-full font-bold text-[0.95rem] py-2.5 rounded-xl border-none cursor-pointer transition-all"
                    style={{ background: '#e8f5e9', color: '#2e7d32' }}>
                    ✓ 완료하기
                  </button>
                ) : (
                  <button onClick={handleRevise}
                    className="w-full font-bold text-[0.95rem] py-2.5 rounded-xl border-none cursor-pointer transition-all"
                    style={{ background: '#fff8e1', color: '#f57f17' }}>
                    ✏️ 수정하기
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── 공통 UI 서브컴포넌트 ─────────────────────────────
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
function FeedbackSection({ title, children, last = false, titleColor = '#4a4a6a', bgColor = '#f8f8ff', borderColor = '#e0e0f0' }: {
  title: string;
  children: React.ReactNode;
  last?: boolean;
  titleColor?: string;
  bgColor?: string;
  borderColor?: string;
}) {
  return (
    <div className={last ? '' : 'mb-4'}>
      <h3 className="text-sm font-bold mb-1.5" style={{ color: titleColor }}>{title}</h3>
      <div className="text-sm text-[#444] leading-relaxed p-3 rounded-lg"
        style={{ background: bgColor, borderLeft: `3px solid ${borderColor}` }}>
        {children}
      </div>
    </div>
  );
}
