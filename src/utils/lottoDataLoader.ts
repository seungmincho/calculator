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

let cachedLottoData: LottoDataMap | null = null;
let lastLoadTime = 0;

// 기존 lottoData.ts에서 데이터 로드
const loadStaticLottoData = async (): Promise<LottoDataMap> => {
  try {
    // Next.js 13+ App Router에서 정적 파일 가져오기
    const module = await import('../../public/lottoData');
    return module.lottoData || {};
  } catch (error) {
    console.warn('Failed to load static lotto data:', error);
    return {};
  }
};

// 메모리 캐시를 포함한 로또 데이터 로더
export const getLottoData = async (forceReload = false): Promise<LottoDataMap> => {
  const now = Date.now();
  const cacheExpiry = 60 * 60 * 1000; // 1시간 캐시
  
  // 캐시가 유효하고 강제 새로고침이 아닌 경우
  if (!forceReload && cachedLottoData && (now - lastLoadTime) < cacheExpiry) {
    return cachedLottoData;
  }
  
  try {
    // 정적 데이터 로드
    const staticData = await loadStaticLottoData();
    
    // localStorage에서 추가된 데이터 가져오기
    const additionalDataStr = localStorage.getItem('additionalLottoData');
    const additionalData: LottoDataMap = additionalDataStr 
      ? JSON.parse(additionalDataStr) 
      : {};
    
    // 정적 데이터와 추가 데이터 합치기
    const combinedData = { ...staticData, ...additionalData };
    
    cachedLottoData = combinedData;
    lastLoadTime = now;
    
    return combinedData;
  } catch (error) {
    console.error('Failed to load lotto data:', error);
    return cachedLottoData || {};
  }
};

// 새로운 로또 데이터를 localStorage에 추가
export const addNewLottoData = (newDraws: LottoDrawData[]): void => {
  if (newDraws.length === 0) return;
  
  try {
    const existingDataStr = localStorage.getItem('additionalLottoData');
    const existingData: LottoDataMap = existingDataStr 
      ? JSON.parse(existingDataStr) 
      : {};
    
    // 새 데이터 추가
    newDraws.forEach(draw => {
      existingData[draw.drwNo.toString()] = draw;
    });
    
    localStorage.setItem('additionalLottoData', JSON.stringify(existingData));
    
    // 캐시 무효화
    cachedLottoData = null;
    
    console.log(`✅ Added ${newDraws.length} new lotto draws to localStorage`);
  } catch (error) {
    console.error('Failed to save new lotto data:', error);
  }
};

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