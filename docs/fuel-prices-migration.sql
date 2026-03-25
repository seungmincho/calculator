-- ============================================================
-- fuel_prices: OPINET 일별 시도별 유가 저장 테이블
-- 매일 Cron으로 OPINET API 호출 → 18개 시도 유가 적재
-- ============================================================

CREATE TABLE IF NOT EXISTS fuel_prices (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  trade_date DATE NOT NULL,           -- 거래일 (YYYYMMDD)
  sido_cd VARCHAR(2) NOT NULL,        -- 시도코드 (01=서울, 02=경기 ...)
  sido_nm VARCHAR(10) NOT NULL,       -- 시도명 (서울, 경기 ...)
  gasoline NUMERIC(8,2),              -- 휘발유 가격 (원/L)
  diesel NUMERIC(8,2),                -- 경유 가격 (원/L)
  lpg NUMERIC(8,2),                   -- LPG 가격 (원/L)
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(trade_date, sido_cd)         -- 날짜+지역 복합 유니크
);

-- 인덱스: 날짜 범위 + 지역 조회 최적화
CREATE INDEX idx_fuel_prices_date ON fuel_prices (trade_date DESC);
CREATE INDEX idx_fuel_prices_sido_date ON fuel_prices (sido_cd, trade_date DESC);

-- RLS 정책: 누구나 읽기 가능, 쓰기는 service_role만
ALTER TABLE fuel_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fuel_prices_read_all" ON fuel_prices
  FOR SELECT USING (true);

-- service_role로 INSERT (CF Workers에서 사용)
CREATE POLICY "fuel_prices_insert_service" ON fuel_prices
  FOR INSERT WITH CHECK (true);

-- 조회 RPC: 특정 날짜 + 지역의 유가 조회
CREATE OR REPLACE FUNCTION get_fuel_price(p_date DATE, p_sido_cd VARCHAR DEFAULT NULL)
RETURNS TABLE (
  trade_date DATE,
  sido_cd VARCHAR,
  sido_nm VARCHAR,
  gasoline NUMERIC,
  premium_gasoline NUMERIC,
  diesel NUMERIC,
  lpg NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT fp.trade_date, fp.sido_cd, fp.sido_nm, fp.gasoline, fp.premium_gasoline, fp.diesel, fp.lpg
  FROM fuel_prices fp
  WHERE fp.trade_date = p_date
    AND (p_sido_cd IS NULL OR fp.sido_cd = p_sido_cd)
  ORDER BY fp.sido_cd;
END;
$$ LANGUAGE plpgsql;

-- 가장 가까운 날짜의 유가 조회 (해당 날짜에 데이터 없을 때)
CREATE OR REPLACE FUNCTION get_nearest_fuel_price(p_date DATE, p_sido_cd VARCHAR DEFAULT NULL)
RETURNS TABLE (
  trade_date DATE,
  sido_cd VARCHAR,
  sido_nm VARCHAR,
  gasoline NUMERIC,
  premium_gasoline NUMERIC,
  diesel NUMERIC,
  lpg NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT fp.trade_date, fp.sido_cd, fp.sido_nm, fp.gasoline, fp.premium_gasoline, fp.diesel, fp.lpg
  FROM fuel_prices fp
  WHERE (p_sido_cd IS NULL OR fp.sido_cd = p_sido_cd)
    AND fp.trade_date <= p_date
  ORDER BY fp.trade_date DESC
  LIMIT CASE WHEN p_sido_cd IS NULL THEN 18 ELSE 1 END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- premium_gasoline 컬럼 추가 (2026-03-24)
-- 기존 테이블에 고급휘발유 컬럼 추가 + RPC 업데이트
-- ============================================================
ALTER TABLE fuel_prices ADD COLUMN IF NOT EXISTS premium_gasoline NUMERIC(8,2);

-- 저장된 날짜 범위 조회 (UI에서 달력 제한용)
CREATE OR REPLACE FUNCTION get_fuel_price_date_range()
RETURNS TABLE (min_date DATE, max_date DATE) AS $$
BEGIN
  RETURN QUERY
  SELECT MIN(fp.trade_date), MAX(fp.trade_date)
  FROM fuel_prices fp;
END;
$$ LANGUAGE plpgsql;
