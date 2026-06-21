'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const SUPABASE_URL = 'https://fsrrtopndcrdnqwnspnp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_z7LexdeBdGJqEy5Z8IAyNA_LEGAxPf_';

const CLASS_LIST   = ['3학년 1반','3학년 4반','4학년 4반','6학년 1반','6학년 2반','6학년 3반','6학년 3반 과학','6학년 4반','6학년 5반','6학년 6반'] as const;
const PROJECT_LIST = ['세계는 어떻게 움직이는가','지구와 어떻게 함께 살아갈 것인가','우리는 어떻게 자신을 조직하는가'] as const;

const IDEA_PLACEHOLDER = '학교에 나무를 더 심고 학급별로 돌보면 좋겠습니다.\n운동장에 해시계를 설치하면 좋겠습니다.';

// ── 타입 ────────────────────────────────────────────────

interface IdeaPost {
  id: string;
  grade: string;
  class_name: string;
  student_name: string;
  project: string;
  content: string;
  created_at: string;
}

interface Like {
  id: string;
  post_id: string;
  grade: string;
  class_name: string;
  student_name: string;
}

interface InquiryQuestion {
  id: string;
  grade: string;
  class_name: string;
  student_name: string;
  project: string;
  question: string;
  created_at: string;
}

// ── 유틸 ────────────────────────────────────────────────

function splitClassRoom(classRoom: string): { grade: string; class_name: string } {
  const match = classRoom.match(/^(.+학년)\s+(.+)$/);
  if (match) return { grade: match[1], class_name: match[2] };
  return { grade: classRoom, class_name: '' };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const BASE_HEADERS = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
const JSON_HEADERS = { ...BASE_HEADERS, 'Content-Type': 'application/json', Prefer: 'return=minimal' };

// ── API 함수 ─────────────────────────────────────────────

async function fetchPosts(): Promise<IdeaPost[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/progress_posts?order=created_at.desc`, { headers: BASE_HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchLikes(postIds: string[]): Promise<Like[]> {
  if (postIds.length === 0) return [];
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/progress_likes?post_id=in.(${postIds.join(',')})&select=id,post_id,grade,class_name,student_name`,
    { headers: BASE_HEADERS },
  );
  if (!res.ok) return [];
  return res.json();
}

