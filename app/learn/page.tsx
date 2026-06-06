'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

const SUPABASE_URL = 'https://fsrrtopndcrdnqwnspnp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_z7LexdeBdGJqEy5Z8IAyNA_LEGAxPf_';

const CLASS_LIST   = ['3학년 1반','3학년 4반','4학년 4반','6학년 1반','6학년 2반','6학년 3반','6학년 3반 과학','6학년 4반','6학년 5반','6학년 6반'] as const;
const PROJECT_LIST = ['세계는 어떻게 움직이는가','지구와 어떻게 함께 살아갈 것인가','우리는 어떻게 자신을 조직하는가'] as const;

interface Feedback {
  wellUnderstood: string;
  needsWork: string;
  deeperQuestion: string;
  _fallback?: boolean;
}

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

// ── saveLearning: 수정 금지 ───────────────────────────
async function saveLearning(
  grade: string,
  className: string,
  studentName: string,
  lesson: string,
  content: string,
  feedback: Feedback,
): Promise<{ ok: boolean; error?: string }> {
  const feedbackToSave = { wellUnderstood: feedback.wellUnderstood, needsWork: feedback.needsWork, deeperQuestion: feedback.deeperQuestion };
  const payload = {
    grade,
    class_name: className,
    student_name: studentName,
    lesson,
    content,
    feedback: feedbackToSave,
    created_at: new Date().toISOString(),
    type: 'learn',
  };

  console.log('[saveLearning] 호출됨 — payload:', payload);

  let resp: Response;
  try {
    resp = await fetch(`${SUPABASE_URL}/rest/v1/learnings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[saveLearning] 네트워크 오류:', msg);
    return { ok: false, error: `네트워크 오류: ${msg}` };
  }

  console.log('[saveLearning] HTTP 응답 상태:', resp.status, resp.statusText);

  if (!resp.ok) {
    let body = '';
    try { body = await resp.text(); } catch { /* ignore */ }
    console.error(`[saveLearning] 저장 실패 — HTTP ${resp.status}:`, body);
    return { ok: false, error: `HTTP ${resp.status}: ${body}` };
  }

  console.log('[saveLearning] 저장 성공');
  return { ok: true };
}

// ── 컴포넌트 ─────────────────────────────────────────
export default function LearnPage() {
  const [classRoom,   setClassRoom]   = useState('');
  const [project,     setProject]     = useState('');
  const [name,        setName]        = useState('');
  const [learned,     setLearned]     = useState('');
  const [important,   setImportant]   = useState('');
  const [curious,     setCurious]     = useState('');
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState<Feedback | null>(null);
  const [inputError,  setInputError]  = useState('');
  const [saveStatus,  setSaveStatus]  = useState<SaveStatus>('idle');
  const [saveError,   setSaveError]   = useState('');
  const resultRef = useRef<HTMLDivElement>(null);

  async function handleSubmit() {
    if (!classRoom)      { alert('학년/반을 선택해주세요!'); return; }
    if (!project)        { alert('프로젝트를 선택해주세요!'); return; }
    if (!name.trim())    { alert('이름을 입력해주세요!'); return; }
    if (!learned.trim() || !important.trim() || !curious.trim()) {
      setInputError('세 항목을 모두 입력해주세요.'); return;
    }
    if ([learned, important, curious].some(v => v.trim().length < 5)) {
      setInputError('각 항목을 조금 더 자세히 작성해주세요.'); return;
    }
    setInputError('');
    setLoading(true);
    setResult(null);

    const content = `[새롭게 알게 된 개념]\n${learned.trim()}\n\n[가장 중요한 핵심 내용]\n${important.trim()}\n\n[더 알아보고 싶은 질문]\n${curious.trim()}`;

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
        wellUnderstood: '배운 내용을 자신의 말로 정리하려고 노력한 점이 훌륭해요!',
        needsWork:      '개념들 사이의 연결 관계를 조금 더 구체적으로 설명해보면 이해가 더 깊어질 거예요.',
        deeperQuestion: '"왜 그럴까?", "만약 달라진다면?" 같은 질문을 스스로 던져보면 오늘 배운 내용을 더 깊이 탐구할 수 있어요.',
        _fallback:      true,
      };
    }

    setSaveStatus('saving');
    // classRoom 전체를 grade로 전달, class_name은 빈 문자열
    const saved = await saveLearning(classRoom, '', name.trim(), project, content, feedback);
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

  return (
    <div className="min-h-screen px-4 pt-3 pb-8"
      style={{ background: '#ffffff', fontFamily: "'Noto Sans KR', '맑은 고딕', sans-serif" }}>
      <div className="max-w-[600px] mx-auto">

        {/* 네비게이션 */}
        <div className="flex justify-between items-center mb-2">
          <Link href="/"
            className="text-[#667eea] text-[0.96rem] font-semibold border border-[#667eea]/30 bg-[#667eea]/5 px-[1.1rem] py-[0.41rem] rounded-full hover:bg-[#667eea]/10 transition-colors no-underline">
            ← 홈
          </Link>
        </div>

        {/* 배너 이미지 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/learn.png" alt="개념학습" className="w-full rounded-2xl mb-2 block" style={{ maxHeight: '280px', objectFit: 'contain' }} />

        {/* 학년/반 + 이름 — 2열 */}
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

        {/* 1. 새롭게 알게 된 것 */}
        <Card>
          <p className="font-bold text-[#3a3a5a] mb-2 text-[1rem]">1. 새롭게 알게 된 것은 무엇인가요?</p>
          <textarea value={learned}
            onChange={e => { setLearned(e.target.value.slice(0, 200)); setInputError(''); }}
            placeholder="식물의 뿌리는 땅속의 물을 흡수하고, 줄기는 그 물이 잎까지 이동할 수 있는 통로 역할을 한다." rows={2} maxLength={200}
            className="w-full border-2 border-[#c5c9f0] rounded-xl p-3 text-base text-gray-700 focus:outline-none focus:border-[#667eea] resize-y leading-relaxed transition-colors"
            style={{ minHeight: '70px' }} />
          <div className={`text-right text-sm mt-1 ${learned.length > 180 ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
            {learned.length} / 200
          </div>
        </Card>

        {/* 2. 가장 중요하다고 생각한 것 */}
        <Card>
          <p className="font-bold text-[#3a3a5a] mb-2 text-[1rem]">2. 가장 중요하다고 생각한 것은 무엇인가요?</p>
          <textarea value={important}
            onChange={e => { setImportant(e.target.value.slice(0, 200)); setInputError(''); }}
            placeholder="뿌리, 줄기, 잎은 각각 다른 일을 하지만 식물이 살아가기 위해 서로 연결되어 있다는 점이 중요하다." rows={2} maxLength={200}
            className="w-full border-2 border-[#c5c9f0] rounded-xl p-3 text-base text-gray-700 focus:outline-none focus:border-[#667eea] resize-y leading-relaxed transition-colors"
            style={{ minHeight: '70px' }} />
          <div className={`text-right text-sm mt-1 ${important.length > 180 ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
            {important.length} / 200
          </div>
        </Card>

        {/* 3. 더 알아보고 싶은 것 */}
        <Card>
          <p className="font-bold text-[#3a3a5a] mb-2 text-[1rem]">3. 배운 내용과 관련해 더 알아보고 싶은 것은 무엇인가요?</p>
          <textarea value={curious}
            onChange={e => { setCurious(e.target.value.slice(0, 200)); setInputError(''); }}
            placeholder="뿌리가 물을 충분히 흡수하지 못하면 줄기와 잎에는 어떤 변화가 나타날까?" rows={2} maxLength={200}
            className="w-full border-2 border-[#c5c9f0] rounded-xl p-3 text-base text-gray-700 focus:outline-none focus:border-[#667eea] resize-y leading-relaxed transition-colors"
            style={{ minHeight: '70px' }} />
          <div className={`text-right text-sm mt-1 ${curious.length > 180 ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
            {curious.length} / 200
          </div>
          {inputError && <p className="text-red-600 text-sm mt-1.5">{inputError}</p>}
          <p className="text-xs text-center text-[#999] mt-3 mb-1 leading-relaxed">
            작성한 내용을 바탕으로<br />AI가 여러분의 개념 이해를 점검하고 더 생각해볼 점을 알려줍니다.
          </p>
          <button onClick={handleSubmit} disabled={loading}
            className="mt-2 w-full text-white font-bold text-[1rem] py-3 rounded-xl border-none cursor-pointer bg-gradient-to-br from-[#667eea] to-[#764ba2] hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
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
            className="bg-white rounded-[20px] p-6 mb-3.5 shadow-[0_4px_24px_rgba(80,60,160,0.13)] border-l-4 border-[#667eea]">
            <h2 className="text-xl font-bold text-[#4a4a6a] mb-4">개념 이해 점검 결과</h2>

            {/* 저장 상태 */}
            {saveStatus === 'saving' && (
              <div className="bg-[#e3f2fd] border-l-4 border-[#1e88e5] p-3 rounded-lg mb-4 text-sm text-[#1565c0] font-semibold">
                💾 저장 중...
              </div>
            )}
            {saveStatus === 'success' && (
              <div className="bg-[#e8f5e9] border-l-4 border-[#43a047] p-3 rounded-lg mb-4 text-sm text-[#2e7d32] font-semibold">
                ✅ 저장되었어요!
              </div>
            )}
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

            <FeedbackSection title="✅ 잘 이해한 개념">
              <p className="text-[#555] leading-[1.7] m-0 bg-[#f8f8ff] p-3 rounded-lg">{result.wellUnderstood}</p>
            </FeedbackSection>

            <FeedbackSection title="💡 보완하면 좋은 개념">
              <p className="text-[#555] leading-[1.7] m-0 bg-[#f8f8ff] p-3 rounded-lg">{result.needsWork}</p>
            </FeedbackSection>

            <FeedbackSection title="🔍 더 깊은 탐구 질문" last>
              <p className="text-[#555] leading-[1.7] m-0 bg-[#f8f8ff] p-3 rounded-lg">{result.deeperQuestion}</p>
            </FeedbackSection>
          </div>
        )}

      </div>
    </div>
  );
}

// ── 공통 UI 서브컴포넌트 ─────────────────────────────
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
function FeedbackSection({ title, children, last = false }: {
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={last ? '' : 'mb-5'}>
      <h3 className="text-[#4a4a6a] text-base font-bold mb-2.5">{title}</h3>
      {children}
    </div>
  );
}
