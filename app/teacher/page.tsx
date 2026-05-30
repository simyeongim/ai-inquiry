'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';

const SUPABASE_URL = 'https://fsrrtopndcrdnqwnspnp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_z7LexdeBdGJqEy5Z8IAyNA_LEGAxPf_';
const TEACHER_PIN  = '1234teacher';

const CLASS_LIST    = ['3학년 1반','3학년 4반','4학년 4반','6학년 1반','6학년 2반','6학년 3반','6학년 3반 과학','6학년 4반','6학년 5반','6학년 6반'] as const;
const PROJECT_LIST  = ['세계는 어떻게 움직이는가','지구와 어떻게 함께 살아갈 것인가','우리는 어떻게 자신을 조직하는가'] as const;
const LEVEL_OPTS    = [1, 2, 3, 4] as const;
type  Level         = 1 | 2 | 3 | 4;

const LV: Record<Level, { emoji: string; short: string; label: string; color: string; bg: string }> = {
  1: { emoji:'🟢', short:'1단계', label:'단순 사실 확인', color:'#2e7d32', bg:'#e8f5e9' },
  2: { emoji:'🔵', short:'2단계', label:'개념 이해',      color:'#1565c0', bg:'#e3f2fd' },
  3: { emoji:'🟠', short:'3단계', label:'비교/조건/영향', color:'#e65100', bg:'#fff3e0' },
  4: { emoji:'🔴', short:'4단계', label:'가치판단/토론',  color:'#c62828', bg:'#ffebee' },
};

// ─── 키워드 추출 ─────────────────────────────────────
const SW = new Set([
  // 의문사·부사
  '왜','어떻게','무엇','언제','어디','누가','어떤','얼마나','어느','만약','혹시','과연','정말','매우','아주','너무','많이','잘','못','꼭','모두','각각',
  // 지시어
  '이런','그런','저런','같은','다른','이것','그것','이거','그거','저것','저거',
  // 조사 단독형
  '은','는','이','가','을','를','의','에','로','도','만','와','과','랑','하고',
  // 보조동사·형용사 어간 (1자·2자 모두)
  '있','없','되','하','않','못','알','봐','해','살','나','오','가','크','작','많','적',
  '있는','없는','있을','없을','되는','하는','있어','없어','있고','없고',
  // 동사 복합 어간 (벌어지다·달라지다·사라지다 어간 및 변형)
  '달라','사라','이어','벌어','바뀌','생겨','변해','없어져','달라져','사라져',
  '늘어','줄어','멀어','가까','굳어','서서','되어','해져',
  '달라질','사라질','벌어질','없어질','이어질','바뀔','생겨날','멈추',
  '살아가려','살아가','살아','우선되어야','우선되','필요할까','필요할',
  // 의미 없는 명사
  '것','때','곳','점','수','들','후','전','중','안','밖','위','속','옆','사이',
  // 질문 형식 잔류형
  '무엇인','무엇일','무엇이','어떤지','어떨까','어떤가','어디서','어디에','왜냐','왜냐면',
  '그래서','따라서','하지만','그러나','그리고','또한',
  // 질문 도우미 명사 (내용 없는 경우)
  '나요','까요','뭔가','뭔지','어떤','어떻','있나','없나','할수',
  // 단음절 대명사
  '나','너','저','우리','그','그녀',
]);
const ENDS = [
  // 길이 순 — 긴 것부터 (반복 normalize에서 greedy 매칭)
  '는걸까요','는건가요','는건데요','는건지요',
  '하나요','인가요','일까요','될까요','할까요','을까요','는가요','는지요',
  '이에요','거예요','된건가요','겠어요','겠죠','겠지요',
  '습니다','ㅂ니다','입니다','합니다','됩니다',
  '이라는','이라고','이라서','이라면','이란','이라','이며','이고','이지',
  '라는','라고','라서','란','나요','까요','어요','아요','에요',
  '일까','을까','는가','인가','는지','인지','이죠','죠','요',
  '어질','아질','이질',          // 벌어질·달라질·사라질 등 복합 동사 변형
  '지','고','며','서','면','지만',
  '할','까','려',                // 단독 어미 (필요할까, 벌어질까, 살아가려 등)
];
const PTCL = ['에서는','으로서','으로써','에서도','에서','으로','이나','에게','한테','에서의','으로의','과의','와의','은','는','이','가','을','를','의','에','로','도','만','와','과'];

