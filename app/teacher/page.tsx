'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';

const SUPABASE_URL = 'https://fsrrtopndcrdnqwnspnp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_z7LexdeBdGJqEy5Z8IAyNA_LEGAxPf_';
const TEACHER_PIN  = '1234teacher';

const CLASS_LIST    = ['3학년 1반','3학년 4반','4학년 4반','6학년 1반','6학년 2반','6학년 3반','6학년 3반 과학','6학년 4반','6학년 5반','6학년 6반'] as const;
const PROJECT_LIST  = ['세계는 어떻게 움직이는가','지구와 어떻게 함께 살아갈 것인가','우리는 어떻게 자신을 조직하는가'] as const;
const LEVEL_OPTS    = [1, 2, 3, 4] as const;
type  Level         = 1 | 2 | 3 | 4;

const PROJECT_SHORT: Record<string, { emoji: string; short: string }> = {
  '세계는 어떻게 움직이는가':          { emoji: '🌍', short: '세계' },
  '지구와 어떻게 함께 살아갈 것인가': { emoji: '🌱', short: '지구' },
  '우리는 어떻게 자신을 조직하는가':  { emoji: '🤝', short: '우리' },
};

const LV: Record<Level, { emoji: string; short: string; label: string; color: string; bg: string }> = {
  1: { emoji:'🟢', short:'1단계', label:'단순 사실 확인', color:'#2e7d32', bg:'#e8f5e9' },
  2: { emoji:'🔵', short:'2단계', label:'개념 이해',      color:'#1565c0', bg:'#e3f2fd' },
  3: { emoji:'🟠', short:'3단계', label:'비교/조건/영향', color:'#e65100', bg:'#fff3e0' },
  4: { emoji:'🔴', short:'4단계', label:'가치판단/토론',  color:'#c62828', bg:'#ffebee' },
};

const LEARN_STATUS_OPTS = ['🟢', '🟡', '🔴'] as const;
type LearnStatus = '🟢' | '🟡' | '🔴';
const LEARN_STATUS_INFO: Record<LearnStatus, { label: string; color: string; bg: string }> = {
  '🟢': { label: '🟢 핵심 개념 이해', color: '#2e7d32', bg: '#e8f5e9' },
  '🟡': { label: '🟡 핵심 개념 보완', color: '#f57f17', bg: '#fff8e1' },
  '🔴': { label: '🔴 재학습 필요',    color: '#c62828', bg: '#ffebee' },
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
  // 질문 형태 단어 — 주제가 아닌 질문 방식 (그룹명·핵심어에서 제외)
  '차이점','공통점','특징','역할','방법','이유','까닭','원인','의미','뜻','개념','원리','구조','과정','순서','성질','종류','예시','사례','정의',
  // 맥락 단어 — 내용 없는 일반 단어
  '생활','도움','관련','이용','활용','중요','필요','사람','사람들','인간','인류','환경에서','세상','현실','일상',
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
    .filter(w => !/랄$/.test(w))   // 자랄·사라날 등 동사 미래형 어미 제거
    .filter((w, i, a) => a.indexOf(w) === i)
    .slice(0, max);
}

// ─── 주제 인식 ──────────────────────────────────────────
const SUBJECT_KWS: Record<string, string[]> = {
  plant:               ['식물', '뿌리', '줄기', '잎', '꽃', '열매', '씨앗', '성장', '번식', '광합성', '싹'],
  animal:              ['동물', '곤충', '물고기', '포유류', '조류', '파충류', '사자', '호랑이', '상어', '펭귄', '고래', '개미', '나비'],
  life:                ['생물', '생명', '세포', '미생물', '세균', '바이러스', '수명', '노화', '진화'],
  earth_space:         ['지구', '우주', '달', '태양', '별', '행성', '자전', '공전', '중력', '계절', '낮', '밤', '화성', '목성'],
  material_energy:     ['자석', '철', '금속', '물질', '빛', '소리', '열', '전기', '에너지', '자기', '도체'],
  weather_climate:     ['날씨', '구름', '비', '눈', '바람', '번개', '태풍', '기온', '기후', '강수', '백야'],
  environment_ecology: ['환경', '생태계', '오염', '쓰레기', '재활용', '탄소', '숲', '멸종위기', '플라스틱', '온난화'],
  agriculture_food:    ['농업', '농사', '농부', '벼', '쌀', '채소', '과일', '식량', '스마트팜', '작물'],
  geography_world:     ['우리나라', '세계', '대륙', '국가', '나라', '지역', '도시', '농촌', '국경', '지도', '위치', '한국'],
  society_life:        ['인구', '고령화', '저출산', '복지', '일자리', '직업', '교육', '문화', '다문화', '사회'],
  economy_development: ['경제', '개발', '산업', '무역', '소비', '생산', '세금', '기업'],
  technology_ai:       ['로봇', '인공지능', 'AI', '컴퓨터', '인터넷', '드론', '자동화', '스마트폰', '기술'],
  safety_health:       ['건강', '질병', '운동', '수면', '위생', '안전', '사고', '약'],
  disaster:            ['지진', '화산', '홍수', '가뭄', '산불', '재난'],
  ethics_value:        ['동물원', '보호', '공정', '권리', '책임', '찬성', '반대', '가치', '윤리', '선택'],
};

const SUBJECT_LABEL: Record<string, string> = {
  plant:               '식물',
  animal:              '동물',
  life:                '생명',
  earth_space:         '우주·지구',
  material_energy:     '물질·에너지',
  weather_climate:     '날씨·기후',
  environment_ecology: '환경',
  agriculture_food:    '농업·식량',
  geography_world:     '세계·지리',
  society_life:        '사회·생활',
  economy_development: '경제',
  technology_ai:       '기술·AI',
  safety_health:       '건강·안전',
  disaster:            '자연재해',
  ethics_value:        '가치·윤리',
};

function detectTopics(text: string): string[] {
  const hits: { topic: string; pos: number }[] = [];
  for (const [topic, kwList] of Object.entries(SUBJECT_KWS)) {
    let first = Infinity;
    for (const kw of kwList) { const i = text.indexOf(kw); if (i !== -1 && i < first) first = i; }
    if (first !== Infinity) hits.push({ topic, pos: first });
  }
  return hits.sort((a, b) => a.pos - b.pos).map(h => h.topic);
}

function topicComboLabel(topics: string[]): string {
  if (!topics.length) return '기타';
  if (topics.length === 1) return SUBJECT_LABEL[topics[0]];
  const a = SUBJECT_LABEL[topics[0]], b = SUBJECT_LABEL[topics[1]];
  const hasJong = (a.charCodeAt(a.length - 1) - 0xAC00) % 28 !== 0;
  return `${a}${hasJong ? '과 ' : '와 '}${b}`;
}

interface Row { id: number; class_room: string; project: string; name: string; question: string; analysis: { level: number; label: string; emoji: string; summary: string } | null; time: string; }

