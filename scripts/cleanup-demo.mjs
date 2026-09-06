// is_demo=true 로 표시된 샘플 데이터만 삭제합니다. 실제 학생 데이터는 건드리지 않습니다.
// 실행: node scripts/cleanup-demo.mjs

const SUPABASE_URL = 'https://fsrrtopndcrdnqwnspnp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_z7LexdeBdGJqEy5Z8IAyNA_LEGAxPf_';

const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

// 자식 테이블(progress_likes/comments)부터 지워야 progress_posts 삭제 시 FK 문제가 없다.
const DELETE_ORDER = ['progress_likes', 'progress_comments', 'progress_questions', 'progress_posts', 'explorations', 'learnings', 'questions'];

async function deleteDemoRows(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?is_demo=eq.true`, {
    method: 'DELETE',
    headers: { ...HEADERS, Prefer: 'return=representation' },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`DELETE ${table} 실패 (HTTP ${res.status}): ${text}`);
  }
  const deleted = await res.json();
  return deleted.length;
}

async function main() {
  let total = 0;
  for (const table of DELETE_ORDER) {
    const count = await deleteDemoRows(table);
    console.log(`${table}: ${count}건 삭제.`);
    total += count;
  }
  console.log(`\n샘플 데이터 정리 완료 (총 ${total}건 삭제).`);
}

main().catch((err) => {
  console.error('정리 실패:', err.message);
  process.exit(1);
});
