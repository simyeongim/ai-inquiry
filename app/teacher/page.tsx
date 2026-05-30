'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const SUPABASE_URL = 'https://fsrrtopndcrdnqwnspnp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_z7LexdeBdGJqEy5Z8IAyNA_LEGAxPf_';
const TEACHER_PIN  = '1234'; // 필요 시 이 값을 변경하세요

const CLASS_LIST = ['3학년 1반','3학년 4반','4학년 4반','6학년 1반','6학년 2반','6학년 3반','6학년 3반 과학','6학년 4반','6학년 5반','6학년 6반'];
const PROJECT_LIST = ['세계는 어떻게 움직이는가','지구와 어떻게 함께 살아갈 것인가','우리는 어떻게 자신을 조직하는가'];

const LEVEL_INFO = {
  1: { emoji: '🟢', short: '1단계', label: '단순 사실 확인', color: '#2e7d32', bg: '#e8f5e9' },
  2: { emoji: '🔵', short: '2단계', label: '개념 이해',      color: '#1565c0', bg: '#e3f2fd' },
  3: { emoji: '🟠', short: '3단계', label: '비교/조건/영향', color: '#e65100', bg: '#fff3e0' },
  4: { emoji: '🔴', short: '4단계', label: '가치판단/토론',  color: '#c62828', bg: '#ffebee' },
} as const;

interface QuestionRow {
  id: number;
  class_room: string;
  project: string;
  name: string;
  question: string;
  analysis: { level: number; label: string; emoji: string; summary: string } | null;
  time: string;
}