interface LearningRow {
  id: string; grade: string; class_name: string; student_name: string;
  lesson: string; content: string;
  feedback: Record<string, string> | string | null;
  is_revised?: boolean;
  revised_content?: string | null;
  revised_feedback?: Record<string, string> | string | null;
  revised_status?: string | null;
  created_at: string;
}
function parseFeedback(f: LearningRow['feedback']): { praise: string; understood: string; nextStep: string } | null {
  if (!f) return null;
  if (typeof f === 'string') { try { return JSON.parse(f); } catch { return null; } }
  return f as { praise: string; understood: string; nextStep: string };
}
function getLearnStatus(f: LearningRow['feedback']): LearnStatus | '' {
  if (!f) return '';
  const obj: Record<string, string> = typeof f === 'string' ? (() => { try { return JSON.parse(f); } catch { return {}; } })() : (f as Record<string, string>);
  const s = obj.status ?? '';
  if (s.startsWith('🟢')) return '🟢';
  if (s.startsWith('🟡')) return '🟡';
  if (s.startsWith('🔴')) return '🔴';
  return '';
}
function getFinalStatus(r: LearningRow): LearnStatus | '' {
  if (r.is_revised && r.revised_status) {
    const s = r.revised_status;
    if (s.startsWith('🟢')) return '🟢';
    if (s.startsWith('🟡')) return '🟡';
    if (s.startsWith('🔴')) return '🔴';
  }
  return getLearnStatus(r.feedback);
}
function statusScore(s: LearnStatus | ''): number {
  if (s === '🟢') return 3;
  if (s === '🟡') return 2;
  if (s === '🔴') return 1;
  return 0;
}
function getImprovePoint(f: Record<string, string> | string | null | undefined): string {
  if (!f) return '';
  const obj: Record<string, string> = typeof f === 'string'
    ? (() => { try { return JSON.parse(f); } catch { return {}; } })()
    : (f as Record<string, string>);
  return obj.improvePoint ?? '';
}
function getGoodPoint(f: Record<string, string> | string | null | undefined): string {
  if (!f) return '';
  const obj: Record<string, string> = typeof f === 'string'
    ? (() => { try { return JSON.parse(f); } catch { return {}; } })()
    : (f as Record<string, string>);
  return obj.goodPoint ?? '';
}
function getGrowthType(r: LearningRow): { emoji: string; label: string; color: string; bg: string } {
  const initSt = getLearnStatus(r.feedback);
  if (initSt === '🟢') return { emoji: '🌟', label: '즉시 이해형', color: '#2e7d32', bg: '#e8f5e9' };
  if (r.is_revised && getFinalStatus(r) === '🟢') return { emoji: '🌱', label: '성장형',      color: '#00838f', bg: '#e0f7fa' };
  if (r.is_revised)                               return { emoji: '🔄', label: '지속 노력형', color: '#f57f17', bg: '#fff8e1' };
  return { emoji: '⚠️', label: '지원 필요형', color: '#c62828', bg: '#ffebee' };
}
function parseContent(content: string): { core: string; curious: string } {
  const coreMatch    = content.match(/\[핵심 내용\]\n?([\s\S]*?)(?=\n\n?\[새롭게|$)/);
  const curiousMatch = content.match(/\[새롭게 알게 된 것[^\]]*\]\n?([\s\S]*)$/);
  return {
    core:    coreMatch?.[1]?.trim()    ?? content.trim(),
    curious: curiousMatch?.[1]?.trim() ?? '',
  };
}

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

