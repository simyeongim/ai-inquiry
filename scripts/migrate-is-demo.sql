-- Supabase SQL Editor에서 직접 실행하세요 (앱 코드에서 자동 실행되지 않습니다).
-- 학생 데이터가 실제로 쌓이는 7개 테이블에 is_demo 플래그를 추가합니다.
-- concepts(개념DB)는 교사가 직접 관리하는 참고 데이터라 데모 대상에서 제외했습니다.

ALTER TABLE questions           ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE learnings            ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE explorations         ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE progress_posts       ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE progress_questions   ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE progress_likes       ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE progress_comments    ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
