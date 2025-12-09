// 로또 최신회차 자동 업데이트 유틸리티

interface LottoData {
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

interface LottoApiResponse {
  drwNo: number;
  drwNoDate: string;
  drwtNo1: number;
  drwtNo2: number;
  drwtNo3: number;
  drwtNo4: number;
  drwtNo5: number;
  drwtNo6: number;
  bnusNo: number;
  returnValue: string;
  totSellamnt?: number;
  firstWinamnt?: number;
  firstPrzwnerCo?: number;
}

// 현재 lottoData에서 최신 회차 가져오기
export const getLatestDrawNumber = async (): Promise<number> => {
  try {
    const response = await fetch('/lottoData.ts');
    const content = await response.text();
    
    // 정규식으로 가장 높은 drwNo 찾기
    const drawNumbers = content.match(/"drwNo":(\d+)/g);
    if (!drawNumbers) return 0;
    
    const numbers = drawNumbers.map(match => parseInt(match.split(':')[1]));
    return Math.max(...numbers);
  } catch (error) {
    console.error('Failed to get latest draw number:', error);
    return 0;
  }
};

// 특정 회차 당첨번호 조회 (CORS 프록시 사용)
export const fetchLottoData = async (drawNo: number): Promise<LottoData | null> => {
  try {
    // 동행복권 API URL
    const lottoApiUrl = `https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${drawNo}`;

    // CORS 프록시 서비스들 (순서대로 시도)
    const proxyUrls = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(lottoApiUrl)}`,
      `https://corsproxy.io/?${encodeURIComponent(lottoApiUrl)}`,
    ];

    let data: LottoApiResponse | null = null;

    for (const proxyUrl of proxyUrls) {
      try {
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (response.ok) {
          const text = await response.text();
          data = JSON.parse(text);
          break;
        }
      } catch (proxyError) {
        console.warn(`Proxy failed: ${proxyUrl}`, proxyError);
        continue;
      }
    }

    if (!data) {
      throw new Error('All proxies failed');
    }

    // returnValue가 'success'가 아니면 해당 회차가 아직 추첨되지 않음
    if (data.returnValue !== 'success') {
      return null;
    }

    return {
      drwNo: data.drwNo,
      drwNoDate: data.drwNoDate,
      drwtNo1: data.drwtNo1,
      drwtNo2: data.drwtNo2,
      drwtNo3: data.drwtNo3,
      drwtNo4: data.drwtNo4,
      drwtNo5: data.drwtNo5,
      drwtNo6: data.drwtNo6,
      bnusNo: data.bnusNo,
    };
  } catch (error) {
    console.error(`Failed to fetch lotto data for draw ${drawNo}:`, error);
    return null;
  }
};

// 가장 최근 토요일 날짜 계산 (추첨일 기준)
export const getLastSaturday = (): Date => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0: 일요일, 6: 토요일

  // 토요일이면서 오후 9시 이후면 오늘이 추첨일
  if (dayOfWeek === 6 && now.getHours() >= 21) {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  // 그 외에는 이전 토요일 찾기
  const daysToSubtract = dayOfWeek === 0 ? 1 : (dayOfWeek === 6 ? 7 : dayOfWeek + 1);
  const lastSaturday = new Date(now);
  lastSaturday.setDate(now.getDate() - daysToSubtract + 1);

  // 토요일로 정확히 맞추기
  while (lastSaturday.getDay() !== 6) {
    lastSaturday.setDate(lastSaturday.getDate() - 1);
  }

  return lastSaturday;
};

// 날짜를 YYYY-MM-DD 형식으로 변환
export const formatDateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 현재 추정 최신 회차 계산 (매주 토요일 추첨, 2002년 12월 7일이 1회차)
export const getExpectedLatestDrawNumber = (): number => {
  const firstDrawDate = new Date('2002-12-07'); // 1회차 추첨일
  const lastSaturday = getLastSaturday();

  // 첫 회차부터 마지막 토요일까지의 주 수 계산
  const diffTime = lastSaturday.getTime() - firstDrawDate.getTime();
  const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));

  return diffWeeks + 1; // 1회차부터 시작
};

