'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

const SUPABASE_URL = 'https://fsrrtopndcrdnqwnspnp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_z7LexdeBdGJqEy5Z8IAyNA_LEGAxPf_';

interface Feedback {
  praise: string;
  understood: string;
  nextStep: string;
  _fallback?: boolean;
}

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

async function saveLearning(
  grade: string,
  className: string,
  studentName: string,
  lesson: string,
  content: string,
  feedback: Feedback,
): Promise<{ ok: boolean; error?: string }> {
  const feedbackToSave = { praise: feedback.praise, understood: feedback.understood, nextStep: feedback.nextStep };
  const payload = {
    grade,
    class_name: className,
    student_name: studentName,
    lesson,
    content,
    feedback: feedbackToSave,   // jsonb 컬럼: 객체 그대로 전송
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

export default function LearnPage() {
  const [grade,       setGrade]       = useState('');
  const [className,   setClassName]   = useState('');
  const [studentName, setStudentName] = useState('');
  const [lesson,      setLesson]      = useState('');
  const [content,     setContent]     = useState('');
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState<Feedback | null>(null);
  const [error,       setError]       = useState('');
  const [saveStatus,  setSaveStatus]  = useState<SaveStatus>('idle');
  const [saveError,   setSaveError]   = useState('');
  const resultRef = useRef<HTMLDivElement>(null);

  async function handleSubmit() {
    if (!grade)              { setError('학년을 선택해주세요.'); return; }
    if (!className)          { setError('반을 선택해주세요.'); return; }
    if (!studentName.trim()) { setError('이름을 입력해주세요.'); return; }
    if (!lesson)             { setError('수업을 선택해주세요.'); return; }
    if (!content.trim())     { setError('배운 내용을 작성해주세요.'); return; }
    if (content.trim().length < 10) { setError('배운 내용을 조금 더 자세히 작성해주세요.'); return; }

    setError('');
    setLoading(true);
    setResult(null);

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
        praise:     '오늘 배운 내용을 직접 말로 정리해보려고 노력했어요. 정말 잘했어요!',
        understood: '배운 내용의 핵심을 자신의 말로 표현하려고 한 점이 훌륭해요.',
        nextStep:   '"왜 그럴까?", "만약 다르다면?" 같은 질문을 스스로 던져보면 오늘 배운 내용을 더 깊이 이해할 수 있어요.',
        _fallback:  true,
      };
    }

    setSaveStatus('saving');
    const saved = await saveLearning(grade, className, studentName.trim(), lesson, content, feedback);
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

        {/* 헤더 배너 */}
        <div className="rounded-2xl mb-3 text-white text-center py-6 px-5"
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <h1 className="text-2xl font-bold mb-2">🌱 디핑배움</h1>
          <p className="text-sm leading-relaxed" style={{ opacity: 0.92 }}>
            오늘 배운 핵심 개념을 내 말로 정리해보세요.<br />
            새롭게 알게 된 점, 이해한 점, 더 궁금한 점을 포함해<br />
            3~5줄 정도로 써보세요.
          </p>
        </div>

        {/* 오류 메시지 */}
        {error && (
          <div className="bg-[#ffebee] border-l-4 border-[#e53935] p-3 rounded-xl mb-2 text-sm text-[#c62828] font-semibold">
            ⚠️ {error}
          </div>
        )}

        {/* 학년 + 반 — 2열 */}
        <Card>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>학년</Label>
              <Select value={grade} onChange={e => { setGrade(e.target.value); setError(''); }}>
                <option value="">학년 선택</option>
                {['3학년', '4학년', '5학년', '6학년'].map(v => <option key={v}>{v}</option>)}
              </Select>
            </div>
            <div>
              <Label>반</Label>
              <Select value={className} onChange={e => { setClassName(e.target.value); setError(''); }}>
                <option value="">반 선택</option>
                {['1반', '2반', '3반', '4반', '5반', '6반'].map(v => <option key={v}>{v}</option>)}
              </Select>
            </div>
          </div>
        </Card>

        {/* 이름 */}
        <Card>
          <Label>이름</Label>
          <input type="text" value={studentName}
            onChange={e => { setStudentName(e.target.value); setError(''); }}
            placeholder="이름을 입력하세요"
            className="w-full border-2 border-[#e0e0f0] rounded-xl p-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#667eea] transition-colors" />
        </Card>

        {/* 수업 선택 */}
        <Card>
          <Label>수업</Label>
          <Select value={lesson} onChange={e => { setLesson(e.target.value); setError(''); }}>
            <option value="">수업을 선택하세요</option>
            {[
              '세계는 어떻게 움직이는가',
              '지구와 어떻게 함께 살아갈 것인가',
              '우리는 어떻게 자신을 조직하는가',
            ].map(v => <option key={v}>{v}</option>)}
          </Select>
        </Card>

        {/* 배운 내용 */}
        <Card>
          <Label>배운 내용</Label>
          <textarea
            value={content}
            onChange={e => { setContent(e.target.value); setError(''); }}
            placeholder="오늘 배운 내용 중 새롭게 알게 된 점이나 이해한 내용을 적어보세요."
            rows={6}
            className="w-full border-2 border-[#e0e0f0] rounded-xl p-3 text-base text-gray-700 focus:outline-none focus:border-[#667eea] resize-y leading-relaxed transition-colors"
            style={{ minHeight: '150px' }}
          />
          <button onClick={handleSubmit} disabled={loading}
            className="mt-3 w-full text-white font-bold text-[1rem] py-3 rounded-xl border-none cursor-pointer hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            {loading ? '피드백 받는 중...' : '배움 제출하기 🌱'}
          </button>
        </Card>

        {/* 로딩 */}
        {loading && (
          <div className="text-center text-[#667eea] text-[1.1rem] py-5 animate-pulse">
            AI가 피드백을 작성 중이에요...
          </div>
        )}

        {/* 결과 */}
        {result && (
          <div ref={resultRef}
            className="bg-white rounded-[20px] p-6 mb-3.5 shadow-[0_4px_24px_rgba(80,60,160,0.13)] border-l-4 border-[#667eea]">
            <h2 className="text-xl font-bold text-[#4a4a6a] mb-4">🌱 AI 피드백</h2>

            {/* 저장 상태 — 결과 카드 최상단에 항상 표시 */}
            {saveStatus === 'saving' && (
              <div className="bg-[#e3f2fd] border-l-4 border-[#1e88e5] p-3 rounded-lg mb-4 text-sm text-[#1565c0] font-semibold">
                💾 저장 중...
              </div>
            )}
            {saveStatus === 'success' && (
              <div className="bg-[#e8f5e9] border-l-4 border-[#43a047] p-3 rounded-lg mb-4 text-sm text-[#2e7d32] font-semibold">
                ✅ 배움이 저장되었어요!
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="bg-[#ffebee] border-l-4 border-[#e53935] p-3 rounded-lg mb-4 text-sm text-[#c62828]">
                <p className="font-semibold mb-1">⚠️ 저장에 실패했어요.</p>
                <p className="font-mono text-xs break-all whitespace-pre-wrap">{saveError}</p>
                <p className="text-xs mt-1 text-[#795548]">브라우저 콘솔(F12 → Console)에서 [saveLearning] 로그를 확인해주세요.</p>
              </div>
            )}

            {result._fallback && (
              <div className="bg-[#fff8e1] border-l-4 border-[#ffc107] p-3 rounded-md mb-4 text-sm text-[#795548]">
                AI 연결이 잠시 원활하지 않아 기본 피드백으로 보여드릴게요.
              </div>
            )}

            <FeedbackSection title="👏 칭찬">
              <p className="text-[#555] leading-[1.7] m-0 bg-[#f8f8ff] p-3 rounded-lg">{result.praise}</p>
            </FeedbackSection>

            <FeedbackSection title="🌱 잘 이해한 점">
              <p className="text-[#555] leading-[1.7] m-0 bg-[#f8f8ff] p-3 rounded-lg">{result.understood}</p>
            </FeedbackSection>

            <FeedbackSection title="🔍 한 걸음 더" last>
              <p className="text-[#555] leading-[1.7] m-0 bg-[#f8f8ff] p-3 rounded-lg">{result.nextStep}</p>
            </FeedbackSection>
          </div>
        )}

      </div>
    </div>
  );
}

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