function normalize(w: string): string {
  let prev = '';
  while (prev !== w) {
    prev = w;
    for (const e of ENDS) if (w.endsWith(e) && w.length > e.length) { w = w.slice(0, -e.length); break; }
    for (const p of PTCL) if (w.endsWith(p) && w.length > p.length) { w = w.slice(0, -p.length); break; }
  }
  return w;
}

function kws(text: string, max = 8): string[] {
  return text.replace(/[?!.,~？！。「」[\]()]/g, ' ').split(/\s+/).filter(w => w.length > 0)
    .map(normalize)
    .filter(w => w.length >= 2 && !SW.has(w))
    .filter(w => !/[했됐졌갔왔겠았었]$/.test(w))
    .filter(w => !/[할건텐]$/.test(w))
    .filter(w => !/[을를이가은는]$/.test(w))
    .filter((w, i, a) => a.indexOf(w) === i)
    .slice(0, max);
}

function topicLabel(kw: string, qs: Row[]): string {
  // 그룹 내 2개 이상 질문에 공통으로 등장하는 키워드가 있으면 "A와 B" 형태
  const freq: Record<string, number> = {};
  qs.forEach(r => kws(r.question, 10).forEach(w => {
    if (w !== kw && w.length >= 2) freq[w] = (freq[w] ?? 0) + 1;
  }));
  const partner = Object.entries(freq).sort((a, b) => b[1] - a[1]).find(([, c]) => c >= 2);
  if (!partner) return kw;
  const code = kw.charCodeAt(kw.length - 1);
  const hasJong = code >= 0xAC00 && (code - 0xAC00) % 28 !== 0;
  return `${kw}${hasJong ? '과 ' : '와 '}${partner[0]}`;
}

interface Row { id: number; class_room: string; project: string; name: string; question: string; analysis: { level: number; label: string; emoji: string; summary: string } | null; time: string; }

// ─── 비밀번호 화면 ────────────────────────────────────
function PinScreen({ onOk }: { onOk: () => void }) {
  const [v, setV] = useState('');
  const [err, setErr] = useState('');
  function go() { if (v === TEACHER_PIN) onOk(); else { setErr('비밀번호가 올바르지 않습니다.'); setV(''); } }
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'linear-gradient(135deg,#667eea,#764ba2)' }}>
      <div className="bg-white rounded-2xl p-8 w-80 shadow-xl">
        <div className="text-center mb-6"><div className="text-4xl mb-2">🔒</div>
          <h1 className="text-xl font-bold text-[#4a4a6a]">교사용 대시보드</h1>
          <p className="text-[#888] text-sm mt-1">비밀번호를 입력하세요</p>
        </div>
        <input type="password" value={v} onChange={e=>{setV(e.target.value);setErr('');}} onKeyDown={e=>e.key==='Enter'&&go()} placeholder="비밀번호" autoFocus className="w-full border-2 border-[#e0e0f0] rounded-xl p-3 text-base focus:outline-none focus:border-[#667eea] mb-2"/>
        {err && <p className="text-red-500 text-sm mb-2">{err}</p>}
        <button onClick={go} className="w-full py-3 rounded-xl text-white font-bold cursor-pointer border-none" style={{background:'linear-gradient(135deg,#667eea,#764ba2)'}}>확인</button>
        <div className="text-center mt-4"><Link href="/question" className="text-[#667eea] text-sm hover:underline">← 학생 화면으로</Link></div>
      </div>
    </div>
  );
}

