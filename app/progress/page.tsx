'use client';

import { useState } from 'react';
import Link from 'next/link';

const CLASS_LIST   = ['3학년 1반','3학년 4반','4학년 4반','6학년 1반','6학년 2반','6학년 3반','6학년 3반 과학','6학년 4반','6학년 5반','6학년 6반'] as const;
const PROJECT_LIST = ['세계는 어떻게 움직이는가','지구와 어떻게 함께 살아갈 것인가','우리는 어떻게 자신을 조직하는가'] as const;

const PLACEHOLDER = '학교에 나무를 더 심고 학급별로 돌보면 좋겠습니다.\n운동장에 해시계를 설치하면 좋겠습니다.';

interface IdeaCard {
  id: number;
  name: string;
  classRoom: string;
  project: string;
  idea: string;
}

const MOCK_IDEAS: IdeaCard[] = [
  {
    id: 1,
    name: '김지우',
    classRoom: '6학년 2반',
    project: '지구와 어떻게 함께 살아갈 것인가',
    idea: '학교 급식 남은 음식을 퇴비로 만들어 학교 텃밭에 사용하면 좋겠습니다. 음식물 쓰레기도 줄이고 식물도 더 잘 자랄 수 있을 것 같아요.',
  },
  {
    id: 2,
    name: '박서연',
    classRoom: '6학년 1반',
    project: '세계는 어떻게 움직이는가',
    idea: '교실 창문에 태양광 필름을 붙여서 소규모 전기를 생산하고 교실 조명 일부를 대체하면 에너지 절약이 될 것 같습니다.',
  },
  {
    id: 3,
    name: '이준호',
    classRoom: '6학년 3반',
    project: '우리는 어떻게 자신을 조직하는가',
    idea: '학급별로 환경 지킴이 역할을 나누어 매주 학교 주변을 청소하고 결과를 게시판에 공유하면 책임감도 생기고 학교도 깨끗해질 것 같아요.',
  },
  {
    id: 4,
    name: '최민서',
    classRoom: '6학년 4반',
    project: '지구와 어떻게 함께 살아갈 것인가',
    idea: '운동장 한편에 빗물 모으는 통을 설치해서 화단에 물을 줄 때 사용하면 물을 아낄 수 있습니다. 우리가 직접 설계하고 만들어보고 싶어요.',
  },
  {
    id: 5,
    name: '정하은',
    classRoom: '6학년 2반',
    project: '세계는 어떻게 움직이는가',
    idea: '다른 나라의 같은 나이 친구들과 편지를 주고받으며 서로 사는 곳의 환경 문제를 나눠보면 세계가 연결되어 있다는 걸 더 잘 느낄 수 있을 것 같습니다.',
  },
];

export default function ProgressPage() {
  const [classRoom, setClassRoom] = useState('');
  const [name,      setName]      = useState('');
  const [project,   setProject]   = useState('');
  const [idea,      setIdea]      = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [ideas,     setIdeas]     = useState<IdeaCard[]>(MOCK_IDEAS);

  function handleSubmit() {
    if (!classRoom)           { alert('학년/반을 선택해주세요!'); return; }
    if (!name.trim())         { alert('이름을 입력해주세요!'); return; }
    if (!project)             { alert('프로젝트를 선택해주세요!'); return; }
    if (!idea.trim())         { alert('아이디어를 입력해주세요!'); return; }
    if (idea.trim().length < 5) { alert('아이디어를 조금 더 자세히 적어주세요.'); return; }

    const newCard: IdeaCard = {
      id: Date.now(),
      name: name.trim(),
      classRoom,
      project,
      idea: idea.trim(),
    };
    setIdeas(prev => [newCard, ...prev]);
    setSubmitted(true);
    setTimeout(() => {
      document.getElementById('friends-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
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

        {/* ── 나의 아이디어 작성 영역 ── */}

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
        {!submitted ? (
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
        ) : (
          /* 제출 완료 */
          <div className="bg-white rounded-[20px] p-5 mb-2 shadow-[0_4px_24px_rgba(80,60,160,0.13)] border-l-4 border-[#667eea]">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🎉</span>
              <div>
                <p className="font-black text-[#4a4a6a] text-base m-0">아이디어가 공유되었어요!</p>
                <p className="text-[#888] text-xs m-0">친구들에게 좋은 아이디어를 나눠줘서 고마워요.</p>
              </div>
            </div>
            <div className="bg-[#f8f8ff] border-l-[3px] border-[#667eea] px-3 py-2.5 rounded-r-lg mb-3">
              <p className="text-[#333] text-sm leading-relaxed m-0 whitespace-pre-wrap">{idea}</p>
            </div>
            <button onClick={handleReset}
              className="w-full font-bold text-[0.9rem] py-2.5 rounded-xl border-none cursor-pointer transition-all"
              style={{ background: '#ede9fe', color: '#5c35cc' }}>
              다른 아이디어 공유하기
            </button>
          </div>
        )}

        {/* ── 친구들의 아이디어 영역 ── */}
        <div id="friends-section" className="mt-4 mb-2">
          <h2 className="text-[1.05rem] font-black text-[#4a4a6a] mb-0.5">친구들의 아이디어</h2>
          <p className="text-[#999] text-[0.82rem] mb-3">다른 친구들은 어떤 생각을 했는지 살펴보세요.</p>

          <div className="flex flex-col gap-3">
            {ideas.map((item, idx) => (
              <FriendIdeaCard key={item.id} item={item} isNew={submitted && idx === 0} />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

function FriendIdeaCard({ item, isNew }: { item: IdeaCard; isNew: boolean }) {
  return (
    <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(80,60,160,0.10)] overflow-hidden"
      style={isNew ? { border: '2px solid #667eea' } : { border: '2px solid transparent' }}>
      {/* 카드 헤더 */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
              {item.name[0]}
            </span>
            <div>
              <p className="font-bold text-[#4a4a6a] text-sm m-0 leading-none">{item.name}</p>
              <p className="text-[#bbb] text-[0.72rem] m-0 mt-0.5">{item.classRoom}</p>
            </div>
          </div>
          {isNew && (
            <span className="text-[0.7rem] font-bold px-2 py-0.5 rounded-full"
              style={{ background: '#ede9fe', color: '#667eea' }}>
              방금 공유
            </span>
          )}
        </div>
        <span className="inline-block text-[0.72rem] font-semibold px-2.5 py-1 rounded-full mb-2"
          style={{ background: '#f0f0f8', color: '#667eea' }}>
          {item.project}
        </span>
        <p className="text-[#333] text-sm leading-relaxed m-0">{item.idea}</p>
      </div>

      {/* 버튼 영역 */}
      <div className="flex gap-2 px-4 py-3 border-t border-[#f4f4fc]">
        <button type="button"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold border-2 transition-all cursor-pointer"
          style={{ borderColor: '#fca5a5', color: '#ef4444', background: '#fff5f5' }}>
          ❤️ 공감
        </button>
        <button type="button"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold border-2 transition-all cursor-pointer"
          style={{ borderColor: '#c5c9f0', color: '#667eea', background: '#f8f8ff' }}>
          💬 의견
        </button>
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