async function fetchQuestions(): Promise<InquiryQuestion[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/progress_questions?order=created_at.desc`, { headers: BASE_HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function savePost(payload: Omit<IdeaPost, 'id' | 'created_at'>): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/progress_posts`, {
      method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(payload),
    });
    if (!res.ok) { const body = await res.text(); return { ok: false, error: `HTTP ${res.status}: ${body}` }; }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function saveQuestion(payload: Omit<InquiryQuestion, 'id' | 'created_at'>): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/progress_questions`, {
      method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(payload),
    });
    if (!res.ok) { const body = await res.text(); return { ok: false, error: `HTTP ${res.status}: ${body}` }; }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── 메인 컴포넌트 ────────────────────────────────────────

export default function ProgressPage() {
  // 공통 입력
  const [classRoom,  setClassRoom]  = useState('');
  const [name,       setName]       = useState('');
  const [project,    setProject]    = useState('');

  // 아이디어 작성
  const [idea,       setIdea]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [saveError,  setSaveError]  = useState('');

  // 게시글 & 공감
  const [posts,      setPosts]      = useState<IdeaPost[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [newId,      setNewId]      = useState<string | null>(null);
  const [allLikes,   setAllLikes]   = useState<Like[]>([]);
  const [likingId,   setLikingId]   = useState<string | null>(null);

  // 탐구 질문
  const [questionText,    setQuestionText]    = useState('');
  const [qSubmitting,     setQSubmitting]     = useState(false);
  const [qSubmitted,      setQSubmitted]      = useState(false);
  const [qSaveError,      setQSaveError]      = useState('');
  const [questions,       setQuestions]       = useState<InquiryQuestion[]>([]);
  const [qLoading,        setQLoading]        = useState(true);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    setQLoading(true);
    setFetchError('');
    try {
      const [postsData, questionsData] = await Promise.all([fetchPosts(), fetchQuestions()]);
      setPosts(postsData);
      setQuestions(questionsData);
      const likes = await fetchLikes(postsData.map(p => p.id));
      setAllLikes(likes);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : '데이터를 불러오지 못했어요.');
    } finally {
      setLoading(false);
      setQLoading(false);
    }
  }

  async function handleSubmit() {
    if (!classRoom)             { alert('학년/반을 선택해주세요!'); return; }
    if (!name.trim())           { alert('이름을 입력해주세요!'); return; }
    if (!project)               { alert('프로젝트를 선택해주세요!'); return; }
    if (!idea.trim())           { alert('아이디어를 입력해주세요!'); return; }
    if (idea.trim().length < 5) { alert('아이디어를 조금 더 자세히 적어주세요.'); return; }

    setSubmitting(true);
    setSaveError('');
    const { grade, class_name } = splitClassRoom(classRoom);
    const result = await savePost({ grade, class_name, student_name: name.trim(), project, content: idea.trim() });

    if (!result.ok) {
      setSaveError(result.error ?? '저장에 실패했어요.');
      setSubmitting(false);
      return;
    }

    try {
      const fresh = await fetchPosts();
      setPosts(fresh);
      const likes = await fetchLikes(fresh.map(p => p.id));
      setAllLikes(likes);
      if (fresh.length > 0) setNewId(fresh[0].id);
    } catch { /* 새로고침 실패 시 기존 목록 유지 */ }

    setSubmitted(true);
    setSubmitting(false);
    setTimeout(() => document.getElementById('friends-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
  }

  async function handleLike(postId: string) {
    if (!classRoom || !name.trim()) { alert('먼저 학년/반과 이름을 입력해주세요.'); return; }
    if (likingId) return;

    const { grade, class_name } = splitClassRoom(classRoom);
    const studentName = name.trim();
    const alreadyLiked = allLikes.some(
      l => l.post_id === postId && l.grade === grade && l.class_name === class_name && l.student_name === studentName,
    );

    setLikingId(postId);

    if (alreadyLiked) {
      setAllLikes(prev => prev.filter(
        l => !(l.post_id === postId && l.grade === grade && l.class_name === class_name && l.student_name === studentName),
      ));
      try {
        await fetch(
          `${SUPABASE_URL}/rest/v1/progress_likes?post_id=eq.${postId}&grade=eq.${encodeURIComponent(grade)}&class_name=eq.${encodeURIComponent(class_name)}&student_name=eq.${encodeURIComponent(studentName)}`,
          { method: 'DELETE', headers: { ...BASE_HEADERS, Prefer: 'return=minimal' } },
        );
      } catch {
        const likes = await fetchLikes(posts.map(p => p.id)).catch(() => allLikes);
        setAllLikes(likes);
      }
    } else {
      const tempLike: Like = { id: `temp-${Date.now()}`, post_id: postId, grade, class_name, student_name: studentName };
      setAllLikes(prev => [...prev, tempLike]);
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/progress_likes`, {
          method: 'POST',
          headers: { ...BASE_HEADERS, 'Content-Type': 'application/json', Prefer: 'return=representation' },
          body: JSON.stringify({ post_id: postId, grade, class_name, student_name: studentName }),
        });
        if (res.ok) {
          const [saved]: Like[] = await res.json();
          setAllLikes(prev => prev.map(l => l.id === tempLike.id ? saved : l));
        } else {
          setAllLikes(prev => prev.filter(l => l.id !== tempLike.id));
        }
      } catch {
        setAllLikes(prev => prev.filter(l => l.id !== tempLike.id));
      }
    }

    setLikingId(null);
  }

  async function handleQuestionSubmit() {
    if (!classRoom)                   { alert('학년/반을 선택해주세요!'); return; }
    if (!name.trim())                 { alert('이름을 입력해주세요!'); return; }
    if (!project)                     { alert('프로젝트를 선택해주세요!'); return; }
    if (!questionText.trim())         { alert('질문을 입력해주세요!'); return; }
    if (questionText.trim().length < 5) { alert('질문을 조금 더 자세히 적어주세요.'); return; }

    setQSubmitting(true);
    setQSaveError('');
    const { grade, class_name } = splitClassRoom(classRoom);
    const result = await saveQuestion({ grade, class_name, student_name: name.trim(), project, question: questionText.trim() });

    if (!result.ok) {
      setQSaveError(result.error ?? '저장에 실패했어요.');
      setQSubmitting(false);
      return;
    }

    try {
      const fresh = await fetchQuestions();
      setQuestions(fresh);
    } catch { /* 새로고침 실패 시 기존 목록 유지 */ }

    setQSubmitted(true);
    setQSubmitting(false);
  }

  function handleReset() {
    setIdea('');
    setSubmitted(false);
    setNewId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleQuestionReset() {
    setQuestionText('');
    setQSubmitted(false);
  }

  const { grade: curGrade, class_name: curClass } = splitClassRoom(classRoom);
  const curName = name.trim();

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

        <Card>
          <Label>프로젝트</Label>
          <Select value={project} onChange={e => setProject(e.target.value)}>
            <option value="">프로젝트를 선택하세요</option>
            {PROJECT_LIST.map(v => <option key={v}>{v}</option>)}
          </Select>
        </Card>

        {!submitted ? (
          <Card>
            <Label>탐구를 바탕으로 어떤 아이디어를 나누고 싶나요?</Label>
            <textarea
              value={idea}
              onChange={e => setIdea(e.target.value.slice(0, 300))}
              placeholder={IDEA_PLACEHOLDER}
              rows={5}
              maxLength={300}
              className="w-full border-2 border-[#c5c9f0] rounded-xl p-3 text-base text-gray-700 focus:outline-none focus:border-[#667eea] resize-y leading-relaxed transition-colors"
              style={{ minHeight: '140px' }}
            />
            <div className={`text-right text-xs mt-1 ${idea.length > 270 ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
              {idea.length} / 300
            </div>
            {saveError && (
              <div className="mt-2 bg-[#ffebee] border-l-4 border-[#e53935] px-3 py-2 rounded-lg text-sm text-[#c62828]">
                ⚠️ {saveError}
              </div>
            )}
            <button onClick={handleSubmit} disabled={submitting}
              className="mt-3 w-full text-white font-bold text-[1rem] py-3 rounded-xl border-none cursor-pointer bg-gradient-to-br from-[#667eea] to-[#764ba2] hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              {submitting ? '공유 중...' : '아이디어 공유하기 ✨'}
            </button>
          </Card>
        ) : (
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
          <div className="flex items-center justify-between mb-0.5">
            <h2 className="text-[1.05rem] font-black text-[#4a4a6a] m-0">친구들의 아이디어</h2>
            <button onClick={loadAll} disabled={loading}
              className="text-[0.75rem] text-[#667eea] border border-[#667eea]/30 bg-[#667eea]/5 px-3 py-1 rounded-full cursor-pointer hover:bg-[#667eea]/10 transition-colors disabled:opacity-40">
              새로고침
            </button>
          </div>
          <p className="text-[#999] text-[0.82rem] mb-3">다른 친구들은 어떤 생각을 했는지 살펴보세요.</p>

          {loading ? (
            <div className="text-center text-[#667eea] text-sm py-8 animate-pulse">불러오는 중...</div>
          ) : fetchError ? (
            <div className="bg-[#ffebee] border-l-4 border-[#e53935] px-4 py-3 rounded-lg text-sm text-[#c62828]">
              ⚠️ {fetchError}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center text-[#bbb] text-sm py-10">
              아직 공유된 아이디어가 없어요.<br />첫 번째로 아이디어를 나눠보세요!
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {posts.map(post => {
                const postLikes = allLikes.filter(l => l.post_id === post.id);
                const userLiked = curName && classRoom
                  ? postLikes.some(l => l.grade === curGrade && l.class_name === curClass && l.student_name === curName)
                  : false;
                return (
                  <IdeaCard
                    key={post.id}
                    post={post}
                    isNew={post.id === newId}
                    likeCount={postLikes.length}
                    userLiked={userLiked}
                    isLiking={likingId === post.id}
                    onLike={() => handleLike(post.id)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* ── 새롭게 궁금해진 점 ── */}
        <div className="mt-6">
          <h2 className="text-[1.05rem] font-black text-[#4a4a6a] mb-0.5">새롭게 궁금해진 점</h2>
          <p className="text-[#999] text-[0.82rem] mb-3">친구들의 아이디어를 보고 새롭게 궁금해진 점을 한 가지 적어 보세요.</p>

          {!qSubmitted ? (
            <Card>
              <Label>새롭게 탐구해 보고 싶은 질문은 무엇인가요?</Label>
              <textarea
                value={questionText}
                onChange={e => setQuestionText(e.target.value.slice(0, 200))}
                placeholder="예: 학교에 나무가 더 많아지면 어떤 변화가 생길까?"
                rows={3}
                maxLength={200}
                className="w-full border-2 border-[#c5c9f0] rounded-xl p-3 text-base text-gray-700 focus:outline-none focus:border-[#667eea] resize-y leading-relaxed transition-colors"
                style={{ minHeight: '100px' }}
              />
              <div className={`text-right text-xs mt-1 ${questionText.length > 180 ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                {questionText.length} / 200
              </div>
              {qSaveError && (
                <div className="mt-2 bg-[#ffebee] border-l-4 border-[#e53935] px-3 py-2 rounded-lg text-sm text-[#c62828]">
                  ⚠️ {qSaveError}
                </div>
              )}
              <button onClick={handleQuestionSubmit} disabled={qSubmitting}
                className="mt-3 w-full text-white font-bold text-[0.95rem] py-2.5 rounded-xl border-none cursor-pointer bg-gradient-to-br from-[#667eea] to-[#764ba2] hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                {qSubmitting ? '저장 중...' : '탐구 질문 남기기 🔍'}
              </button>
            </Card>
          ) : (
            <div className="bg-white rounded-[20px] p-5 mb-2 shadow-[0_4px_24px_rgba(80,60,160,0.13)] border-l-4 border-[#667eea]">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🔍</span>
                <div>
                  <p className="font-black text-[#4a4a6a] text-base m-0">탐구 질문이 저장되었어요!</p>
                  <p className="text-[#888] text-xs m-0">새로운 탐구가 시작될 것 같아요.</p>
                </div>
              </div>
              <div className="bg-[#f8f8ff] border-l-[3px] border-[#667eea] px-3 py-2.5 rounded-r-lg mb-3">
                <p className="text-[#333] text-sm leading-relaxed m-0">{questionText}</p>
              </div>
              <button onClick={handleQuestionReset}
                className="w-full font-bold text-[0.9rem] py-2.5 rounded-xl border-none cursor-pointer transition-all"
                style={{ background: '#ede9fe', color: '#5c35cc' }}>
                다른 질문 남기기
              </button>
            </div>
          )}

          {/* 질문 목록 */}
          <div className="mt-3">
            <h3 className="text-[0.9rem] font-black text-[#4a4a6a] mb-2">친구들이 남긴 새로운 탐구 질문</h3>
            {qLoading ? (
              <div className="text-center text-[#667eea] text-sm py-6 animate-pulse">불러오는 중...</div>
            ) : questions.length === 0 ? (
              <div className="text-center text-[#bbb] text-sm py-8">
                아직 남겨진 질문이 없어요.<br />첫 번째 탐구 질문을 남겨보세요!
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {questions.map(q => <QuestionCard key={q.id} item={q} />)}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// ── 서브 컴포넌트 ────────────────────────────────────────

interface IdeaCardProps {
  post: IdeaPost;
  isNew: boolean;
  likeCount: number;
  userLiked: boolean;
  isLiking: boolean;
  onLike: () => void;
}

function IdeaCard({ post, isNew, likeCount, userLiked, isLiking, onLike }: IdeaCardProps) {
  const displayClass = [post.grade, post.class_name].filter(Boolean).join(' ');

  return (
    <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(80,60,160,0.10)] overflow-hidden"
      style={isNew ? { border: '2px solid #667eea' } : { border: '2px solid transparent' }}>
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
              {post.student_name[0]}
            </span>
            <div>
              <p className="font-bold text-[#4a4a6a] text-sm m-0 leading-none">{post.student_name}</p>
              <p className="text-[#bbb] text-[0.72rem] m-0 mt-0.5">{displayClass}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {isNew && (
              <span className="text-[0.7rem] font-bold px-2 py-0.5 rounded-full"
                style={{ background: '#ede9fe', color: '#667eea' }}>
                방금 공유
              </span>
            )}
            <span className="text-[0.7rem] text-[#ccc]">{formatDate(post.created_at)}</span>
          </div>
        </div>
        <span className="inline-block text-[0.72rem] font-semibold px-2.5 py-1 rounded-full mb-2"
          style={{ background: '#f0f0f8', color: '#667eea' }}>
          {post.project}
        </span>
        <p className="text-[#333] text-sm leading-relaxed m-0">{post.content}</p>
      </div>

      <div className="flex gap-2 px-4 py-3 border-t border-[#f4f4fc]">
        <button
          type="button"
          onClick={onLike}
          disabled={isLiking}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold border-2 transition-all cursor-pointer disabled:opacity-50"
          style={userLiked
            ? { borderColor: '#ef4444', color: '#fff', background: '#ef4444' }
            : { borderColor: '#fca5a5', color: '#ef4444', background: '#fff5f5' }
          }>
          ❤️ {userLiked ? '공감했어요' : '공감'}{likeCount > 0 && ` ${likeCount}`}
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

function QuestionCard({ item }: { item: InquiryQuestion }) {
  const displayClass = [item.grade, item.class_name].filter(Boolean).join(' ');
  return (
    <div className="bg-white rounded-2xl px-4 py-3 shadow-[0_4px_20px_rgba(80,60,160,0.10)]"
      style={{ border: '2px solid transparent' }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
          {item.student_name[0]}
        </span>
        <div className="flex-1 min-w-0">
          <span className="font-bold text-[#4a4a6a] text-sm">{item.student_name}</span>
          <span className="text-[#bbb] text-[0.72rem] ml-1.5">{displayClass}</span>
        </div>
        <span className="text-[0.7rem] text-[#ccc] shrink-0">{formatDate(item.created_at)}</span>
      </div>
      <span className="inline-block text-[0.72rem] font-semibold px-2 py-0.5 rounded-full mb-1.5"
        style={{ background: '#f0f0f8', color: '#667eea' }}>
        {item.project}
      </span>
      <p className="text-[#333] text-sm leading-relaxed m-0 bg-[#f8f8ff] border-l-[3px] border-[#667eea] px-3 py-2 rounded-r-lg">
        {item.question}
      </p>
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