// ─── 필터 토글 버튼 그룹 ───────────────────────────────
function Pills({ label, opts, sel, onToggle, getLabel, getStyle }: {
  label: string; opts: readonly (string|number)[]; sel: (string|number)[];
  onToggle: (v: string|number) => void; getLabel: (v: string|number) => string;
  getStyle?: (v: string|number) => { color: string; bg: string } | undefined;
}) {
  return (
    <div>
      <div className="text-xs font-bold text-[#999] uppercase tracking-wider mb-2">{label}</div>
      <div className="flex flex-wrap gap-2">
        {opts.map(o => {
          const on = sel.includes(o); const s = getStyle?.(o);
          return (
            <button key={String(o)} onClick={()=>onToggle(o)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border-2 transition-all cursor-pointer"
              style={on ? {background:s?.bg??'#e8eaf6', color:s?.color??'#667eea', borderColor:s?.color??'#667eea'} : {background:'white', color:'#777', borderColor:'#e0e0e0'}}>
              {getLabel(o)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── 메인 대시보드 ────────────────────────────────────
export default function TeacherPage() {
  const [authed,   setAuthed]   = useState(false);
  const [fClass,   setFClass]   = useState<string[]>([]);
  const [fProject, setFProject] = useState<string[]>([]);
  const [fLevel,   setFLevel]   = useState<number[]>([]);
  const [rows,     setRows]     = useState<Row[]>([]);
  const [sel,      setSel]      = useState<Set<number>>(new Set());
  const [loading,  setLoading]  = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fetchErr, setFetchErr] = useState('');
  const [searchName, setSearchName] = useState('');
  const [aiReport,  setAiReport]  = useState<{ report: string; deepQuestions: string[]; suggestions: string[] } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setFetchErr('');
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/questions?select=*&order=id.desc&limit=1000`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      setRows(Array.isArray(d) ? d : []);
    } catch { setFetchErr('데이터를 불러오지 못했습니다.'); setRows([]); }
    setLoading(false);
  }, []);

  useEffect(() => { if (authed) load(); }, [authed, load]);

  async function generateAiReport() {
    if (!filtered.length || !stats) return;
    setAiLoading(true);
    try {
      const body = {
        questions:   filtered.map(r => r.question),
        topKeywords: stats.topKw.map(([k]) => k),
        levelDist:   Object.fromEntries(LEVEL_OPTS.map(l => [l, stats.lvDist.find(d => d.l === l)?.cnt ?? 0])),
        avg:         stats.avg,
        topicGroups: stats.groups.map(g => ({ topic: g.label, questions: g.qs.map(r => r.question) })),
      };
      const res = await fetch('/api/teacher-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      setAiReport(await res.json());
    } catch { alert('AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'); }
    setAiLoading(false);
  }

  function tog<T>(a: T[], v: T): T[] { return a.includes(v) ? a.filter(x=>x!==v) : [...a,v]; }
  function clearFilters() { setFClass([]); setFProject([]); setFLevel([]); }
  const hasFilter = fClass.length > 0 || fProject.length > 0 || fLevel.length > 0;

  const filtered = useMemo(() => rows.filter(r => {
    if (fClass.length   && !fClass.includes(r.class_room))           return false;
    if (fProject.length && !fProject.includes(r.project))            return false;
    if (fLevel.length   && !fLevel.includes(r.analysis?.level ?? 0)) return false;
    return true;
  }), [rows, fClass, fProject, fLevel]);

  const displayed = useMemo(() => {
    const q = searchName.trim();
    if (!q) return filtered;
    return filtered.filter(r => r.name.includes(q));
  }, [filtered, searchName]);

  useEffect(() => { setAiReport(null); }, [filtered]);

  function toggleOne(id: number) { setSel(p => { const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; }); }
  function toggleAll() {
    const all = displayed.length > 0 && displayed.every(r => sel.has(r.id));
    setSel(all ? new Set() : new Set(displayed.map(r => r.id)));
  }

  async function deleteRows(ids: number[]) {
    if (!ids.length || !confirm(`${ids.length}개의 질문을 삭제하시겠습니까?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/questions?id=in.(${ids.join(',')})`, {
        method: 'DELETE',
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Prefer: 'return=minimal' },
      });
      if (!res.ok) throw new Error();
      setRows(p => p.filter(r => !ids.includes(r.id)));
      setSel(p => { const n=new Set(p); ids.forEach(id=>n.delete(id)); return n; });
    } catch { alert('삭제에 실패했습니다.\nSupabase 대시보드에서 DELETE 정책을 확인해 주세요.'); }
    setDeleting(false);
  }

  // ─── 분석 계산 ──────────────────────────────────────
  const stats = useMemo(() => {
    const n = filtered.length;
    if (!n) return null;

    const lvDist = LEVEL_OPTS.map(l => ({ ...LV[l], l, cnt: filtered.filter(r => r.analysis?.level === l).length }));
    const maxC   = Math.max(...lvDist.map(d => d.cnt), 1);
    const avg    = filtered.reduce((s, r) => s + (r.analysis?.level ?? 1), 0) / n;
    const highPct = Math.round(lvDist.filter(d => d.l >= 3).reduce((s,d) => s+d.cnt, 0) / n * 100);

    // 핵심어 빈도 (최대 5개)
    const freq: Record<string,number> = {};
    filtered.forEach(r => kws(r.question, 8).forEach(k => { freq[k] = (freq[k]??0)+1; }));
    const topKw  = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0, 5);
    const maxKw  = topKw[0]?.[1] ?? 1;

    // IDF: 각 키워드가 몇 개 질문에 등장하는지 (document frequency)
    const df: Record<string, number> = {};
    filtered.forEach(r => {
      const ks = new Set(kws(r.question, 10));
      ks.forEach(k => { df[k] = (df[k] ?? 0) + 1; });
    });
    // 2개 이상 질문에 등장한 키워드만 주제 후보로 허용
    const topicCandidates = new Set(Object.keys(df).filter(k => df[k] >= 2));

    // 각 질문의 대표 주제 = 후보 키워드 중 df 가장 낮은 것(가장 구별력 있는 것)
    function primaryKw(r: Row): string | null {
      const ks = kws(r.question, 10).filter(k => topicCandidates.has(k));
      if (!ks.length) return null;
      return ks.reduce((best, k) => {
        if (df[k] < df[best]) return k;
        if (df[k] === df[best] && k.length > best.length) return k; // 동점이면 긴 단어 우선
        return best;
      });
    }

    // 대표 주제별로 질문 묶기 → 최대 3그룹
    const topicMap: Record<string, Row[]> = {};
    filtered.forEach(r => {
      const t = primaryKw(r);
      if (t) { if (!topicMap[t]) topicMap[t] = []; topicMap[t].push(r); }
    });
    const groups = Object.entries(topicMap)
      .filter(([, qs]) => qs.length >= 2)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 3)
      .map(([kw, qs]) => ({ label: topicLabel(kw, qs), kw, qs }));

    // 대표 추천 (높은 단계 우선)
    const reco = [...filtered].sort((a,b)=>(b.analysis?.level??1)-(a.analysis?.level??1)).slice(0,5);

    return { lvDist, maxC, avg, highPct, topKw, maxKw, groups, reco, n };
  }, [filtered]);

  if (!authed) return <PinScreen onOk={() => setAuthed(true)} />;

  const selInFil = displayed.filter(r => sel.has(r.id));
  const allChecked = displayed.length > 0 && displayed.every(r => sel.has(r.id));

  return (
    <div className="min-h-screen pb-16" style={{ background:'#f0f2f8', fontFamily:"'Noto Sans KR','맑은 고딕',sans-serif" }}>

      {/* 헤더 */}
      <div className="sticky top-0 z-20 text-white py-4 px-5 shadow-md relative flex items-center"
        style={{ background:'linear-gradient(135deg,#667eea,#764ba2)' }}>
        <Link href="/question" className="text-white/80 text-sm bg-white/10 border border-white/30 px-3 py-1.5 rounded-full hover:bg-white/20 no-underline transition-colors shrink-0">← 학생 화면</Link>
        <h1 className="text-lg font-bold m-0 absolute left-1/2 -translate-x-1/2">📊 교사용 질문 분석</h1>
        <div className="ml-auto shrink-0">
          <button onClick={load} disabled={loading}
            className="text-sm bg-white/20 border border-white/30 text-white px-4 py-1.5 rounded-full cursor-pointer hover:bg-white/30 disabled:opacity-50 transition-colors">
            {loading ? '로딩...' : '새로고침'}
          </button>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 pt-5 space-y-4">

        {/* ── 필터 ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[#4a4a6a] text-sm m-0">🔍 필터 <span className="font-normal text-[#bbb]">(다중 선택 가능)</span></h2>
            {hasFilter && <button onClick={clearFilters} className="text-xs text-[#667eea] border-none bg-transparent cursor-pointer font-semibold hover:underline">초기화</button>}
          </div>
          <div className="space-y-4">
            <Pills label="학년/반"   opts={CLASS_LIST}   sel={fClass}   onToggle={v=>setFClass(tog(fClass,v as string))}   getLabel={v=>v as string}/>
            <Pills label="프로젝트"  opts={PROJECT_LIST} sel={fProject} onToggle={v=>setFProject(tog(fProject,v as string))} getLabel={v=>v as string}/>
            <Pills label="질문 수준" opts={LEVEL_OPTS}   sel={fLevel}   onToggle={v=>setFLevel(tog(fLevel,v as number))}
              getLabel={v=>`${LV[v as Level].emoji} ${LV[v as Level].short}`} getStyle={v=>LV[v as Level]}/>
          </div>
          {fetchErr && <p className="text-red-500 text-sm mt-3">{fetchErr}</p>}
        </div>

        {/* ── 분석 영역 ─────────────────────────────────── */}
        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* 질문 현황 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-[#4a4a6a] text-sm mb-5">📈 질문 현황</h2>

              {/* 요약 카드 3개 */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                <div className="rounded-xl p-3 text-center" style={{background:'#f0f2f8'}}>
                  <div className="text-[10px] text-[#999] mb-1">총 질문</div>
                  <div className="text-2xl font-black text-[#4a4a6a]">{stats.n}<span className="text-xs font-normal ml-0.5">개</span></div>
                </div>
                <div className="rounded-xl p-3 text-center" style={{background:'linear-gradient(135deg,#667eea18,#764ba218)'}}>
                  <div className="text-[10px] text-[#999] mb-1">평균 단계</div>
                  <div className="text-2xl font-black" style={{color:'#667eea'}}>{stats.avg.toFixed(1)}<span className="text-xs font-normal ml-0.5">단계</span></div>
                </div>
                <div className="rounded-xl p-3 text-center" style={{background: stats.highPct >= 50 ? '#e8f5e9' : '#f0f2f8'}}>
                  <div className="text-[10px] text-[#999] mb-1">3·4단계</div>
                  <div className="text-2xl font-black" style={{color: stats.highPct >= 50 ? '#2e7d32' : '#9e9e9e'}}>{stats.highPct}<span className="text-xs font-normal ml-0.5">%</span></div>
                </div>
              </div>

              {/* 수준 분포 */}
              <div className="mb-5">
                <div className="mb-3">
                  <span className="text-sm font-semibold text-[#555]">수준 분포</span>
                </div>
                <div className="space-y-2">
                  {stats.lvDist.map(({ l, emoji, short, color, cnt }) => (
                    <div key={l} className="flex items-center gap-2">
                      <span className="text-xs w-16 shrink-0 font-medium" style={{color}}>{emoji} {short}</span>
                      <div className="flex-1 bg-[#f0f2f8] rounded-full h-5 overflow-hidden">
                        <div className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                          style={{width:`${Math.max(cnt>0?6:0,(cnt/stats.maxC)*100)}%`, background:color}}>
                          {cnt > 0 && <span className="text-white text-[10px] font-bold">{cnt}</span>}
                        </div>
                      </div>
                      <span className="text-xs text-[#bbb] w-5 text-right shrink-0">{cnt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 핵심어 */}
              <div className="mb-5">
                <div className="text-sm font-semibold text-[#555] mb-2">많이 나온 핵심어</div>
                {stats.topKw.length === 0
                  ? <p className="text-xs text-[#ccc]">핵심어 없음</p>
                  : (
                    <div className="flex flex-wrap gap-2">
                      {stats.topKw.map(([kw, cnt]) => (
                        <span key={kw} className="px-2.5 py-1 rounded-full font-semibold"
                          style={{background:'#e8eaf6', color:'#3949ab', fontSize:`${Math.min(0.88,0.64+(cnt/stats.maxKw)*0.24)}rem`}}>
                          {kw} <span className="opacity-50 text-[10px]">×{cnt}</span>
                        </span>
                      ))}
                    </div>
                  )}
              </div>

              {/* 유사질문 묶음 */}
              <div>
                <div className="text-sm font-semibold text-[#555] mb-2">유사질문 묶음</div>
                {stats.groups.length === 0
                  ? <p className="text-xs text-[#ccc]">유사 질문 그룹 없음</p>
                  : (
                    <div className="space-y-2.5">
                      {stats.groups.map(({ label, kw, qs }) => (
                        <div key={kw} className="bg-[#f8f9ff] rounded-xl p-3">
                          <div className="text-xs font-bold text-[#667eea] mb-1.5">🔗 {label} ({qs.length}개)</div>
                          <ul className="space-y-1">
                            {qs.slice(0,3).map(q => (
                              <li key={q.id} className="text-xs text-[#555] flex gap-1">
                                <span className="text-[#ddd] shrink-0">·</span><span>{q.question}</span>
                              </li>
                            ))}
                            {qs.length > 3 && <li className="text-xs text-[#bbb]">외 {qs.length-3}개</li>}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            </div>

            {/* 수업 활용 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-[#4a4a6a] text-sm m-0">💡 수업 활용</h2>
                <button onClick={generateAiReport} disabled={aiLoading || !stats}
                  className="text-sm px-4 py-2 rounded-full border-none cursor-pointer font-bold text-white disabled:opacity-50 transition-all"
                  style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
                  {aiLoading ? '분석 중…' : aiReport ? '↺ 다시 분석' : '🤖 분석 생성'}
                </button>
              </div>

              {!aiReport && !aiLoading && (
                <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3">
                  <span className="text-4xl">🤖</span>
                  <p className="text-sm text-[#bbb] text-center m-0 leading-relaxed">분석 생성을 누르면<br/>AI가 수업 설계를 도와드립니다.</p>
                </div>
              )}

              {aiLoading && (
                <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3">
                  <span className="text-3xl animate-spin">⚙️</span>
                  <p className="text-sm text-[#aaa] text-center m-0 animate-pulse">AI가 질문을 분석하고 있습니다…</p>
                </div>
              )}

              {aiReport && !aiLoading && (
                <div className="space-y-5">

                  {/* 질문 분석 리포트 */}
                  <div className="rounded-xl p-4" style={{background:'linear-gradient(135deg,#667eea0d,#764ba20d)', border:'1.5px solid #667eea30'}}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-base">📋</span>
                      <span className="text-base font-black text-[#667eea]">질문 분석 리포트</span>
                    </div>
                    <p className="text-[15px] text-[#2a2a3a] leading-relaxed m-0">{aiReport.report}</p>
                  </div>

                  {/* 대표 탐구 질문 */}
                  {aiReport.deepQuestions.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-base">⭐</span>
                        <span className="text-base font-black text-[#d97706]">대표 탐구 질문</span>
                      </div>
                      <div className="space-y-2.5">
                        {aiReport.deepQuestions.slice(0, 2).map((q, i) => (
                          <div key={i} className="rounded-xl p-4 flex gap-3 items-start"
                            style={{background:'#fffbeb', border:'1.5px solid #fde68a'}}>
                            <span className="text-base font-black text-[#f59e0b] shrink-0 leading-tight mt-0.5">{i + 1}</span>
                            <p className="text-[15px] text-[#333] leading-snug m-0 font-semibold">{q}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 다음 차시 활동 제안 */}
                  {aiReport.suggestions.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-base">🗓</span>
                        <span className="text-base font-black text-[#059669]">다음 차시 활동 제안</span>
                      </div>
                      <div className="space-y-2.5">
                        {aiReport.suggestions.slice(0, 2).map((s, i) => (
                          <div key={i} className="rounded-xl p-4 flex gap-3 items-center"
                            style={{background:'#f0fdf4', border:'1.5px solid #86efac'}}>
                            <span className="text-[#059669] font-black text-sm shrink-0">▶</span>
                            <p className="text-[15px] text-[#166534] leading-snug m-0 font-bold">{s}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 질문 목록 ──────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="font-bold text-[#4a4a6a] text-sm m-0 flex items-center gap-2">
                📝 질문 목록
                <span className="font-bold text-xs text-white px-2 py-0.5 rounded-full" style={{background:'#667eea'}}>{displayed.length}개</span>
              </h2>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#bbb] text-xs">👤</span>
                <input
                  type="text" value={searchName} onChange={e=>setSearchName(e.target.value)}
                  placeholder="작성자 검색..."
                  className="pl-7 pr-3 py-1.5 text-xs border-2 border-[#e0e0f0] rounded-full focus:outline-none focus:border-[#667eea] w-36"
                />
                {searchName && (
                  <button onClick={()=>setSearchName('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#bbb] hover:text-[#555] border-none bg-transparent cursor-pointer text-xs p-0 leading-none">✕</button>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {displayed.length > 0 && (
                <button onClick={toggleAll}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full border-2 cursor-pointer transition-all"
                  style={allChecked
                    ? {background:'#e8eaf6', color:'#667eea', borderColor:'#667eea'}
                    : {background:'white', color:'#777', borderColor:'#e0e0e0'}}>
                  {allChecked ? '전체 선택 해제' : '전체 선택'}
                </button>
              )}
              {displayed.length > 0 && (
                <button onClick={()=>deleteRows(selInFil.length > 0 ? selInFil.map(r=>r.id) : displayed.map(r=>r.id))} disabled={deleting}
                  className="text-xs text-white bg-red-400 hover:bg-red-500 px-3 py-1.5 rounded-full border-none cursor-pointer font-semibold disabled:opacity-50 transition-colors">
                  삭제{selInFil.length > 0 ? ` (${selInFil.length})` : ''}
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <p className="text-center text-[#ccc] py-10 text-sm">불러오는 중...</p>
          ) : displayed.length === 0 ? (
            <p className="text-center text-[#ccc] py-10 text-sm">조건에 맞는 질문이 없습니다.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {displayed.map(row => {
                const lv   = (row.analysis?.level ?? 1) as Level;
                const info = LV[lv];
                const on   = sel.has(row.id);
                return (
                  <div key={row.id} onClick={()=>toggleOne(row.id)}
                    className="border-2 rounded-xl p-4 cursor-pointer transition-colors"
                    style={{borderColor:on?'#667eea':'#ebebf5', background:on?'#f5f5ff':'white'}}>
                    <div className="flex items-start gap-3">
                      <input type="checkbox" checked={on} onChange={()=>toggleOne(row.id)} onClick={e=>e.stopPropagation()}
                        className="mt-0.5 w-4 h-4 accent-[#667eea] shrink-0 cursor-pointer"/>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-[#222] text-sm leading-relaxed m-0 flex-1">{row.question}</p>
                          <span className="shrink-0 text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap"
                            style={{background:info.bg, color:info.color}}>
                            {info.emoji} {info.short}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{background:'#f0f2f8', color:'#555'}}>
                            {row.class_room}
                          </span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md" style={{background:'#e8eaf6', color:'#3949ab'}}>
                            {row.name}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-md" style={{background:'#f3f0ff', color:'#6b21a8'}}>
                            {row.project}
                          </span>
                        </div>
                      </div>
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