// 날짜로 회차 번호 계산
export const getDrawNumberByDate = (targetDate: Date): number => {
  const firstDrawDate = new Date('2002-12-07'); // 1회차 추첨일
  const diffTime = targetDate.getTime() - firstDrawDate.getTime();
  const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
  return diffWeeks + 1;
};

// 최신 회차 정보를 날짜 기반으로 가져오기
export const fetchLatestLottoByDate = async (): Promise<LottoData | null> => {
  const lastSaturday = getLastSaturday();
  const expectedDrawNo = getDrawNumberByDate(lastSaturday);

  console.log(`📅 마지막 토요일: ${formatDateToString(lastSaturday)}, 예상 회차: ${expectedDrawNo}`);

  // 예상 회차부터 시도, 없으면 이전 회차 시도
  for (let drawNo = expectedDrawNo; drawNo >= expectedDrawNo - 2; drawNo--) {
    const data = await fetchLottoData(drawNo);
    if (data) {
      console.log(`✅ ${drawNo}회차 당첨번호 조회 성공`);
      return data;
    }
  }

  return null;
};

// 새로운 로또 데이터를 lottoData.ts에 추가
export const appendLottoDataToFile = (newData: LottoData[]): string => {
  if (newData.length === 0) return '';
  
  const additions = newData.map(data => {
    const dataStr = JSON.stringify(data).replace(/"([^"]+)":/g, '$1:');
    return `,"${data.drwNo}":${dataStr}`;
  }).join('');
  
  return additions;
};

// 미싱된 로또 회차들을 자동으로 가져와서 업데이트
export const updateMissingLottoData = async (): Promise<{
  success: boolean;
  newDraws: LottoData[];
  error?: string;
}> => {
  try {
    const currentLatest = await getLatestDrawNumber();
    const expectedLatest = getExpectedLatestDrawNumber();
    
    console.log(`Current latest: ${currentLatest}, Expected latest: ${expectedLatest}`);
    
    if (currentLatest >= expectedLatest) {
      return {
        success: true,
        newDraws: [],
      };
    }
    
    const newDraws: LottoData[] = [];
    const startFrom = currentLatest + 1;
    
    // 최대 10개 회차까지만 한 번에 업데이트 (API 부하 방지)
    const endAt = Math.min(expectedLatest, startFrom + 9);
    
    for (let drawNo = startFrom; drawNo <= endAt; drawNo++) {
      console.log(`Fetching draw ${drawNo}...`);
      
      const data = await fetchLottoData(drawNo);
      if (data) {
        newDraws.push(data);
        console.log(`✅ Draw ${drawNo} fetched successfully:`, data);
      } else {
        console.log(`❌ Draw ${drawNo} not available yet`);
        break; // 해당 회차가 없으면 더 이상 조회하지 않음
      }
      
      // API 호출 간격 (1초 대기)
      if (drawNo < endAt) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return {
      success: true,
      newDraws,
    };
  } catch (error) {
    console.error('Failed to update missing lotto data:', error);
    return {
      success: false,
      newDraws: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// localStorage에 마지막 업데이트 시간 저장
export const setLastUpdateTime = (): void => {
  localStorage.setItem('lottoLastUpdate', Date.now().toString());
};

export const getLastUpdateTime = (): number => {
  const lastUpdate = localStorage.getItem('lottoLastUpdate');
  return lastUpdate ? parseInt(lastUpdate) : 0;
};

// 업데이트가 필요한지 확인 (하루에 한 번만)
export const shouldUpdate = (): boolean => {
  const lastUpdate = getLastUpdateTime();
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000; // 24시간
  
  return (now - lastUpdate) > oneDay;
};