// ─── 학년/반 드롭다운 ─────────────────────────────────
function ClassDropdown({ opts, sel, onToggle }: {
  opts: readonly string[]; sel: string[]; onToggle: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl border-2 text-sm font-semibold cursor-pointer transition-all"
        style={sel.length > 0
          ? { borderColor:'#667eea', background:'#e8eaf6', color:'#667eea' }
          : { borderColor:'#e0e0e0', background:'white', color:'#666' }}>
        <span>{sel.length > 0 ? `${sel.length}개 선택` : '학년/반'}</span>
        <span className="text-xs opacity-50">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-[#e0e0f0] z-20 max-h-52 overflow-y-auto">
          {opts.map(o => {
            const on = sel.includes(o);
            return (
              <div key={o} onClick={() => onToggle(o)}
                className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-[#f5f5ff] transition-colors select-none">
                <div className="w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors"
                  style={on ? { borderColor:'#667eea', background:'#667eea' } : { borderColor:'#ccc', background:'white' }}>
                  {on && <span className="text-white text-[9px] font-black leading-none">✓</span>}
                </div>
                <span className="text-sm text-[#333]">{o}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── 범용 멀티셀렉 드롭다운 ──────────────────────────────
function FilterDropdown({ label, opts, sel, onToggle, getLabel, getStyle }: {
  label: string; opts: readonly (string|number)[]; sel: (string|number)[];
  onToggle: (v: string|number) => void; getLabel: (v: string|number) => string;
  getStyle?: (v: string|number) => { color: string; bg: string } | undefined;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border-2 text-sm font-semibold cursor-pointer transition-all"
        style={sel.length > 0
          ? { borderColor:'#667eea', background:'#e8eaf6', color:'#667eea' }
          : { borderColor:'#e0e0e0', background:'white', color:'#666' }}>
        <span className="truncate">{sel.length > 0 ? `${label} ${sel.length}개` : label}</span>
        <span className="text-xs opacity-50 shrink-0">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-[#e0e0f0] z-20 max-h-52 overflow-y-auto"
          style={{minWidth:'100%', width:'max-content', maxWidth:'320px'}}>
          {opts.map(o => {
            const on = sel.includes(o); const s = getStyle?.(o);
            return (
              <div key={String(o)} onClick={() => onToggle(o)}
                className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-[#f5f5ff] transition-colors select-none">
                <div className="w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors"
                  style={on ? { borderColor: s?.color ?? '#667eea', background: s?.color ?? '#667eea' } : { borderColor:'#ccc', background:'white' }}>
                  {on && <span className="text-white text-[9px] font-black leading-none">✓</span>}
                </div>
                <span className="text-sm text-[#333]">{getLabel(o)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── 메인 대시보드 ────────────────────────────────────
export default function TeacherPage() {
  const [authed,   setAuthed]   = useState(false);
  const [tab,      setTab]      = useState<'questions' | 'learnings'>('questions');

  // ── 배움 탭 상태 ──
  const [learningRows,  setLearningRows]  = useState<LearningRow[]>([]);
  const [fLearnClass,   setFLearnClass]   = useState<string[]>([]);
  const [fLearnLesson,  setFLearnLesson]  = useState<string[]>([]);
  const [fLearnStatus,  setFLearnStatus]  = useState<string[]>([]);
  const [expandedId,    setExpandedId]    = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [loadingLearn,  setLoadingLearn]  = useState(false);
  const [fetchErrLearn, setFetchErrLearn] = useState('');

  const [fClass,   setFClass]   = useState<string[]>([]);
  const [fProject, setFProject] = useState<string[]>([]);
  const [fLevel,   setFLevel]   = useState<number[]>([]);
  const [rows,     setRows]     = useState<Row[]>([]);
  const [sel,      setSel]      = useState<Set<number>>(new Set());
  const [loading,  setLoading]  = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fetchErr, setFetchErr] = useState('');
  const [searchName,      setSearchName]      = useState('');
  const [searchLearnName, setSearchLearnName] = useState('');
  const [aiReport,  setAiReport]  = useState<{ report: string; deepQuestions: string[]; suggestions: string[] } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [refinedLabels, setRefinedLabels] = useState<Record<string, string>>({});
  const [learnInsight, setLearnInsight] = useState<{ wellUnderstood: string; misconception: string; suggestion: string } | null>(null);
  const [learnInsightLoading, setLearnInsightLoading] = useState(false);
  const [selLearn,        setSelLearn]        = useState<Set<string>>(new Set());
  const [deletingLearn,   setDeletingLearn]   = useState(false);
  const [showDeleteLearn, setShowDeleteLearn] = useState(false);
  const [fGrowthType,    setFGrowthType]    = useState<string | null>(null);
  const [growthPopup,    setGrowthPopup]    = useState<{ label: string; rows: LearningRow[]; titleColor: string; borderColor: string } | null>(null);

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

  const loadLearnings = useCallback(async () => {
    setLoadingLearn(true); setFetchErrLearn('');
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/learnings?select=*&order=id.desc&limit=1000`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      setLearningRows(Array.isArray(d) ? d : []);
    } catch { setFetchErrLearn('배움 데이터를 불러오지 못했습니다.'); setLearningRows([]); }
    setLoadingLearn(false);
  }, []);

  useEffect(() => { if (authed && tab === 'questions') load(); },        [authed, tab, load]);
  useEffect(() => { if (authed && tab === 'learnings') loadLearnings(); }, [authed, tab, loadLearnings]);
  useEffect(() => { setLearnInsight(null); }, [fLearnClass, fLearnLesson, fLearnStatus]);

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
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${res.status}`);
      }
      setAiReport(await res.json());
    } catch (err) { alert(`AI 분석 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`); }
    setAiLoading(false);
  }

  async function generateLearnInsight() {
    if (!filteredLearnings.length) return;
    setLearnInsightLoading(true);
    try {
      const goodPoints = filteredLearnings
        .filter(r => getFinalStatus(r) === '🟢')
        .map(r => (r.is_revised && r.revised_feedback ? getGoodPoint(r.revised_feedback) : getGoodPoint(r.feedback)))
        .filter(Boolean);
      const improvePoints = filteredLearnings
        .filter(r => getLearnStatus(r.feedback) !== '🟢')
        .map(r => getImprovePoint(r.feedback)).filter(Boolean);
      const revisedImprovePoints = filteredLearnings
        .filter(r => r.revised_feedback && getFinalStatus(r) !== '🟢')
        .map(r => getImprovePoint(r.revised_feedback)).filter(Boolean);
      const finalSts = filteredLearnings.map(r => getFinalStatus(r));
      const statusDist = {
        '🟢': finalSts.filter(s => s === '🟢').length,
        '🟡': finalSts.filter(s => s === '🟡').length,
        '🔴': finalSts.filter(s => s === '🔴').length,
      };
      const res = await fetch('/api/learn-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goodPoints, improvePoints, revisedImprovePoints, statusDist }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${res.status}`);
      }
      setLearnInsight(await res.json());
    } catch (err) { alert(`AI 분석 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`); }
    setLearnInsightLoading(false);
  }

  function toggleLearnOne(id: string) { setSelLearn(p => { const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; }); }
  function toggleLearnAll() {
    const all = displayedLearnings.length > 0 && displayedLearnings.every(r => selLearn.has(r.id));
    setSelLearn(all ? new Set() : new Set(displayedLearnings.map(r => r.id)));
  }
  async function deleteLearnings(ids: string[]) {
    if (!ids.length) return;
    setDeletingLearn(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/learnings?id=in.(${ids.join(',')})`, {
        method: 'DELETE',
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Prefer: 'return=representation' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const deleted = await res.json();
      if (!Array.isArray(deleted) || deleted.length === 0) {
        throw new Error('Supabase DELETE 정책 미설정 — 대시보드 > SQL Editor에서\nCREATE POLICY "allow delete" ON learnings FOR DELETE USING (true);\n을 실행해 주세요.');
      }
      setLearningRows(p => p.filter(r => !ids.includes(r.id)));
      setSelLearn(p => { const n=new Set(p); ids.forEach(id=>n.delete(id)); return n; });
    } catch (err) { alert(`삭제에 실패했습니다.\n${err instanceof Error ? err.message : ''}`); }
    setDeletingLearn(false);
    setShowDeleteLearn(false);
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

  const uniqueLearnClasses = useMemo(() => {
    const seen = new Set<string>();
    learningRows.forEach(r => {
      const label = [r.grade, r.class_name].filter(Boolean).join(' ');
      if (label) seen.add(label);
    });
    return Array.from(seen).sort();
  }, [learningRows]);

  const filteredLearnings = useMemo(() => learningRows.filter(r => {
    const classLabel = [r.grade, r.class_name].filter(Boolean).join(' ');
    if (fLearnClass.length  && !fLearnClass.includes(classLabel))            return false;
    if (fLearnLesson.length && !fLearnLesson.includes(r.lesson))             return false;
    if (fLearnStatus.length && !fLearnStatus.includes(getFinalStatus(r))) return false;
    return true;
  }), [learningRows, fLearnClass, fLearnLesson, fLearnStatus]);

  const learnStats = useMemo(() => {
    const n = filteredLearnings.length;
    if (!n) return null;
    // 평균이해수준: 최종 status 점수(🔴1·🟡2·🟢3) 평균
    const scored   = filteredLearnings.filter(r => getFinalStatus(r) !== '');
    const avgScore = scored.length > 0
      ? scored.reduce((s, r) => s + statusScore(getFinalStatus(r)), 0) / scored.length
      : 0;
    // 이해수준 학생 수: 최종 🟢
    const finalGreenCount = filteredLearnings.filter(r => getFinalStatus(r) === '🟢').length;
    // 성장 학생 수: 초기 status보다 최종 status 점수가 높은 학생 (수정 여부 무관)
    const grownCount = filteredLearnings.filter(r => {
      const init  = statusScore(getLearnStatus(r.feedback));
      const final = statusScore(getFinalStatus(r));
      return init > 0 && final > init;
    }).length;
    return { n, avgScore, finalGreenCount, grownCount };
  }, [filteredLearnings]);

  const growthTypes = useMemo(() => {
    const immediate: LearningRow[] = [];  // 최초 🟢
    const grower:    LearningRow[] = [];  // 최초 🔴/🟡 → 수정 후 🟢
    const trying:    LearningRow[] = [];  // 수정했으나 🟢 미도달
    const needsHelp: LearningRow[] = [];  // 🔴/🟡이나 수정 없음
    filteredLearnings.forEach(r => {
      const initSt = getLearnStatus(r.feedback);
      if (initSt === '🟢') { immediate.push(r); return; }
      if (r.is_revised && getFinalStatus(r) === '🟢') { grower.push(r); return; }
      if (r.is_revised) { trying.push(r); return; }
      needsHelp.push(r);
    });
    return { immediate, grower, trying, needsHelp };
  }, [filteredLearnings]);

  const displayedLearnings = useMemo(() => {
    let list = fGrowthType ? filteredLearnings.filter(r => getGrowthType(r).label === fGrowthType) : filteredLearnings;
    if (searchLearnName.trim()) list = list.filter(r => r.student_name?.includes(searchLearnName.trim()));
    return list;
  }, [filteredLearnings, fGrowthType, searchLearnName]);

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
    const uniqueStudents = new Set(filtered.map(r => r.name)).size;

    const lvDist = LEVEL_OPTS.map(l => ({ ...LV[l], l, cnt: filtered.filter(r => r.analysis?.level === l).length }));
    const maxC   = Math.max(...lvDist.map(d => d.cnt), 1);
    const avg    = filtered.reduce((s, r) => s + (r.analysis?.level ?? 1), 0) / n;
    const highPct = Math.round(lvDist.filter(d => d.l >= 3).reduce((s,d) => s+d.cnt, 0) / n * 100);

    // 핵심어 빈도 (최대 5개)
    const freq: Record<string,number> = {};
    filtered.forEach(r => kws(r.question, 8).forEach(k => { freq[k] = (freq[k]??0)+1; }));
    const topKw  = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0, 5);
    const maxKw  = topKw[0]?.[1] ?? 1;

    // 주제 인식 기반 그룹핑
    const topicMap: Record<string, Row[]> = {};
    filtered.forEach(r => {
      const topics = detectTopics(r.question);
      if (!topics.length) return;
      const primary = topics[0];
      if (!topicMap[primary]) topicMap[primary] = [];
      topicMap[primary].push(r);
    });

    const groups = Object.entries(topicMap)
      .filter(([, qs]) => qs.length >= 2)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 3)
      .map(([primary, qs]) => {
        const secFreq: Record<string, number> = {};
        qs.forEach(r => {
          detectTopics(r.question).filter(t => t !== primary)
            .forEach(t => { secFreq[t] = (secFreq[t] ?? 0) + 1; });
        });
        const secondary = Object.entries(secFreq).sort((a, b) => b[1] - a[1])[0]?.[0];
        return { label: topicComboLabel(secondary ? [primary, secondary] : [primary]), key: primary, qs };
      });

    // 대표 추천 (높은 단계 우선)
    const reco = [...filtered].sort((a,b)=>(b.analysis?.level??1)-(a.analysis?.level??1)).slice(0,5);

    return { lvDist, maxC, avg, highPct, topKw, maxKw, groups, reco, n, uniqueStudents };
  }, [filtered]);

  useEffect(() => {
    setAiReport(null);
    setRefinedLabels({});
    if (!stats?.groups.length) return;
    const payload = stats.groups.map(g => ({
      key: g.key, label: g.label,
      samples: g.qs.slice(0, 3).map(r => r.question),
    }));
    fetch('/api/refine-topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groups: payload }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setRefinedLabels(data); })
      .catch(() => {});
  }, [stats]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!authed) return <PinScreen onOk={() => setAuthed(true)} />;

  const selInFil = displayed.filter(r => sel.has(r.id));
  const allChecked = displayed.length > 0 && displayed.every(r => sel.has(r.id));

  return (
    <div className="min-h-screen pb-16" style={{ background:'#f0f2f8', fontFamily:"'Noto Sans KR','맑은 고딕',sans-serif" }}>

      {/* 헤더 */}
      <div className="sticky top-0 z-20 text-white shadow-md" style={{ background:'linear-gradient(135deg,#667eea,#764ba2)' }}>
        <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-white/80 text-base font-semibold bg-white/10 border border-white/30 px-4 py-2 rounded-full hover:bg-white/20 no-underline transition-colors shrink-0">← 홈</Link>
          <h1 className="text-xl font-bold m-0 flex-1 text-center">📊 교사용 분석</h1>
          <button onClick={tab === 'questions' ? load : loadLearnings}
            disabled={tab === 'questions' ? loading : loadingLearn}
            className="text-base font-semibold bg-white/20 border border-white/30 text-white px-4 py-2 rounded-full cursor-pointer hover:bg-white/30 disabled:opacity-50 transition-colors shrink-0">
            {(tab === 'questions' ? loading : loadingLearn) ? '로딩...' : '새로고침'}
          </button>
        </div>
        {/* 탭 바 */}
        <div className="max-w-[1200px] mx-auto px-4 flex border-t border-white/20">
          {(['questions', 'learnings'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="text-xl font-bold px-12 py-5 border-b-[4px] transition-all cursor-pointer bg-transparent border-x-0 border-t-0"
              style={tab === t
                ? { color: 'white', borderBottomColor: 'white' }
                : { color: 'rgba(255,255,255,0.55)', borderBottomColor: 'transparent' }}>
              {t === 'questions' ? '📝 질문발견' : '🌱 핵심개념'}
            </button>
          ))}
        </div>
      </div>

      {/* ══ 질문발견 탭 ══ */}
      {tab === 'questions' && (
      <div className="max-w-[1200px] mx-auto px-4 pt-5 space-y-4">

        {/* ── 필터 ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl px-4 py-2.5 shadow-sm flex items-center gap-2">
          <div className="grid grid-cols-3 gap-2 flex-1">
            <ClassDropdown opts={CLASS_LIST} sel={fClass} onToggle={v => setFClass(tog(fClass, v))} />
            <FilterDropdown label="프로젝트" opts={PROJECT_LIST} sel={fProject}
              onToggle={v=>setFProject(tog(fProject,v as string))}
              getLabel={v=>v as string}/>
            <FilterDropdown label="질문 수준" opts={LEVEL_OPTS} sel={fLevel}
              onToggle={v=>setFLevel(tog(fLevel,v as number))}
              getLabel={v=>`${LV[v as Level].emoji} ${LV[v as Level].short}  ${LV[v as Level].label}`} getStyle={v=>LV[v as Level]}/>
          </div>
          {hasFilter && (
            <button onClick={clearFilters}
              className="text-xs text-[#667eea] border-none bg-transparent cursor-pointer font-semibold hover:underline whitespace-nowrap shrink-0">
              초기화
            </button>
          )}
          {fetchErr && <p className="text-red-500 text-xs w-full m-0">{fetchErr}</p>}
        </div>

        {/* ── 질문 현황 ──────────────────────────────────── */}
        {stats && (
          <div className="bg-white rounded-2xl px-5 py-4 shadow-sm">
            <h2 className="text-[15px] font-bold text-[#1a1a2e] mb-3">질문 현황</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl py-2.5 px-4 text-center" style={{background:'#f0f2f8'}}>
                <div className="text-xs text-[#9ca3af] mb-0.5">총 질문</div>
                <div className="text-xl font-black text-[#1a1a2e]">{stats.n}<span className="text-xs font-normal text-[#9ca3af] ml-0.5">개</span></div>
                <div className="text-xs text-[#9ca3af] mt-0.5">필터 기준 전체</div>
              </div>
              <div className="rounded-xl py-2.5 px-4 text-center" style={{background:'linear-gradient(135deg,#667eea18,#764ba218)', border:'1px solid #667eea20'}}>
                <div className="text-xs text-[#9ca3af] mb-0.5">참여 학생</div>
                <div className="text-xl font-black text-[#3949ab]">{stats.uniqueStudents}<span className="text-xs font-normal text-[#9ca3af] ml-0.5">명</span></div>
                <div className="text-xs text-[#9ca3af] mt-0.5">질문 작성 참여</div>
              </div>
              <div className="rounded-xl py-2.5 px-4 text-center" style={{background:'#e8f5e9'}}>
                <div className="text-xs text-[#9ca3af] mb-0.5">평균 단계</div>
                <div className="text-xl font-black" style={{color:'#667eea'}}>{stats.avg.toFixed(1)}<span className="text-xs font-normal text-[#9ca3af] ml-0.5">단계</span></div>
                <div className="text-xs text-[#9ca3af] mt-0.5">1–4단계 기준</div>
              </div>
              <div className="rounded-xl py-2.5 px-4 text-center" style={{background:'#e8eaf6'}}>
                <div className="text-xs text-[#9ca3af] mb-0.5">3·4단계</div>
                <div className="text-xl font-black" style={{color: stats.highPct >= 50 ? '#2e7d32' : '#9e9e9e'}}>{stats.highPct}<span className="text-xs font-normal text-[#9ca3af] ml-0.5">%</span></div>
                <div className="text-xs text-[#9ca3af] mt-0.5">심층 탐구 비율</div>
              </div>
            </div>
          </div>
        )}

        {/* ── 수업 활용 ──────────────────────────────────── */}
        {stats && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-bold text-[#1a1a2e] m-0">AI 인사이트</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#9ca3af]">현재 {filtered.length}개 질문 기준</span>
                <button onClick={generateAiReport} disabled={aiLoading || !stats}
                  className="text-sm px-4 py-1.5 rounded-lg border-none cursor-pointer font-semibold text-white disabled:opacity-50 transition-all"
                  style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
                  {aiLoading ? '분석 중…' : aiReport ? '↺ 다시 분석' : '분석 생성'}
                </button>
              </div>
            </div>

            {!aiReport && !aiLoading && (
              <p className="text-sm text-[#9ca3af] text-center py-8 m-0">
                분석 생성을 누르면 AI가 수업 설계를 도와드립니다.
              </p>
            )}

            {aiLoading && (
              <p className="text-sm text-[#9ca3af] text-center py-8 m-0 animate-pulse">AI가 질문을 분석하고 있습니다…</p>
            )}

            {aiReport && !aiLoading && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                <div className="rounded-xl p-4" style={{background:'linear-gradient(135deg,#667eea0d,#764ba20d)', border:'1.5px solid #667eea30'}}>
                  <div className="text-xs font-semibold text-[#667eea] mb-2">질문 분석 리포트</div>
                  <p className="text-sm text-[#2a2a3a] leading-relaxed m-0">{aiReport.report}</p>
                </div>

                <div className="rounded-xl p-4" style={{background:'#fffbeb', border:'1.5px solid #fde68a'}}>
                  <div className="text-xs font-semibold text-[#92400e] mb-2">대표 탐구 질문</div>
                  {aiReport.deepQuestions.length > 0 ? (
                    <div className="space-y-2.5">
                      {aiReport.deepQuestions.slice(0, 3).map((q, i) => (
                        <div key={i} className="flex gap-2 items-start">
                          <span className="text-xs font-black text-[#f59e0b] shrink-0 mt-0.5">{i + 1}</span>
                          <p className="text-sm text-[#333] leading-snug m-0 font-semibold">{q}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#9ca3af] m-0">추출된 질문이 없습니다.</p>
                  )}
                </div>

                <div className="rounded-xl p-4" style={{background:'#f0fdf4', border:'1.5px solid #86efac'}}>
                  <div className="text-xs font-semibold text-[#166534] mb-2">다음 차시 활동 제안</div>
                  {aiReport.suggestions.length > 0 ? (
                    <div className="space-y-2.5">
                      {aiReport.suggestions.slice(0, 3).map((s, i) => (
                        <div key={i} className="flex gap-2 items-start">
                          <span className="text-[#059669] font-black text-sm shrink-0">▶</span>
                          <p className="text-sm text-[#166534] leading-snug m-0 font-bold">{s}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#9ca3af] m-0">제안 없음</p>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

        {/* ── 질문 유형 분류 ─────────────────────────────── */}
        {stats && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="text-[15px] font-bold text-[#1a1a2e] mb-4">질문 유형 분류</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">

              {/* 수준 분포 — 인디고 테마 */}
              <div className="rounded-xl p-4 flex flex-col" style={{background:'#eef2ff', border:'1.5px solid #c7d2fe'}}>
                <div className="text-xs font-semibold text-[#4338ca] mb-3">수준 분포</div>
                <div className="space-y-3 flex-1">
                  {stats.lvDist.map(({ l, emoji, short, label, color, cnt }) => (
                    <div key={l}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold" style={{color}}>{emoji} {short}  {label}</span>
                        <span className="text-xs font-bold" style={{color}}>{cnt}</span>
                      </div>
                      <div className="bg-white rounded-full h-3.5 overflow-hidden" style={{border:'1px solid #c7d2fe'}}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{width:`${Math.max(cnt>0?6:0,(cnt/stats.maxC)*100)}%`, background:color, opacity:0.85}}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 많이 나온 핵심어 — 앰버 테마 */}
              <div className="rounded-xl p-4 flex flex-col" style={{background:'#fefce8', border:'1.5px solid #fef08a'}}>
                <div className="text-xs font-semibold text-[#b45309] mb-3">많이 나온 핵심어</div>
                {stats.topKw.length === 0
                  ? <p className="text-xs text-[#ccc]">핵심어 없음</p>
                  : (
                    <div className="flex flex-col gap-2 flex-1">
                      {stats.topKw.map(([kw, cnt], i) => (
                        <div key={kw} className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-[#9ca3af] w-3 shrink-0">{i + 1}</span>
                          <div className="relative flex-1 bg-white rounded-full h-6 overflow-hidden" style={{border:'1px solid #fde68a'}}>
                            <div className="absolute inset-0 rounded-full transition-all duration-500"
                              style={{width:`${(cnt/stats.maxKw)*100}%`, background:'linear-gradient(135deg,#f59e0b,#d97706)', opacity:0.18}}/>
                            <span className="absolute inset-0 flex items-center px-2.5 text-xs font-semibold text-[#92400e]">{kw}</span>
                          </div>
                          <span className="text-[10px] font-bold text-[#d97706] shrink-0 w-5 text-right">×{cnt}</span>
                        </div>
                      ))}
                    </div>
                  )}
              </div>

              {/* 탐구 주제별 묶음 — 청록 테마 */}
              <div className="rounded-xl p-4 flex flex-col" style={{background:'#f0fdfa', border:'1.5px solid #99f6e4'}}>
                <div className="text-xs font-semibold text-[#0f766e] mb-3">탐구 주제별 묶음</div>
                {stats.groups.length === 0
                  ? <p className="text-xs text-[#ccc]">유사 질문 그룹 없음</p>
                  : (
                    <div className="space-y-1.5 flex-1">
                      {stats.groups.map(({ label, key, qs }) => {
                        const isOpen = expandedGroups.has(key);
                        return (
                          <div key={key} className="bg-white rounded-xl overflow-hidden" style={{border:'1px solid #ccfbf1'}}>
                            <div className="flex items-center gap-1.5 px-3 py-2 cursor-pointer hover:bg-[#f0fdf9] transition-colors"
                              onClick={() => setExpandedGroups(prev => {
                                const next = new Set(prev);
                                isOpen ? next.delete(key) : next.add(key);
                                return next;
                              })}>
                              <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full shrink-0"
                                style={{background:'#0d9488'}}>{qs.length}</span>
                              <span className="text-xs font-bold text-[#0f766e] leading-tight flex-1">{refinedLabels[key] ?? label}</span>
                              <span className="text-[10px] text-[#99f6e4] shrink-0">{isOpen ? '▲' : '▼'}</span>
                            </div>
                            {isOpen && (
                              <ul className="px-3 pb-2.5 space-y-1 border-t border-[#e0fdf4]">
                                {qs.map(q => (
                                  <li key={q.id} className="text-xs text-[#555] flex gap-1 leading-relaxed pt-1">
                                    <span className="text-[#99f6e4] shrink-0 mt-0.5">·</span><span>{q.question}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
              </div>

            </div>
          </div>
        )}

        {/* ── 질문 목록 ──────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-[15px] font-bold text-[#1a1a2e] m-0 flex items-center gap-2">
                질문 목록
                <span className="text-xs font-medium text-[#9ca3af]">{displayed.length}개</span>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {displayed.map(row => {
                const lv   = (row.analysis?.level ?? 1) as Level;
                const info = LV[lv];
                const on   = sel.has(row.id);
                return (
                  <div key={row.id} onClick={()=>toggleOne(row.id)}
                    className="rounded-xl p-4 cursor-pointer transition-all relative"
                    style={{background: info.bg, border: on ? `2.5px solid ${info.color}` : '1.5px solid transparent'}}>
                    <span className="absolute top-2.5 right-2.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                      style={{background:'rgba(255,255,255,0.7)', color:info.color}}>
                      {info.short}
                    </span>
                    <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                      {(() => { const p = PROJECT_SHORT[row.project]; return p ? (
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md"
                          style={{background:'rgba(255,255,255,0.6)', color:info.color}}>
                          {p.emoji} {p.short}
                        </span>
                      ) : null; })()}
                      <span className="text-xs text-[#6b7280]">{row.class_room}</span>
                      <span className="text-xs text-[#9ca3af]">·</span>
                      <span className="text-sm font-bold text-[#1a1a2e]">{row.name}</span>
                    </div>
                    <p className="text-[#111] text-sm font-semibold leading-relaxed m-0">{row.question}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
      )} {/* /질문발견 탭 */}

      {/* ══ 개념학습 탭 ══ */}
      {tab === 'learnings' && (
        <div className="max-w-[1200px] mx-auto px-4 pt-5 space-y-4">

          {/* 필터 */}
          <div className="bg-white rounded-2xl px-4 py-2.5 shadow-sm flex items-center gap-2">
            <div className="grid grid-cols-3 gap-2 flex-1">
              <ClassDropdown
                opts={uniqueLearnClasses.length > 0 ? uniqueLearnClasses : CLASS_LIST}
                sel={fLearnClass}
                onToggle={v => setFLearnClass(tog(fLearnClass, v))}
              />
              <FilterDropdown label="프로젝트" opts={PROJECT_LIST} sel={fLearnLesson}
                onToggle={v => setFLearnLesson(tog(fLearnLesson, v as string))}
                getLabel={v=>v as string}/>
              <FilterDropdown label="이해 수준" opts={LEARN_STATUS_OPTS} sel={fLearnStatus}
                onToggle={v => setFLearnStatus(tog(fLearnStatus, v as string))}
                getLabel={v => LEARN_STATUS_INFO[v as LearnStatus].label}
                getStyle={v => LEARN_STATUS_INFO[v as LearnStatus]} />
            </div>
            {(fLearnClass.length > 0 || fLearnLesson.length > 0 || fLearnStatus.length > 0) && (
              <button onClick={() => { setFLearnClass([]); setFLearnLesson([]); setFLearnStatus([]); }}
                className="text-xs text-[#667eea] border-none bg-transparent cursor-pointer font-semibold hover:underline whitespace-nowrap shrink-0">
                초기화
              </button>
            )}
            {fetchErrLearn && <p className="text-red-500 text-xs w-full m-0">{fetchErrLearn}</p>}
          </div>

          {/* 상단 요약 카드 4개 */}
          {learnStats && (() => {
            const avg = learnStats.avgScore;
            const avgLevelLabel = avg >= 2.5 ? '🟢 이해' : avg >= 1.5 ? '🟡 보완' : '🔴 재학습';
            const avgLevelColor = avg >= 2.5 ? '#2e7d32' : avg >= 1.5 ? '#f57f17' : '#c62828';
            return (
              <div className="bg-white rounded-2xl px-5 py-4 shadow-sm">
                <h2 className="text-[15px] font-bold text-[#1a1a2e] mb-3">개념 이해 현황</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

                  <div className="rounded-xl py-2.5 px-4 text-center" style={{background:'#f0f2f8'}}>
                    <div className="text-xs text-[#9ca3af] mb-0.5">참여 학생 수</div>
                    <div className="text-xl font-black text-[#1a1a2e]">
                      {learnStats.n}<span className="text-xs font-normal text-[#9ca3af] ml-0.5">명</span>
                    </div>
                    <div className="text-xs text-[#9ca3af] mt-0.5">핵심개념 작성 참여</div>
                  </div>

                  <div className="rounded-xl py-2.5 px-4 text-center" style={{background:'linear-gradient(135deg,#667eea18,#764ba218)', border:'1px solid #667eea20'}}>
                    <div className="text-xs text-[#9ca3af] mb-0.5">평균 이해수준</div>
                    <div className="text-xl font-black" style={{color: avgLevelColor}}>
                      {avg.toFixed(1)}
                      <span className="text-xs font-normal text-[#9ca3af] ml-0.5">/ 3.0</span>
                    </div>
                    <div className="text-xs font-semibold mt-0.5" style={{color: avgLevelColor}}>{avgLevelLabel}</div>
                  </div>

                  <div className="rounded-xl py-2.5 px-4 text-center" style={{background:'#e8f5e9'}}>
                    <div className="text-xs text-[#9ca3af] mb-0.5">이해 완료 학생</div>
                    <div className="text-xl font-black text-[#16a34a]">
                      {learnStats.finalGreenCount}<span className="text-xs font-normal text-[#9ca3af] ml-0.5">명</span>
                    </div>
                    <div className="text-xs text-[#9ca3af] mt-0.5">최종 기준 🟢 이해</div>
                  </div>

                  <div className="rounded-xl py-2.5 px-4 text-center" style={{background:'#e8eaf6'}}>
                    <div className="text-xs text-[#9ca3af] mb-0.5">성장 학생</div>
                    <div className="text-xl font-black text-[#3949ab]">
                      {learnStats.grownCount}<span className="text-xs font-normal text-[#9ca3af] ml-0.5">명</span>
                    </div>
                    <div className="text-xs text-[#9ca3af] mt-0.5">이해수준 단계 향상</div>
                  </div>

                </div>
              </div>
            );
          })()}

          {/* AI 인사이트 */}
          {filteredLearnings.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-bold text-[#1a1a2e] m-0">AI 인사이트</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#9ca3af]">현재 {filteredLearnings.length}개 응답 기준</span>
                  <button onClick={generateLearnInsight} disabled={learnInsightLoading}
                    className="text-sm px-4 py-1.5 rounded-lg border-none cursor-pointer font-semibold text-white disabled:opacity-50 transition-all"
                    style={{background:'#5850ec'}}>
                    {learnInsightLoading ? '분석 중…' : learnInsight ? '다시 분석' : '분석 생성'}
                  </button>
                </div>
              </div>

              {!learnInsight && !learnInsightLoading && (
                <p className="text-sm text-[#9ca3af] text-center py-8 m-0">
                  분석 생성을 누르면 AI가 수업 개선 방향을 제안합니다.
                </p>
              )}

              {learnInsightLoading && (
                <p className="text-sm text-[#9ca3af] text-center py-8 m-0">피드백 패턴을 분석하는 중…</p>
              )}

              {learnInsight && !learnInsightLoading && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                  <div className="rounded-xl p-4" style={{background:'#e8f5e9', border:'1.5px solid #a5d6a7'}}>
                    <div className="text-xs font-semibold text-[#2e7d32] mb-2">잘 이해하고 있는 점</div>
                    <p className="text-sm text-[#374151] m-0 leading-relaxed">{learnInsight.wellUnderstood}</p>
                  </div>

                  <div className="rounded-xl p-4" style={{background:'#fffbeb', border:'1.5px solid #fde68a'}}>
                    <div className="text-xs font-semibold text-[#92400e] mb-2">학급 공통 오개념</div>
                    <p className="text-sm text-[#374151] m-0 leading-relaxed">{learnInsight.misconception}</p>
                  </div>

                  <div className="rounded-xl p-4" style={{background:'#f0fdf4', border:'1.5px solid #86efac'}}>
                    <div className="text-xs font-semibold text-[#166534] mb-2">수업 개선 제안</div>
                    <p className="text-sm text-[#374151] m-0 leading-relaxed">{learnInsight.suggestion}</p>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* 성장 유형 분류 */}
          {filteredLearnings.length > 0 && (() => {
            const types = [
              {
                key: 'immediate', label: '즉시 이해형',
                criterion: '최초 작성부터 핵심 개념 이해',
                action: '심화 탐구 제공',
                bg: '#f0faf2', borderColor: '#a5d6a7', titleColor: '#2e7d32',
                rows: growthTypes.immediate,
              },
              {
                key: 'grower', label: '성장형',
                criterion: '수정 후 핵심 개념 이해 도달',
                action: '긍정 강화, 성장 공유',
                bg: '#e8f9fb', borderColor: '#80deea', titleColor: '#00838f',
                rows: growthTypes.grower,
              },
              {
                key: 'trying', label: '지속 노력형',
                criterion: '수정했으나 아직 🟢 미도달',
                action: '소그룹 지도, 추가 스캐폴딩',
                bg: '#fffbec', borderColor: '#ffe082', titleColor: '#e65100',
                rows: growthTypes.trying,
              },
              {
                key: 'needsHelp', label: '지원 필요형',
                criterion: '🔴/🟡 상태에서 수정 없음',
                action: '우선 개별 면담',
                bg: '#fff3f3', borderColor: '#ef9a9a', titleColor: '#c62828',
                rows: growthTypes.needsHelp,
                warning: true,
              },
            ];
            return (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[15px] font-bold text-[#1a1a2e] m-0">학생 성장 유형 분류</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#6b7280]">카드를 클릭하면 해당 유형만 배움 목록에 표시됩니다.</span>
                    {fGrowthType && (
                      <button onClick={() => setFGrowthType(null)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-[#e5e7eb] bg-white cursor-pointer font-medium text-[#6b7280] shrink-0">
                        필터 해제
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {types.map(t => {
                    const isActive = fGrowthType === t.label;
                    return (
                      <div key={t.key}
                        onClick={() => setFGrowthType(isActive ? null : t.label)}
                        className="rounded-xl p-3 border-l-4 cursor-pointer transition-all select-none"
                        style={{
                          background: t.bg,
                          border: `1px solid ${t.borderColor}`,
                          borderLeftColor: t.titleColor,
                          borderLeftWidth: '4px',
                          outline: isActive ? `2px solid ${t.titleColor}` : undefined,
                          outlineOffset: isActive ? '1px' : undefined,
                          opacity: fGrowthType && !isActive ? 0.45 : 1,
                        }}>

                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-bold leading-tight" style={{color: t.titleColor}}>{t.label}</div>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              if (t.rows.length > 0) setGrowthPopup({ label: t.label, rows: t.rows, titleColor: t.titleColor, borderColor: t.borderColor });
                            }}
                            disabled={t.rows.length === 0}
                            className="text-xs font-semibold text-white px-2 py-0.5 rounded border-none cursor-pointer disabled:opacity-40 disabled:cursor-default"
                            style={{background: t.titleColor}}>
                            {t.rows.length}명
                          </button>
                        </div>

                        <div className="text-[11px] text-[#9ca3af] mb-2 leading-tight">{t.criterion}</div>
                        <div className="text-xs font-medium" style={{color: t.titleColor}}>{t.action}</div>

                        {t.warning && t.rows.length > 0 && (
                          <div className="text-[10px] font-semibold text-[#dc2626] mt-1.5">다음 수업 전 확인</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* 핵심 개념 목록 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-[15px] font-bold text-[#1a1a2e] m-0 flex items-center gap-2">
                  핵심 개념 목록
                  <span className="text-xs font-medium text-[#9ca3af]">{displayedLearnings.length}개</span>
                  {fGrowthType && (
                    <span className="text-xs font-medium text-[#5850ec]">{fGrowthType}</span>
                  )}
                </h2>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#bbb] text-xs">👤</span>
                  <input
                    type="text" value={searchLearnName} onChange={e => setSearchLearnName(e.target.value)}
                    placeholder="작성자 검색..."
                    className="pl-7 pr-3 py-1.5 text-xs border-2 border-[#e0e0f0] rounded-full focus:outline-none focus:border-[#5850ec] w-36"
                  />
                  {searchLearnName && (
                    <button onClick={() => setSearchLearnName('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#bbb] hover:text-[#555] border-none bg-transparent cursor-pointer text-xs p-0 leading-none">✕</button>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {displayedLearnings.length > 0 && (
                  <button onClick={toggleLearnAll}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full border-2 cursor-pointer transition-all"
                    style={displayedLearnings.every(r => selLearn.has(r.id)) && displayedLearnings.length > 0
                      ? {background:'#ede9fe', color:'#5850ec', borderColor:'#5850ec'}
                      : {background:'white', color:'#777', borderColor:'#e0e0e0'}}>
                    {displayedLearnings.every(r => selLearn.has(r.id)) && displayedLearnings.length > 0 ? '전체 선택 해제' : '전체 선택'}
                  </button>
                )}
                <button onClick={() => setShowDeleteLearn(true)} disabled={selLearn.size === 0}
                  className="text-xs px-3 py-1.5 rounded-full font-semibold text-white border-none cursor-pointer disabled:opacity-40"
                  style={{background:'#dc2626'}}>
                  삭제{selLearn.size > 0 ? ` (${selLearn.size})` : ''}
                </button>
              </div>
            </div>

            {loadingLearn ? (
              <p className="text-center text-[#ccc] py-10 text-sm">불러오는 중...</p>
            ) : displayedLearnings.length === 0 ? (
              <p className="text-center text-[#ccc] py-10 text-sm">
                {fGrowthType ? `${fGrowthType}에 해당하는 학생이 없습니다.` : '아직 제출된 배움 기록이 없습니다.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {displayedLearnings.map(row => {
                  const isExpanded    = expandedId === row.id;
                  const isSelected    = selLearn.has(row.id);
                  const classLabel    = [row.grade, row.class_name].filter(Boolean).join(' ');
                  const initSt        = getLearnStatus(row.feedback);
                  const finalSt       = getFinalStatus(row);
                  const levelChanged  = row.is_revised && initSt && finalSt && initSt !== finalSt;
                  const growthType    = getGrowthType(row);
                  const latestImprove = row.is_revised && row.revised_feedback
                    ? getImprovePoint(row.revised_feedback)
                    : getImprovePoint(row.feedback);
                  const parsedContent = parseContent(row.content);
                  const parsedRevised = row.revised_content ? parseContent(row.revised_content) : null;

                  return (
                    <div key={row.id} className="rounded-xl overflow-hidden transition-all relative"
                      style={{
                        background: growthType.bg,
                        border: isSelected ? `2.5px solid ${growthType.color}` : isExpanded ? `1.5px solid ${growthType.color}80` : '1.5px solid transparent',
                      }}>
                      <span className="absolute top-2.5 right-2.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md z-10"
                        style={{background:'rgba(255,255,255,0.7)', color: growthType.color}}>
                        {growthType.emoji} {growthType.label}
                      </span>

                      <div className="p-3 cursor-pointer transition-colors"
                        onClick={() => toggleLearnOne(row.id)}>

                        <div className="flex items-start gap-2">
                          <input type="checkbox" checked={isSelected}
                            onClick={e => e.stopPropagation()}
                            onChange={() => toggleLearnOne(row.id)}
                            className="mt-1 shrink-0 cursor-pointer accent-[#5850ec]" />
                          <div className="flex-1 min-w-0">
                            {/* 프로젝트 칩 + 학년반 + 이름 + 수준 변화 */}
                            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                              {(() => { const p = PROJECT_SHORT[row.lesson]; return p ? (
                                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md"
                                  style={{background:'rgba(255,255,255,0.6)', color: growthType.color}}>
                                  {p.emoji} {p.short}
                                </span>
                              ) : null; })()}
                              {classLabel && <span className="text-xs text-[#6b7280]">{classLabel}</span>}
                              <span className="text-xs text-[#9ca3af]">·</span>
                              <span className="text-sm font-bold text-[#1a1a2e]">{row.student_name}</span>
                              {levelChanged && (
                                <span className="text-xs font-semibold text-[#6b7280]">{initSt}→{finalSt}</span>
                              )}
                            </div>

                            {/* 핵심 내용 미리보기 */}
                            <p className="text-sm font-semibold text-[#111] leading-relaxed m-0 overflow-hidden"
                              style={{display:'-webkit-box', WebkitLineClamp: isExpanded ? undefined : 2, WebkitBoxOrient:'vertical'}}>
                              {parsedContent.core || row.content}
                            </p>

                          </div>

                          <button
                            onClick={e => { e.stopPropagation(); setExpandedId(isExpanded ? null : row.id); }}
                            className="text-[#d1d5db] shrink-0 mt-0.5 border-none bg-transparent cursor-pointer p-0 leading-none"
                            style={{fontSize:'1.125rem'}}>
                            {isExpanded ? '▲' : '▼'}
                          </button>
                        </div>
                      </div>

                      {/* 펼침 영역 */}
                      {isExpanded && (
                        <div className="border-t p-3 space-y-3" style={{borderColor:`${growthType.color}30`, background:'rgba(255,255,255,0.55)'}}>

                          <div>
                            <p className="text-xs font-semibold text-[#6b7280] mb-1.5">최초 작성</p>
                            <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
                              <div className="px-3 py-2 border-b border-[#f3f4f6]">
                                <p className="text-[11px] font-medium text-[#9ca3af] mb-0.5">핵심 내용</p>
                                <p className="text-sm text-[#374151] leading-relaxed whitespace-pre-wrap m-0">{parsedContent.core}</p>
                              </div>
                              {parsedContent.curious && (
                                <div className="px-3 py-2">
                                  <p className="text-[11px] font-medium text-[#9ca3af] mb-0.5">새롭게 알게 된 것 · 더 궁금한 것</p>
                                  <p className="text-sm text-[#374151] leading-relaxed whitespace-pre-wrap m-0">{parsedContent.curious}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {row.is_revised && row.revised_content && parsedRevised && (
                            <div>
                              <p className="text-xs font-semibold text-[#6b7280] mb-1.5">수정 작성</p>
                              <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
                                <div className="px-3 py-2 border-b border-[#f3f4f6]">
                                  <p className="text-[11px] font-medium text-[#9ca3af] mb-0.5">핵심 내용</p>
                                  <p className="text-sm text-[#374151] leading-relaxed whitespace-pre-wrap m-0">{parsedRevised.core}</p>
                                </div>
                                {parsedRevised.curious && (
                                  <div className="px-3 py-2">
                                    <p className="text-[11px] font-medium text-[#9ca3af] mb-0.5">새롭게 알게 된 것 · 더 궁금한 것</p>
                                    <p className="text-sm text-[#374151] leading-relaxed whitespace-pre-wrap m-0">{parsedRevised.curious}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {latestImprove && finalSt !== '🟢' && (
                            <div className="rounded-lg p-3 border border-[#e5e7eb]">
                              <p className="text-[11px] font-semibold text-[#6b7280] mb-1">AI 개선 포인트</p>
                              <p className="text-sm text-[#374151] m-0 leading-relaxed">{latestImprove}</p>
                            </div>
                          )}

                          <p className="text-[11px] text-[#9ca3af] m-0">제출 {row.created_at}</p>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )} {/* /개념학습 탭 */}

      {/* 성장 유형 학생 이름 팝업 */}
      {growthPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{background:'rgba(0,0,0,0.4)'}}
          onClick={() => setGrowthPopup(null)}>
          <div className="bg-white rounded-2xl p-5 w-80 max-h-[70vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-black text-sm" style={{color: growthPopup.titleColor}}>
                {growthPopup.label} ({growthPopup.rows.length}명)
              </span>
              <button onClick={() => setGrowthPopup(null)}
                className="text-[#bbb] hover:text-[#888] text-lg font-bold leading-none border-none bg-transparent cursor-pointer">
                ✕
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {growthPopup.rows.map(r => {
                const cls = [r.grade, r.class_name].filter(Boolean).join(' ');
                return (
                  <span key={r.id} className="text-xs px-2.5 py-1 rounded-full border font-medium"
                    style={{borderColor: growthPopup.borderColor, color: growthPopup.titleColor, background:'white'}}>
                    {cls && <span className="text-[#aaa] mr-1">{cls}</span>}{r.student_name}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {showDeleteLearn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.45)'}}>
          <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl">
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">🗑️</div>
              <h3 className="font-bold text-[#4a4a6a] text-base mb-1">응답 삭제</h3>
              <p className="text-sm text-[#666] m-0">
                선택한 <span className="font-bold text-[#c62828]">{selLearn.size}개</span>의 응답을<br/>
                삭제하시겠습니까?<br/>
                <span className="text-xs text-[#bbb]">이 작업은 되돌릴 수 없습니다.</span>
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteLearn(false)}
                className="flex-1 py-2.5 rounded-xl border-2 border-[#e0e0f0] bg-white text-sm font-semibold text-[#666] cursor-pointer">
                취소
              </button>
              <button onClick={() => deleteLearnings([...selLearn])} disabled={deletingLearn}
                className="flex-1 py-2.5 rounded-xl border-none text-sm font-bold text-white cursor-pointer disabled:opacity-50"
                style={{background:'#c62828'}}>
                {deletingLearn ? '삭제 중…' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