// ─── 인증 화면 ────────────────────────────────────────
function PinScreen({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');

  function submit() {
    if (pin === TEACHER_PIN) { onSuccess(); }
    else { setErr('비밀번호가 올바르지 않습니다.'); setPin(''); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="bg-white rounded-2xl p-8 w-80 shadow-xl">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔒</div>
          <h1 className="text-xl font-bold text-[#4a4a6a]">교사용 대시보드</h1>
          <p className="text-[#888] text-sm mt-1">비밀번호를 입력하세요</p>
        </div>
        <input
          type="password" value={pin}
          onChange={e => { setPin(e.target.value); setErr(''); }}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="비밀번호"
          className="w-full border-2 border-[#e0e0f0] rounded-xl p-3 text-base focus:outline-none focus:border-[#667eea] mb-2"
          autoFocus
        />
        {err && <p className="text-red-500 text-sm mb-2">{err}</p>}
        <button onClick={submit}
          className="w-full py-3 rounded-xl text-white font-bold cursor-pointer border-none"
          style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
          확인
        </button>
        <div className="text-center mt-4">
          <Link href="/question" className="text-[#667eea] text-sm hover:underline">
            ← 학생 화면으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── 대시보드 본체 ────────────────────────────────────
export default function TeacherPage() {
  const [authed,         setAuthed]         = useState(false);
  const [filterClass,    setFilterClass]    = useState('');
  const [filterProject,  setFilterProject]  = useState('');
  const [filterLevel,    setFilterLevel]    = useState('');
  const [rows,           setRows]           = useState<QuestionRow[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [fetchError,     setFetchError]     = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    let url = `${SUPABASE_URL}/rest/v1/questions?select=*&order=id.desc&limit=500`;
    if (filterClass)   url += `&class_room=eq.${encodeURIComponent(filterClass)}`;
    if (filterProject) url += `&project=eq.${encodeURIComponent(filterProject)}`;
    try {
      const res = await fetch(url, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setFetchError('데이터를 불러오지 못했습니다. 네트워크를 확인해 주세요.');
      setRows([]);
      console.error(e);
    }
    setLoading(false);
  }, [filterClass, filterProject]);

  useEffect(() => { if (authed) fetchData(); }, [authed, fetchData]);

  if (!authed) return <PinScreen onSuccess={() => setAuthed(true)} />;

  // 레벨 필터 적용 (클라이언트 측 필터링)
  const displayed = filterLevel
    ? rows.filter(r => String(r.analysis?.level) === filterLevel)
    : rows;

  const levelCounts = ([1, 2, 3, 4] as const).map(l => ({
    ...LEVEL_INFO[l],
    level: l,
    count: rows.filter(r => r.analysis?.level === l).length,
  }));

  return (
    <div className="min-h-screen pb-16"
      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', fontFamily: "'Noto Sans KR', '맑은 고딕', sans-serif" }}>
      <div className="max-w-[960px] mx-auto px-4">

        {/* 헤더 */}
        <div className="text-center text-white pt-8 pb-8 relative">
          <Link href="/question"
            className="absolute top-6 left-0 text-white/80 text-sm font-semibold bg-white/10 border border-white/30 px-4 py-1.5 rounded-full hover:bg-white/20 transition-colors no-underline">
            ← 학생 화면
          </Link>
          <h1 className="text-3xl font-bold m-0">📊 교사용 대시보드</h1>
          <p className="text-white/80 mt-1.5 mb-0 text-sm">학생 탐구 질문 현황</p>
        </div>

        {/* 필터 */}
        <div className="bg-white rounded-2xl p-5 mb-4 shadow-lg">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-[#4a4a6a] text-sm mb-1.5">학년/반</label>
              <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
                className="w-full border-2 border-[#e0e0f0] rounded-xl p-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#667eea] bg-white">
                <option value="">전체</option>
                {CLASS_LIST.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-bold text-[#4a4a6a] text-sm mb-1.5">프로젝트</label>
              <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
                className="w-full border-2 border-[#e0e0f0] rounded-xl p-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#667eea] bg-white">
                <option value="">전체</option>
                {PROJECT_LIST.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-bold text-[#4a4a6a] text-sm mb-1.5">질문 수준</label>
              <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
                className="w-full border-2 border-[#e0e0f0] rounded-xl p-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#667eea] bg-white">
                <option value="">전체</option>
                {([1,2,3,4] as const).map(l => (
                  <option key={l} value={l}>{LEVEL_INFO[l].emoji} {LEVEL_INFO[l].short} {LEVEL_INFO[l].label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[#888] text-sm">
              {filterLevel ? `${displayed.length}개 표시 (전체 ${rows.length}개)` : `총 ${rows.length}개`}
            </span>
            <button onClick={fetchData}
              className="text-sm text-white px-4 py-1.5 rounded-full cursor-pointer border-none hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
              새로고침
            </button>
          </div>
          {fetchError && <p className="text-red-500 text-sm mt-2">{fetchError}</p>}
        </div>

        {/* 수준별 통계 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {levelCounts.map(({ level, emoji, short, label, color, bg, count }) => (
            <button key={level}
              onClick={() => setFilterLevel(filterLevel === String(level) ? '' : String(level))}
              className="rounded-2xl p-4 text-center shadow-lg cursor-pointer border-2 transition-all"
              style={{
                background: filterLevel === String(level) ? bg : 'white',
                borderColor: filterLevel === String(level) ? color : 'transparent',
              }}>
              <div className="text-2xl mb-1">{emoji}</div>
              <div className="text-2xl font-bold" style={{ color }}>{count}</div>
              <div className="text-xs font-bold mt-0.5" style={{ color }}>{short}</div>
              <div className="text-xs text-[#888] mt-0.5">{label}</div>
            </button>
          ))}
        </div>

        {/* 질문 목록 */}
        <div className="bg-white rounded-2xl p-5 shadow-lg">
          <h2 className="text-base font-bold text-[#4a4a6a] mb-4">
            질문 목록
            {filterLevel && (
              <span className="ml-2 text-sm font-normal text-[#888]">
                — {LEVEL_INFO[Number(filterLevel) as 1|2|3|4].short} 필터 중
                <button onClick={() => setFilterLevel('')} className="ml-1 text-[#667eea] cursor-pointer bg-none border-none text-sm">✕</button>
              </span>
            )}
          </h2>

          {loading ? (
            <p className="text-center text-[#888] py-10 text-sm">불러오는 중...</p>
          ) : displayed.length === 0 ? (
            <p className="text-center text-[#888] py-10 text-sm">조건에 맞는 질문이 없습니다.</p>
          ) : (
            <div className="space-y-2.5">
              {displayed.map(row => {
                const level = row.analysis?.level as 1|2|3|4 | undefined;
                const info  = level ? LEVEL_INFO[level] : null;
                return (
                  <div key={row.id}
                    className="border border-[#e8e8f0] rounded-xl p-4 hover:border-[#667eea] transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[#222] font-medium text-sm leading-relaxed m-0 mb-2">
                          {row.question}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#999]">
                          <span>👤 {row.name}</span>
                          <span>🏫 {row.class_room}</span>
                          <span>📁 {row.project}</span>
                          <span>🕐 {row.time}</span>
                        </div>
                      </div>
                      {info && (
                        <span className="shrink-0 text-xs font-bold px-2.5 py-1.5 rounded-full whitespace-nowrap"
                          style={{ background: info.bg, color: info.color }}>
                          {info.emoji} {info.short}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
