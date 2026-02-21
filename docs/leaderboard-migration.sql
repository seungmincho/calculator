-- =============================================================
-- Game Leaderboard System - Supabase Migration
-- Run this SQL in Supabase SQL Editor
-- =============================================================

-- 1. Create the leaderboard table
CREATE TABLE IF NOT EXISTS game_leaderboard (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_type TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'default',
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL CHECK (char_length(player_name) BETWEEN 1 AND 20),
  score NUMERIC NOT NULL,
  score_type TEXT NOT NULL CHECK (score_type IN ('lower_better', 'higher_better')),
  game_duration_ms INTEGER,
  extra_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_leaderboard_game_diff_score
  ON game_leaderboard (game_type, difficulty, score_type, score ASC);

CREATE INDEX IF NOT EXISTS idx_leaderboard_player
  ON game_leaderboard (player_id, game_type, difficulty);

-- 3. Enable RLS
ALTER TABLE game_leaderboard ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "leaderboard_public_read" ON game_leaderboard
  FOR SELECT USING (true);

-- Public insert
CREATE POLICY "leaderboard_public_insert" ON game_leaderboard
  FOR INSERT WITH CHECK (true);

-- Public delete (needed for score replacement in RPC)
CREATE POLICY "leaderboard_public_delete" ON game_leaderboard
  FOR DELETE USING (true);

-- =============================================================
-- 4. RPC: submit_leaderboard_score
-- Atomically checks qualification, upserts score, prunes, returns rank
-- =============================================================
CREATE OR REPLACE FUNCTION submit_leaderboard_score(
  p_game_type TEXT,
  p_difficulty TEXT,
  p_player_id TEXT,
  p_player_name TEXT,
  p_score NUMERIC,
  p_score_type TEXT,
  p_game_duration_ms INTEGER DEFAULT NULL,
  p_extra_data JSONB DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
  v_existing RECORD;
  v_rank INTEGER;
  v_top10_count INTEGER;
  v_worst_top10_score NUMERIC;
  v_is_better BOOLEAN;
  v_qualifies BOOLEAN;
BEGIN
  -- Check if player already has an entry
  SELECT id, score INTO v_existing
    FROM game_leaderboard
    WHERE game_type = p_game_type
      AND difficulty = p_difficulty
      AND player_id = p_player_id
    LIMIT 1;

  -- If existing entry, check if new score is better
  IF v_existing IS NOT NULL THEN
    IF p_score_type = 'lower_better' THEN
      v_is_better := p_score < v_existing.score;
    ELSE
      v_is_better := p_score > v_existing.score;
    END IF;

    IF NOT v_is_better THEN
      IF p_score_type = 'lower_better' THEN
        SELECT COUNT(*) + 1 INTO v_rank
          FROM game_leaderboard
          WHERE game_type = p_game_type AND difficulty = p_difficulty AND score < v_existing.score;
      ELSE
        SELECT COUNT(*) + 1 INTO v_rank
          FROM game_leaderboard
          WHERE game_type = p_game_type AND difficulty = p_difficulty AND score > v_existing.score;
      END IF;

      RETURN jsonb_build_object(
        'submitted', false,
        'reason', 'not_personal_best',
        'rank', v_rank,
        'personal_best', v_existing.score
      );
    END IF;

    DELETE FROM game_leaderboard WHERE id = v_existing.id;
  END IF;

  -- Count current entries
  SELECT COUNT(*) INTO v_top10_count
    FROM game_leaderboard
    WHERE game_type = p_game_type AND difficulty = p_difficulty;

  -- Check if score qualifies
  IF v_top10_count < 10 THEN
    v_qualifies := TRUE;
  ELSE
    IF p_score_type = 'lower_better' THEN
      SELECT MAX(score) INTO v_worst_top10_score
        FROM (
          SELECT score FROM game_leaderboard
            WHERE game_type = p_game_type AND difficulty = p_difficulty
            ORDER BY score ASC LIMIT 10
        ) sub;
      v_qualifies := p_score < v_worst_top10_score;
    ELSE
      SELECT MIN(score) INTO v_worst_top10_score
        FROM (
          SELECT score FROM game_leaderboard
            WHERE game_type = p_game_type AND difficulty = p_difficulty
            ORDER BY score DESC LIMIT 10
        ) sub;
      v_qualifies := p_score > v_worst_top10_score;
    END IF;
  END IF;

  IF NOT v_qualifies AND v_existing IS NULL THEN
    IF p_score_type = 'lower_better' THEN
      SELECT COUNT(*) + 1 INTO v_rank
        FROM game_leaderboard
        WHERE game_type = p_game_type AND difficulty = p_difficulty AND score < p_score;
    ELSE
      SELECT COUNT(*) + 1 INTO v_rank
        FROM game_leaderboard
        WHERE game_type = p_game_type AND difficulty = p_difficulty AND score > p_score;
    END IF;

    RETURN jsonb_build_object(
      'submitted', false,
      'reason', 'not_in_top10',
      'rank', v_rank,
      'personal_best', NULL
    );
  END IF;

  -- Insert the new score
  INSERT INTO game_leaderboard (game_type, difficulty, player_id, player_name, score, score_type, game_duration_ms, extra_data)
    VALUES (p_game_type, p_difficulty, p_player_id, p_player_name, p_score, p_score_type, p_game_duration_ms, p_extra_data);

  -- Prune: keep only top 10
  IF v_top10_count >= 10 THEN
    IF p_score_type = 'lower_better' THEN
      DELETE FROM game_leaderboard
        WHERE id IN (
          SELECT id FROM game_leaderboard
            WHERE game_type = p_game_type AND difficulty = p_difficulty
            ORDER BY score ASC
            OFFSET 10
        );
    ELSE
      DELETE FROM game_leaderboard
        WHERE id IN (
          SELECT id FROM game_leaderboard
            WHERE game_type = p_game_type AND difficulty = p_difficulty
            ORDER BY score DESC
            OFFSET 10
        );
    END IF;
  END IF;

  -- Compute rank
  IF p_score_type = 'lower_better' THEN
    SELECT COUNT(*) + 1 INTO v_rank
      FROM game_leaderboard
      WHERE game_type = p_game_type AND difficulty = p_difficulty AND score < p_score;
  ELSE
    SELECT COUNT(*) + 1 INTO v_rank
      FROM game_leaderboard
      WHERE game_type = p_game_type AND difficulty = p_difficulty AND score > p_score;
  END IF;

  RETURN jsonb_build_object(
    'submitted', true,
    'rank', v_rank,
    'personal_best', p_score
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================
-- 5. RPC: get_leaderboard
-- Fetches top 10 entries + optional player rank
-- =============================================================
CREATE OR REPLACE FUNCTION get_leaderboard(
  p_game_type TEXT,
  p_difficulty TEXT,
  p_score_type TEXT,
  p_player_id TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_top10 JSONB;
  v_player_rank INTEGER;
  v_player_score NUMERIC;
BEGIN
  IF p_score_type = 'lower_better' THEN
    SELECT COALESCE(jsonb_agg(row_to_json(sub)), '[]'::jsonb) INTO v_top10
      FROM (
        SELECT player_name, score, player_id, created_at
          FROM game_leaderboard
          WHERE game_type = p_game_type AND difficulty = p_difficulty
          ORDER BY score ASC, created_at ASC
          LIMIT 10
      ) sub;
  ELSE
    SELECT COALESCE(jsonb_agg(row_to_json(sub)), '[]'::jsonb) INTO v_top10
      FROM (
        SELECT player_name, score, player_id, created_at
          FROM game_leaderboard
          WHERE game_type = p_game_type AND difficulty = p_difficulty
          ORDER BY score DESC, created_at ASC
          LIMIT 10
      ) sub;
  END IF;

  IF p_player_id IS NOT NULL THEN
    SELECT score INTO v_player_score
      FROM game_leaderboard
      WHERE game_type = p_game_type AND difficulty = p_difficulty AND player_id = p_player_id
      LIMIT 1;

    IF v_player_score IS NOT NULL THEN
      IF p_score_type = 'lower_better' THEN
        SELECT COUNT(*) + 1 INTO v_player_rank
          FROM game_leaderboard
          WHERE game_type = p_game_type AND difficulty = p_difficulty AND score < v_player_score;
      ELSE
        SELECT COUNT(*) + 1 INTO v_player_rank
          FROM game_leaderboard
          WHERE game_type = p_game_type AND difficulty = p_difficulty AND score > v_player_score;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'entries', v_top10,
    'player_rank', v_player_rank,
    'player_score', v_player_score
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
