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

// 특정 회차 당첨번호 조회
export const fetchLottoData = async (drawNo: number): Promise<LottoData | null> => {
  try {
    const url = `https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${drawNo}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: LottoApiResponse = await response.json();
    
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

// 현재 추정 최신 회차 계산 (매주 토요일 추첨, 2002년 12월 7일이 1회차)
export const getExpectedLatestDrawNumber = (): number => {
  const firstDrawDate = new Date('2002-12-07'); // 1회차 추첨일
  const now = new Date();
  
  // 현재 시간이 토요일 오후 8시 45분(추첨시간) 이전이면 전주까지만 계산
  const currentSaturday = new Date(now);
  const dayOfWeek = now.getDay(); // 0: 일요일, 6: 토요일
  const daysUntilSaturday = dayOfWeek === 0 ? 6 : 6 - dayOfWeek;
  currentSaturday.setDate(now.getDate() + daysUntilSaturday);
  currentSaturday.setHours(20, 45, 0, 0); // 오후 8시 45분
  
  let targetDate = currentSaturday;
  if (now < currentSaturday) {
    // 아직 이번주 추첨 전이면 지난주로 설정
    targetDate = new Date(currentSaturday);
    targetDate.setDate(targetDate.getDate() - 7);
  }
  
  // 첫 회차부터 목표 날짜까지의 주 수 계산
  const diffTime = targetDate.getTime() - firstDrawDate.getTime();
  const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
  
  return diffWeeks + 1; // 1회차부터 시작
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