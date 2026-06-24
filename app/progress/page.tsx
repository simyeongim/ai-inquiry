'use client';

import { useState } from 'react';
import Link from 'next/link';

const SUPABASE_URL = 'https://fsrrtopndcrdnqwnspnp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_z7LexdeBdGJqEy5Z8IAyNA_LEGAxPf_';

const CLASS_LIST   = ['3학년 1반','3학년 4반','4학년 4반','6학년 1반','6학년 2반','6학년 3반','6학년 3반 과학','6학년 4반','6학년 5반','6학년 6반'] as const;
const PROJECT_LIST = ['세계는 어떻게 움직이는가','지구와 어떻게 함께 살아갈 것인가','우리는 어떻게 자신을 조직하는가'] as const;
const PROJECT_SHORT: Record<string, string> = {
  '세계는 어떻게 움직이는가': '세계',
  '지구와 어떻게 함께 살아갈 것인가': '지구',
  '우리는 어떻게 자신을 조직하는가': '자신',
};
const ITEMS_PER_PAGE = 10;
const IDEA_PLACEHOLDER = '학교에 나무를 더 심고 학급별로 돌보면 좋겠습니다.\n운동장에 해시계를 설치하면 좋겠습니다.';

const COMMENT_TYPES = ['좋은 점', '더 궁금한 점'] as const;
type CommentType = typeof COMMENT_TYPES[number];

const COMMENT_PLACEHOLDER: Record<CommentType, string> = {
  '좋은 점':     '친구 아이디어의 좋은 점을 한 줄로 적어 보세요.',
  '더 궁금한 점': '친구 아이디어를 보고 더 궁금해진 점을 한 줄로 적어 보세요.',
};
const COMMENT_TYPE_STYLE: Record<CommentType, { bg: string; color: string; border: string }> = {
  '좋은 점':     { bg: '#e8f5e9', color: '#2e7d32', border: '#a5d6a7' },
  '더 궁금한 점': { bg: '#e3f2fd', color: '#1565c0', border: '#90caf9' },
};

// ── 타입 ────────────────────────────────────────────────

