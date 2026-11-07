// 동적 로또 데이터 로더 및 관리자

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

type LottoDataMap = Record<string, LottoDrawData>;

// 정적 데이터(public/lottoData.ts, 배포 때 scripts/update-lotto-data.mjs 로 갱신)
const loadStaticLottoData = async (): Promise<LottoDataMap> => {
  try {
    const mod = await import('../../public/lottoData');
    return mod.lottoData || {};
  } catch {
    return {};
  }
};

// 배포 이후 새 회차: 같은 도메인 Pages Function(functions/api/lotto-latest.ts, 엣지 캐시).
// next dev 처럼 Function 이 없거나 실패하면 정적 데이터만 쓴다. 저장하지 않고 메모리에서만 합친다.
const loadNewDraws = async (after: number): Promise<LottoDataMap> => {
  if (!after) return {};
  try {
    const res = await fetch(`/api/lotto-latest?after=${after}`);
    if (!res.ok) return {};
    const { draws } = (await res.json()) as { draws?: LottoDrawData[] };
    return Object.fromEntries((draws ?? []).map((d) => [String(d.drwNo), d]));
  } catch {
    return {};
  }
};

let loading: Promise<LottoDataMap> | null = null;

/** 정적 + 새 회차. 페이지당 한 번만 불러온다(여러 곳에서 동시에 불러도 요청은 하나). */
export const getLottoData = (): Promise<LottoDataMap> => (loading ??= (async () => {
  const staticData = await loadStaticLottoData();
  return { ...staticData, ...(await loadNewDraws(getLatestDrawNumberFromData(staticData))) };
})());

// 최신 회차 번호 가져오기
export const getLatestDrawNumberFromData = (data: LottoDataMap): number => {
  const drawNumbers = Object.keys(data).map(key => parseInt(key)).filter(num => !isNaN(num));
  return drawNumbers.length > 0 ? Math.max(...drawNumbers) : 0;
};

// 특정 회차 데이터 가져오기
export const getDrawData = async (drawNo: number): Promise<LottoDrawData | null> => {
  const data = await getLottoData();
  return data[drawNo.toString()] || null;
};

// 최근 N회차 데이터 가져오기
export const getRecentDraws = async (count: number = 10): Promise<LottoDrawData[]> => {
  const data = await getLottoData();
  const latestDrawNo = getLatestDrawNumberFromData(data);
  
  const recentDraws: LottoDrawData[] = [];
  for (let i = 0; i < count && (latestDrawNo - i) > 0; i++) {
    const drawNo = latestDrawNo - i;
    const drawData = data[drawNo.toString()];
    if (drawData) {
      recentDraws.push(drawData);
    }
  }
  
  return recentDraws;
};

// 번호별 출현 통계 계산
export const getNumberStatistics = async (recentCount: number = 50): Promise<{
  frequency: Record<number, number>;
  hotNumbers: number[];
  coldNumbers: number[];
}> => {
  const recentDraws = await getRecentDraws(recentCount);
  const frequency: Record<number, number> = {};
  
  // 1-45 초기화
  for (let i = 1; i <= 45; i++) {
    frequency[i] = 0;
  }
  
  // 빈도 계산
  recentDraws.forEach(draw => {
    [draw.drwtNo1, draw.drwtNo2, draw.drwtNo3, draw.drwtNo4, draw.drwtNo5, draw.drwtNo6].forEach(num => {
      if (num >= 1 && num <= 45) {
        frequency[num]++;
      }
    });
  });
  
  // 번호를 빈도순으로 정렬
  const sortedNumbers = Object.entries(frequency)
    .map(([num, freq]) => ({ number: parseInt(num), frequency: freq }))
    .sort((a, b) => b.frequency - a.frequency);
  
  const hotNumbers = sortedNumbers.slice(0, 10).map(item => item.number);
  const coldNumbers = sortedNumbers.slice(-10).map(item => item.number).reverse();
  
  return {
    frequency,
    hotNumbers,
    coldNumbers
  };
};

// 데이터 통계 정보
export const getDataStatistics = async (): Promise<{
  totalDraws: number;
  latestDraw: number;
  latestDate: string;
  dataUpToDate: boolean;
}> => {
  const data = await getLottoData();
  const latestDrawNo = getLatestDrawNumberFromData(data);
  const latestDrawData = data[latestDrawNo.toString()];
  
  // 현재 시점 기준 예상 최신 회차 계산
  const firstDrawDate = new Date('2002-12-07');
  const now = new Date();
  const currentSaturday = new Date(now);
  const dayOfWeek = now.getDay();
  const daysUntilSaturday = dayOfWeek === 0 ? 6 : 6 - dayOfWeek;
  currentSaturday.setDate(now.getDate() + daysUntilSaturday);
  currentSaturday.setHours(20, 45, 0, 0);
  
  let targetDate = currentSaturday;
  if (now < currentSaturday) {
    targetDate = new Date(currentSaturday);
    targetDate.setDate(targetDate.getDate() - 7);
  }
  
  const diffTime = targetDate.getTime() - firstDrawDate.getTime();
  const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
  const expectedLatest = diffWeeks + 1;
  
  return {
    totalDraws: Object.keys(data).length,
    latestDraw: latestDrawNo,
    latestDate: latestDrawData?.drwNoDate || '',
    dataUpToDate: latestDrawNo >= expectedLatest
  };
};