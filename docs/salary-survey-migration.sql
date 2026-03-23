-- =============================================================
-- Salary Survey System - Supabase Migration
-- Run this SQL in Supabase SQL Editor
-- =============================================================

-- 1. Create the salary_surveys table
CREATE TABLE IF NOT EXISTS salary_surveys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salary BIGINT NOT NULL CHECK (salary > 0 AND salary < 10000000000),
  age_group TEXT CHECK (age_group IS NULL OR age_group IN ('20s','30s','40s','50s','60s')),
  gender TEXT CHECK (gender IS NULL OR gender IN ('male','female')),
  industry TEXT,
  fingerprint TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_salary_surveys_created
  ON salary_surveys (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_salary_surveys_fingerprint
  ON salary_surveys (fingerprint, created_at);

-- Unique constraint: same fingerprint can only submit once per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_salary_survey_fp_daily
  ON salary_surveys (fingerprint, (created_at::date));

-- 3. Enable RLS
ALTER TABLE salary_surveys ENABLE ROW LEVEL SECURITY;

-- Only INSERT allowed for anonymous users (no direct SELECT)
CREATE POLICY "allow_anon_insert" ON salary_surveys
  FOR INSERT TO anon WITH CHECK (true);

-- 4. RPC: Get aggregated community stats (SECURITY DEFINER = bypasses RLS)
CREATE OR REPLACE FUNCTION get_salary_stats()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT json_build_object(
    'totalCount', (SELECT count(*) FROM salary_surveys),
    'avgSalary', (SELECT COALESCE(avg(salary)::bigint, 0) FROM salary_surveys),
    'medianSalary', (
      SELECT COALESCE(
        percentile_cont(0.5) WITHIN GROUP (ORDER BY salary)::bigint, 0
      ) FROM salary_surveys
    ),
    'byAge', (
      SELECT COALESCE(json_object_agg(age_group, stats), '{}')
      FROM (
        SELECT age_group,
               json_build_object('count', count(*), 'avg', avg(salary)::bigint) as stats
        FROM salary_surveys
        WHERE age_group IS NOT NULL
        GROUP BY age_group
      ) t
    ),
    'byGender', (
      SELECT COALESCE(json_object_agg(gender, stats), '{}')
      FROM (
        SELECT gender,
               json_build_object('count', count(*), 'avg', avg(salary)::bigint) as stats
        FROM salary_surveys
        WHERE gender IS NOT NULL
        GROUP BY gender
      ) t
    ),
    'byIndustry', (
      SELECT COALESCE(json_object_agg(industry, stats), '{}')
      FROM (
        SELECT industry,
               json_build_object('count', count(*), 'avg', avg(salary)::bigint) as stats
        FROM salary_surveys
        WHERE industry IS NOT NULL
        GROUP BY industry
      ) t
    )
  )
$$;

-- 5. RPC: Get user's rank among community participants
CREATE OR REPLACE FUNCTION get_salary_rank(target_salary BIGINT)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT json_build_object(
    'below', (SELECT count(*) FROM salary_surveys WHERE salary < target_salary),
    'total', (SELECT count(*) FROM salary_surveys),
    'percentile', (
      SELECT COALESCE(
        (count(*) FILTER (WHERE salary < target_salary))::float
        / NULLIF(count(*), 0) * 100,
        0
      )
      FROM salary_surveys
    )
  )
$$;
