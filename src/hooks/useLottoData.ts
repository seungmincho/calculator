// 로또 당첨번호 Hook — public/lottoData.ts(정적 데이터)만 읽는다.
// 갱신은 `node scripts/update-lotto-data.mjs`(동행복권 회차별 결과 JSON) 후 배포.
// 예전에는 방문자 브라우저가 제3자 CORS 프록시로 동행복권 구 API 를 불렀는데, API 가 바뀌어 매번 실패했다(2026-11 제거).

import { useState, useEffect, useCallback } from 'react';
import { getLottoData, getDataStatistics, getNumberStatistics, getRecentDraws } from '@/utils/lottoDataLoader';

interface LottoDrawData {
  drwNo: number;
  drwNoDate: string;
  drwtNo1: number;
  drwtNo2: number;
  drwtNo3: number;
  drwtNo4: number;
  drwtNo5: number;
  drwtNo6: number;
  bnusNo: number;
}

interface NumberStatistics {
  frequency: Record<number, number>;
  hotNumbers: number[];
  coldNumbers: number[];
}

interface UseLottoDataReturn {
  lottoData: Record<string, LottoDrawData>;
  latestDrawData: LottoDrawData | null;
  recentDraws: LottoDrawData[];
  numberStats: NumberStatistics | null;
  isLoading: boolean;
  dataStats: {
    totalDraws: number;
    latestDraw: number;
    latestDate: string;
    dataUpToDate: boolean;
  } | null;
  getDrawByNumber: (drawNo: number) => LottoDrawData | null;
}

export const useLottoData = (): UseLottoDataReturn => {
  const [lottoData, setLottoData] = useState<Record<string, LottoDrawData>>({});
  const [latestDrawData, setLatestDrawData] = useState<LottoDrawData | null>(null);
  const [recentDraws, setRecentDraws] = useState<LottoDrawData[]>([]);
  const [numberStats, setNumberStats] = useState<NumberStatistics | null>(null);
  const [dataStats, setDataStats] = useState<UseLottoDataReturn['dataStats']>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getLottoData();
        const stats = await getDataStatistics();
        const recent = await getRecentDraws(20);
        const numStats = await getNumberStatistics(50);
        if (!alive) return;
        setLottoData(data);
        setDataStats(stats);
        setLatestDrawData(stats.latestDraw > 0 ? data[stats.latestDraw.toString()] ?? null : null);
        setRecentDraws(recent);
        setNumberStats(numStats);
      } catch (error) {
        console.error('Failed to load lotto data:', error);
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => { alive = false };
  }, []);

  const getDrawByNumber = useCallback((drawNo: number): LottoDrawData | null => {
    return lottoData[drawNo.toString()] || null;
  }, [lottoData]);

  return { lottoData, latestDrawData, recentDraws, numberStats, isLoading, dataStats, getDrawByNumber };
};