interface IdeaPost {
  id: string; grade: string; class_name: string; student_name: string;
  project: string; content: string; created_at: string;
}
interface Like {
  id: string; post_id: string; grade: string; class_name: string; student_name: string;
}
interface Comment {
  id: string; post_id: string; grade: string; class_name: string; student_name: string;
  comment_type: string; comment: string; created_at: string;
}
interface InquiryQuestion {
  id: string; grade: string; class_name: string; student_name: string;
  project: string; question: string; created_at: string;
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

// ── API ──────────────────────────────────────────────────

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
async function fetchComments(postIds: string[]): Promise<Comment[]> {
  if (postIds.length === 0) return [];
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/progress_comments?post_id=in.(${postIds.join(',')})&order=created_at.asc`,
    { headers: BASE_HEADERS },
  );
  if (!res.ok) return [];
  return res.json();
}
async function savePost(payload: Omit<IdeaPost, 'id' | 'created_at'>): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/progress_posts`, {
      method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(payload),
    });
    if (!res.ok) { const body = await res.text(); return { ok: false, error: `HTTP ${res.status}: ${body}` }; }
    return { ok: true };
  } catch (err) { return { ok: false, error: err instanceof Error ? err.message : String(err) }; }
}
async function saveComment(payload: Omit<Comment, 'id' | 'created_at'>): Promise<{ ok: boolean; data?: Comment; error?: string }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/progress_comments`, {
      method: 'POST',
      headers: { ...BASE_HEADERS, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { const body = await res.text(); return { ok: false, error: `HTTP ${res.status}: ${body}` }; }
    const [saved]: Comment[] = await res.json();
    return { ok: true, data: saved };
  } catch (err) { return { ok: false, error: err instanceof Error ? err.message : String(err) }; }
}
async function saveQuestion(payload: Omit<InquiryQuestion, 'id' | 'created_at'>): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/progress_questions`, {
      method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(payload),
    });
  } catch { /* 질문 저장 실패는 무시 */ }
}
async function fetchQuestions(grade: string, class_name: string, project: string): Promise<InquiryQuestion[]> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/progress_questions?grade=eq.${encodeURIComponent(grade)}&class_name=eq.${encodeURIComponent(class_name)}&project=eq.${encodeURIComponent(project)}&order=created_at.desc`,
      { headers: BASE_HEADERS },
    );
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

// ── 메인 컴포넌트 ────────────────────────────────────────

export default function ProgressPage() {
  const [classRoom, setClassRoom] = useState('');
  const [name,      setName]      = useState('');
  const [project,   setProject]   = useState('');

  const [idea,         setIdea]         = useState('');
  const [questionText, setQuestionText] = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [saveError,    setSaveError]    = useState('');

  const [posts,       setPosts]       = useState<IdeaPost[]>([]);
  const [questions,   setQuestions]   = useState<InquiryQuestion[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [fetchError,  setFetchError]  = useState('');
  const [newId,       setNewId]       = useState<string | null>(null);
  const [allLikes,    setAllLikes]    = useState<Like[]>([]);
  const [likingId,    setLikingId]    = useState<string | null>(null);
  const [allComments, setAllComments] = useState<Comment[]>([]);

  const [currentPage, setCurrentPage] = useState(1);

  async function loadAll() {
    setLoading(true); setFetchError('');
    try {
      const postsData = await fetchPosts();
      setPosts(postsData);
      const ids = postsData.map(p => p.id);
      const { grade, class_name } = splitClassRoom(classRoom);
      const [likes, comments, qs] = await Promise.all([
        fetchLikes(ids),
        fetchComments(ids),
        grade && class_name && project ? fetchQuestions(grade, class_name, project) : Promise.resolve([]),
      ]);
      setAllLikes(likes); setAllComments(comments); setQuestions(qs);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : '데이터를 불러오지 못했어요.');
    } finally { setLoading(false); }
  }

  async function handleSubmit() {
    if (!classRoom)             { alert('학년/반을 선택해주세요!'); return; }
    if (!name.trim())           { alert('이름을 입력해주세요!'); return; }
    if (!project)               { alert('프로젝트를 선택해주세요!'); return; }
    if (!idea.trim())           { alert('아이디어를 입력해주세요!'); return; }
    if (idea.trim().length < 5) { alert('아이디어를 조금 더 자세히 적어주세요.'); return; }

    setSubmitting(true); setSaveError('');
    const { grade, class_name } = splitClassRoom(classRoom);

    const result = await savePost({ grade, class_name, student_name: name.trim(), project, content: idea.trim() });
    if (!result.ok) { setSaveError(result.error ?? '저장에 실패했어요.'); setSubmitting(false); return; }

    if (questionText.trim().length >= 5) {
      await saveQuestion({ grade, class_name, student_name: name.trim(), project, question: questionText.trim() });
    }

    try {
      const fresh = await fetchPosts();
      setPosts(fresh);
      const ids = fresh.map(p => p.id);
      const [likes, comments, qs] = await Promise.all([
        fetchLikes(ids),
        fetchComments(ids),
        fetchQuestions(grade, class_name, project),
      ]);
      setAllLikes(likes); setAllComments(comments); setQuestions(qs);
      if (fresh.length > 0) setNewId(fresh[0].id);
    } catch { /* 새로고침 실패 시 기존 목록 유지 */ }

    setSubmitted(true); setSubmitting(false);
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
        } else { setAllLikes(prev => prev.filter(l => l.id !== tempLike.id)); }
      } catch { setAllLikes(prev => prev.filter(l => l.id !== tempLike.id)); }
    }
    setLikingId(null);
  }

  async function handleCommentSubmit(postId: string, commentType: string, commentText: string): Promise<boolean> {
    if (!classRoom || !name.trim()) { alert('먼저 학년/반과 이름을 입력해주세요.'); return false; }
    const { grade, class_name } = splitClassRoom(classRoom);
    const result = await saveComment({ post_id: postId, grade, class_name, student_name: name.trim(), comment_type: commentType, comment: commentText });
    if (!result.ok) { alert(`의견 저장에 실패했어요.\n${result.error ?? ''}`); return false; }
    if (result.data) setAllComments(prev => [...prev, result.data!]);
    return true;
  }

  function handleReset() {
    setIdea(''); setQuestionText(''); setSubmitted(false); setNewId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const { grade: curGrade, class_name: curClass } = splitClassRoom(classRoom);
  const curName = name.trim();

  const friendPosts = posts.filter(p =>
    p.grade === curGrade && p.class_name === curClass && p.project === project
  );
  const totalPages  = Math.ceil(friendPosts.length / ITEMS_PER_PAGE);
  const pageStart   = (currentPage - 1) * ITEMS_PER_PAGE;
  const pagedPosts  = friendPosts.slice(pageStart, pageStart + ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen px-4 pt-2 pb-8"
      style={{ background: '#ffffff', fontFamily: "'Noto Sans KR', '맑은 고딕', sans-serif" }}>
      <div className="max-w-[600px] mx-auto">

        <div className="flex justify-between items-center mb-2">
          <Link href="/"
            className="text-[#667eea] text-[0.96rem] font-semibold border border-[#667eea]/30 bg-[#667eea]/5 px-[1.1rem] py-[0.41rem] rounded-full hover:bg-[#667eea]/10 transition-colors no-underline">
            ← 홈
          </Link>
        </div>

        {/* 배너 */}
        <div className="rounded-2xl mb-4 overflow-hidden">
          <img src="/progress.png" alt="확장 공유" className="w-full object-cover" />
        </div>

        {/* 학년/반 · 이름 */}
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

        {/* 공유 카드 */}
        <div className="flex items-center gap-2 mb-1.5 mt-2">
          <span className="text-[0.9rem] font-black text-[#4a4a6a]">아이디어 및 새롭게 궁금해진 점 공유</span>
        </div>

        {!submitted ? (
          <Card>
            {/* 아이디어 */}
            <Label>탐구를 통해 알게 된 내용을 바탕으로 우리가 해 볼 수 있는 일은 무엇일까요?</Label>
            <textarea
              value={idea} onChange={e => setIdea(e.target.value.slice(0, 300))}
              placeholder={IDEA_PLACEHOLDER} rows={1} maxLength={300}
              className="w-full border-2 border-[#c5c9f0] rounded-xl p-3 text-base text-gray-700 focus:outline-none focus:border-[#667eea] resize-y leading-relaxed transition-colors"
              style={{ minHeight: '28px' }} />
            <div className={`text-right text-xs mt-1 mb-4 ${idea.length > 270 ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
              {idea.length} / 300
            </div>

            {/* 구분선 */}
            <div className="border-t border-dashed border-[#e0e0f0] mb-4" />

            {/* 탐구질문 */}
            <Label>친구들의 아이디어를 보고 새롭게 궁금해진 점이 있나요? <span className="font-normal text-[#aaa]">(선택)</span></Label>
            <textarea
              value={questionText} onChange={e => setQuestionText(e.target.value.slice(0, 200))}
              placeholder="예: 학교에 나무가 더 많아지면 어떤 변화가 생길까?"
              rows={3} maxLength={200}
              className="w-full border-2 border-[#c5c9f0] rounded-xl p-3 text-base text-gray-700 focus:outline-none focus:border-[#667eea] resize-y leading-relaxed transition-colors"
              style={{ minHeight: '90px' }} />
            <div className={`text-right text-xs mt-1 ${questionText.length > 180 ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
              {questionText.length} / 200
            </div>

            {saveError && <ErrorBox>{saveError}</ErrorBox>}
            <button onClick={handleSubmit} disabled={submitting}
              className="mt-3 w-full text-white font-bold text-[1rem] py-3 rounded-xl border-none cursor-pointer bg-gradient-to-br from-[#667eea] to-[#764ba2] hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              {submitting ? '공유 중...' : '공유하기 ✨'}
            </button>
          </Card>
        ) : (
          <SuccessBox>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🎉</span>
              <div>
                <p className="font-black text-[#4a4a6a] text-base m-0">공유되었어요!</p>
                <p className="text-[#888] text-xs m-0">친구들에게 좋은 생각을 나눠줘서 고마워요.</p>
              </div>
            </div>
            <div className="bg-[#f8f8ff] border-l-[3px] border-[#667eea] px-3 py-2.5 rounded-r-lg mb-2">
              <p className="text-[0.7rem] font-bold text-[#667eea] mb-0.5 m-0">아이디어</p>
              <p className="text-[#333] text-sm leading-relaxed m-0 whitespace-pre-wrap">{idea}</p>
            </div>
            {questionText.trim() && (
              <div className="bg-[#f8f8ff] border-l-[3px] border-[#764ba2] px-3 py-2.5 rounded-r-lg mb-3">
                <p className="text-[0.7rem] font-bold text-[#764ba2] mb-0.5 m-0">새롭게 궁금해진 점</p>
                <p className="text-[#333] text-sm leading-relaxed m-0">{questionText}</p>
              </div>
            )}
            <button onClick={handleReset}
              className="w-full font-bold text-[0.9rem] py-2.5 rounded-xl border-none cursor-pointer transition-all"
              style={{ background: '#ede9fe', color: '#5c35cc' }}>
              다른 내용 공유하기
            </button>
          </SuccessBox>
        )}

        {/* 친구들의 생각 — 공유 후에만 표시 */}
        {submitted && (
          <div id="friends-section" className="mb-2 mt-4">
            <StepDivider />
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[1.05rem] font-black text-[#4a4a6a] m-0">친구들의 생각</h2>
              <button onClick={loadAll} disabled={loading}
                className="text-[0.75rem] text-[#667eea] border border-[#667eea]/30 bg-[#667eea]/5 px-3 py-1 rounded-full cursor-pointer hover:bg-[#667eea]/10 transition-colors disabled:opacity-40">
                새로고침
              </button>
            </div>

            {loading ? (
              <div className="text-center text-[#667eea] text-sm py-8 animate-pulse">불러오는 중...</div>
            ) : fetchError ? (
              <ErrorBox>{fetchError}</ErrorBox>
            ) : friendPosts.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-[#bbb] text-sm m-0">아직 우리 반 친구들의 아이디어가 없습니다.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {pagedPosts.map(post => {
                    const postLikes    = allLikes.filter(l => l.post_id === post.id);
                    const postComments = allComments.filter(c => c.post_id === post.id);
                    const userLiked    = curName && classRoom
                      ? postLikes.some(l => l.grade === curGrade && l.class_name === curClass && l.student_name === curName)
                      : false;
                    const matchedQ = questions.find(q =>
                      q.grade === post.grade && q.class_name === post.class_name &&
                      q.student_name === post.student_name && q.project === post.project
                    );
                    return (
                      <IdeaCard key={post.id} post={post} isNew={post.id === newId}
                        likeCount={postLikes.length} userLiked={userLiked}
                        isLiking={likingId === post.id} comments={postComments}
                        question={matchedQ?.question}
                        onLike={() => handleLike(post.id)} onCommentSubmit={handleCommentSubmit} />
                    );
                  })}
                </div>
                <Pagination current={currentPage} total={totalPages} onChange={setCurrentPage} />
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ── 서브 컴포넌트 ────────────────────────────────────────

interface IdeaCardProps {
  post: IdeaPost; isNew: boolean; likeCount: number; userLiked: boolean;
  isLiking: boolean; comments: Comment[]; question?: string;
  onLike: () => void;
  onCommentSubmit: (postId: string, type: string, text: string) => Promise<boolean>;
}

function IdeaCard({ post, isNew, likeCount, userLiked, isLiking, comments, question, onLike, onCommentSubmit }: IdeaCardProps) {
  const displayClass = [post.grade, post.class_name].filter(Boolean).join(' ');
  const [expanded,          setExpanded]          = useState(false);
  const [commentType,       setCommentType]       = useState<CommentType | ''>('');
  const [commentText,       setCommentText]       = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError,      setCommentError]      = useState('');

  async function handleCommentSave() {
    if (!commentType)                  { setCommentError('의견 유형을 선택해주세요.'); return; }
    if (!commentText.trim())           { setCommentError('의견을 입력해주세요.'); return; }
    if (commentText.trim().length < 2) { setCommentError('조금 더 자세히 적어주세요.'); return; }
    setCommentSubmitting(true); setCommentError('');
    const ok = await onCommentSubmit(post.id, commentType, commentText.trim());
    setCommentSubmitting(false);
    if (ok) { setCommentText(''); setCommentType(''); }
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden flex flex-col"
      style={isNew
        ? { border: '2px solid #667eea', boxShadow: '0 2px 16px rgba(102,126,234,0.18)' }
        : { border: '1.5px solid #f0f0f8', boxShadow: '0 2px 8px rgba(80,60,160,0.06)' }}>

      {/* 항상 표시 */}
      <div className="p-3 flex flex-col gap-2">
        {/* 이름 + 학년반 + 공감버튼 */}
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
            {post.student_name[0]}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[#4a4a6a] text-sm m-0 leading-none truncate">{post.student_name}</p>
            <p className="text-[#bbb] text-[0.72rem] m-0 mt-0.5 truncate">{displayClass}</p>
          </div>
          {isNew && (
            <span className="text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full shrink-0"
              style={{ background: '#ede9fe', color: '#667eea' }}>방금</span>
          )}
          {/* 공감 버튼 — 이름 줄 오른쪽 */}
          <button type="button" onClick={onLike} disabled={isLiking}
            className="flex items-center gap-0.5 px-2 py-1 rounded-full text-xs font-semibold border-2 transition-all cursor-pointer disabled:opacity-50 shrink-0"
            style={userLiked
              ? { borderColor: '#ef4444', color: '#fff', background: '#ef4444' }
              : { borderColor: '#fca5a5', color: '#ef4444', background: '#fff5f5' }
            }>
            ❤️{likeCount > 0 ? ` ${likeCount}` : ''}
          </button>
        </div>

        {/* 아이디어 본문 */}
        <p className="text-[#333] text-[0.82rem] leading-relaxed m-0 line-clamp-3">
          {post.content}
        </p>

        {/* 펼치기 토글 */}
        <button type="button" onClick={() => setExpanded(p => !p)}
          className="self-end text-[0.75rem] font-semibold cursor-pointer bg-transparent border-none p-0"
          style={{ color: '#667eea' }}>
          {expanded ? '접기 ▲' : '더보기 ▼'}
        </button>
      </div>

      {/* 펼침: 새롭게 궁금해진 점 + 의견 남기기 */}
      {expanded && (
        <div className="border-t border-[#f4f4fc] p-3 flex flex-col gap-3">

          {/* 새롭게 궁금해진 점 */}
          {question ? (
            <div>
              <p className="text-[0.72rem] font-bold m-0 mb-1" style={{ color: '#764ba2' }}>🔍 새롭게 궁금해진 점</p>
              <p className="text-[#555] text-[0.82rem] leading-relaxed m-0">{question}</p>
            </div>
          ) : (
            <p className="text-[#ccc] text-[0.78rem] m-0">새롭게 궁금해진 점이 없습니다.</p>
          )}

          {/* 의견 남기기 */}
          <div>
            <p className="text-[0.72rem] font-bold text-[#4a4a6a] m-0 mb-1.5">💬 의견 남기기</p>

            {/* 기존 의견 목록 */}
            {comments.length > 0 && (
              <div className="space-y-2 mb-2">
                {comments.map(c => {
                  const s = COMMENT_TYPE_STYLE[c.comment_type as CommentType] ?? { bg: '#f0f0f8', color: '#667eea', border: '#c5c9f0' };
                  return (
                    <div key={c.id} className="flex gap-1.5 items-start">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0 mt-0.5"
                        style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
                        {c.student_name[0]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                          <span className="text-[0.72rem] font-bold text-[#4a4a6a]">{c.student_name}</span>
                          <span className="text-[0.65rem] font-bold px-1 py-0.5 rounded-full"
                            style={{ background: s.bg, color: s.color }}>{c.comment_type}</span>
                        </div>
                        <p className="text-[#444] text-[0.75rem] leading-relaxed m-0">{c.comment}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 의견 입력 폼 */}
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-1">
                {COMMENT_TYPES.map(type => {
                  const s = COMMENT_TYPE_STYLE[type];
                  const active = commentType === type;
                  return (
                    <button key={type} type="button" onClick={() => { setCommentType(type); setCommentError(''); }}
                      className="flex-1 py-1.5 rounded-lg text-[0.72rem] font-bold border-2 cursor-pointer transition-all"
                      style={active
                        ? { background: s.bg, color: s.color, borderColor: s.border }
                        : { background: '#f8f8ff', color: '#aaa', borderColor: '#e0e0f0' }
                      }>
                      {type === '좋은 점' ? '👍 좋은 점' : '🔍 궁금한 점'}
                    </button>
                  );
                })}
              </div>
              <textarea
                value={commentText} onChange={e => { setCommentText(e.target.value.slice(0, 150)); setCommentError(''); }}
                placeholder={commentType ? COMMENT_PLACEHOLDER[commentType] : '유형을 먼저 선택해 주세요.'}
                disabled={!commentType} rows={2} maxLength={150}
                className="w-full border-2 border-[#c5c9f0] rounded-xl p-2 text-[0.78rem] text-gray-700 focus:outline-none focus:border-[#667eea] resize-none leading-relaxed transition-colors disabled:bg-[#f8f8f8] disabled:cursor-not-allowed" />
              {commentError && <span className="text-red-500 text-[0.72rem] block">{commentError}</span>}
              <button type="button" onClick={handleCommentSave} disabled={commentSubmitting}
                className="w-full text-white font-bold text-[0.78rem] py-1.5 rounded-xl border-none cursor-pointer bg-gradient-to-br from-[#667eea] to-[#764ba2] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                {commentSubmitting ? '저장 중...' : '의견 남기기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Pagination({ current, total, onChange }: { current: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null;
  const getPages = (): number[] => {
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 3) return [1, 2, 3, 4, 5];
    if (current >= total - 2) return [total - 4, total - 3, total - 2, total - 1, total];
    return [current - 2, current - 1, current, current + 1, current + 2];
  };
  const pages = getPages();
  const btnBase = "w-8 h-8 rounded-lg text-sm font-bold border-2 transition-all cursor-pointer";
  return (
    <div className="flex items-center justify-center gap-1.5 mt-4">
      <button onClick={() => onChange(current - 1)} disabled={current === 1}
        className={`${btnBase} disabled:opacity-30`}
        style={{ borderColor: '#c5c9f0', color: '#667eea', background: '#fff' }}>←</button>
      {pages[0] > 1 && <span className="text-[#ccc] text-sm">…</span>}
      {pages.map(p => (
        <button key={p} onClick={() => onChange(p)} className={btnBase}
          style={current === p
            ? { background: '#667eea', color: '#fff', borderColor: '#667eea' }
            : { background: '#fff', color: '#667eea', borderColor: '#c5c9f0' }}>
          {p}
        </button>
      ))}
      {pages[pages.length - 1] < total && <span className="text-[#ccc] text-sm">…</span>}
      <button onClick={() => onChange(current + 1)} disabled={current === total}
        className={`${btnBase} disabled:opacity-30`}
        style={{ borderColor: '#c5c9f0', color: '#667eea', background: '#fff' }}>→</button>
    </div>
  );
}

// ── 공용 UI ──────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-2xl p-4 mb-2 shadow-[0_4px_20px_rgba(80,60,160,0.10)]">{children}</div>;
}
function Label({ children }: { children: React.ReactNode }) {
  return <label className="block font-bold text-[#4a4a6a] mb-1.5 text-[0.9rem]">{children}</label>;
}
function Select({ children, value, onChange }: {
  children: React.ReactNode; value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <select value={value} onChange={onChange}
      className="w-full border-2 border-[#e0e0f0] rounded-xl p-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#667eea] bg-white cursor-pointer transition-colors appearance-none">
      {children}
    </select>
  );
}
function StepBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
      style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
      {children}
    </span>
  );
}
function StepDivider() {
  return (
    <div className="flex flex-col items-center my-4 select-none">
      <div className="w-px h-4" style={{ background: 'linear-gradient(to bottom, #c5c9f0, #667eea)' }} />
      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white"
        style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>↓</div>
      <div className="w-px h-4" style={{ background: 'linear-gradient(to bottom, #667eea, #c5c9f0)' }} />
    </div>
  );
}
function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 bg-[#ffebee] border-l-4 border-[#e53935] px-3 py-2 rounded-lg text-sm text-[#c62828]">
      ⚠️ {children}
    </div>
  );
}
function SuccessBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-[20px] p-5 mb-2 shadow-[0_4px_24px_rgba(80,60,160,0.13)] border-l-4 border-[#667eea]">
      {children}
    </div>
  );
}
