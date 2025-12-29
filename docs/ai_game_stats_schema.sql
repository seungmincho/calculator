-- AI 게임 통계 테이블
-- 사용자별, 게임별 AI 대전 승/패/무 기록을 저장

CREATE TABLE IF NOT EXISTS ai_game_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id TEXT NOT NULL,           -- localStorage에 저장된 플레이어 ID
  game_type TEXT NOT NULL,           -- 게임 타입 (omok, othello, connect4, etc.)
  difficulty TEXT NOT NULL,          -- 난이도 (easy, normal, hard)
  wins INT DEFAULT 0,                -- 승리 횟수
  losses INT DEFAULT 0,              -- 패배 횟수
  draws INT DEFAULT 0,               -- 무승부 횟수
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 복합 유니크 키: 플레이어 + 게임 + 난이도 조합당 1개 row
  UNIQUE(player_id, game_type, difficulty)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_ai_game_stats_player ON ai_game_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_ai_game_stats_game ON ai_game_stats(game_type);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_ai_game_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ai_game_stats_updated_at ON ai_game_stats;
CREATE TRIGGER ai_game_stats_updated_at
  BEFORE UPDATE ON ai_game_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_game_stats_updated_at();

-- 게임 결과 기록 함수 (승리/패배/무승부 upsert)
CREATE OR REPLACE FUNCTION record_ai_game_result(
  p_player_id TEXT,
  p_game_type TEXT,
  p_difficulty TEXT,
  p_result TEXT  -- 'win', 'loss', 'draw'
)
RETURNS void AS $$
BEGIN
  INSERT INTO ai_game_stats (player_id, game_type, difficulty, wins, losses, draws)
  VALUES (
    p_player_id,
    p_game_type,
    p_difficulty,
    CASE WHEN p_result = 'win' THEN 1 ELSE 0 END,
    CASE WHEN p_result = 'loss' THEN 1 ELSE 0 END,
    CASE WHEN p_result = 'draw' THEN 1 ELSE 0 END
  )
  ON CONFLICT (player_id, game_type, difficulty)
  DO UPDATE SET
    wins = ai_game_stats.wins + CASE WHEN p_result = 'win' THEN 1 ELSE 0 END,
    losses = ai_game_stats.losses + CASE WHEN p_result = 'loss' THEN 1 ELSE 0 END,
    draws = ai_game_stats.draws + CASE WHEN p_result = 'draw' THEN 1 ELSE 0 END;
END;
$$ LANGUAGE plpgsql;

-- RLS (Row Level Security) 정책
ALTER TABLE ai_game_stats ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기 가능 (리더보드용)
CREATE POLICY "ai_game_stats_read_all" ON ai_game_stats
  FOR SELECT USING (true);

-- 누구나 자신의 통계 추가/수정 가능
CREATE POLICY "ai_game_stats_insert_all" ON ai_game_stats
  FOR INSERT WITH CHECK (true);

CREATE POLICY "ai_game_stats_update_all" ON ai_game_stats
  FOR UPDATE USING (true);
