// 로또 데이터 자동 업데이트 Hook

import { useState, useEffect, useCallback } from 'react';
import { getLottoData, addNewLottoData, getDataStatistics, getNumberStatistics, getRecentDraws } from '@/utils/lottoDataLoader';
import { updateMissingLottoData, shouldUpdate, setLastUpdateTime } from '@/utils/lottoUpdater';

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
  // 데이터 상태
  lottoData: Record<string, LottoDrawData>;
  latestDrawData: LottoDrawData | null;
  recentDraws: LottoDrawData[];
  numberStats: NumberStatistics | null;
  
  // 상태 정보
  isLoading: boolean;
  isUpdating: boolean;
  updateStatus: string;
  dataStats: {
    totalDraws: number;
    latestDraw: number;
    latestDate: string;
    dataUpToDate: boolean;
  } | null;
  
  // 함수
  refreshData: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
  getDrawByNumber: (drawNo: number) => LottoDrawData | null;
}

export const useLottoData = (): UseLottoDataReturn => {
  const [lottoData, setLottoData] = useState<Record<string, LottoDrawData>>({});
  const [latestDrawData, setLatestDrawData] = useState<LottoDrawData | null>(null);
  const [recentDraws, setRecentDraws] = useState<LottoDrawData[]>([]);
  const [numberStats, setNumberStats] = useState<NumberStatistics | null>(null);
  const [dataStats, setDataStats] = useState<{
    totalDraws: number;
    latestDraw: number;
    latestDate: string;
    dataUpToDate: boolean;
  } | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');

  // 데이터 로드
  const loadData = useCallback(async (showStatus = false) => {
    try {
      if (showStatus) {
        setIsLoading(true);
        setUpdateStatus('로또 데이터 로드 중...');
      }
      
      // 기본 데이터 로드
      const data = await getLottoData();
      setLottoData(data);
      
      // 통계 정보 계산
      const stats = await getDataStatistics();
      setDataStats(stats);
      
      // 최신 회차 데이터 설정
      if (stats.latestDraw > 0) {
        const latest = data[stats.latestDraw.toString()];
        setLatestDrawData(latest || null);
      }
      
      // 최근 회차 데이터 가져오기
      const recent = await getRecentDraws(20);
      setRecentDraws(recent);
      
      // 번호 통계 계산
      const numStats = await getNumberStatistics(50);
      setNumberStats(numStats);
      
      if (showStatus) {
        setUpdateStatus('완료');
        setTimeout(() => setUpdateStatus(''), 2000);
      }
      
    } catch (error) {
      console.error('Failed to load lotto data:', error);
      if (showStatus) {
        setUpdateStatus('로드 실패');
        setTimeout(() => setUpdateStatus(''), 3000);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 업데이트 확인 및 실행
  const checkForUpdates = useCallback(async () => {
    if (isUpdating) return;
    
    try {
      setIsUpdating(true);
      setUpdateStatus('최신 회차 확인 중...');
      
      const updateResult = await updateMissingLottoData();
      
      if (updateResult.success) {
        if (updateResult.newDraws.length > 0) {
          setUpdateStatus(`${updateResult.newDraws.length}개 회차 업데이트 중...`);
          
          // 새 데이터를 localStorage에 저장
          addNewLottoData(updateResult.newDraws);
          
          // 마지막 업데이트 시간 저장
          setLastUpdateTime();
          
          // 데이터 다시 로드
          await loadData(false);
          
          setUpdateStatus(`✅ ${updateResult.newDraws.length}개 회차 업데이트 완료`);
          
          console.log('✅ 로또 데이터 업데이트 완료:', updateResult.newDraws.map(d => `${d.drwNo}회차`).join(', '));
        } else {
          setUpdateStatus('✅ 최신 상태');
        }
      } else {
        setUpdateStatus(`❌ 업데이트 실패: ${updateResult.error || 'Unknown error'}`);
      }
      
    } catch (error) {
      console.error('Update check failed:', error);
      setUpdateStatus('❌ 업데이트 확인 실패');
    } finally {
      setIsUpdating(false);
      setTimeout(() => setUpdateStatus(''), 3000);
    }
  }, [isUpdating, loadData]);

  // 데이터 새로고침
  const refreshData = useCallback(async () => {
    await loadData(true);
  }, [loadData]);

  // 특정 회차 데이터 가져오기
  const getDrawByNumber = useCallback((drawNo: number): LottoDrawData | null => {
    return lottoData[drawNo.toString()] || null;
  }, [lottoData]);

  // 초기 데이터 로드
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 자동 업데이트 확인 (하루에 한 번)
  useEffect(() => {
    const checkAutoUpdate = async () => {
      if (shouldUpdate() && !isUpdating) {
        console.log('📅 일일 로또 데이터 업데이트 확인 시작');
        await checkForUpdates();
      }
    };

    // 컴포넌트 마운트 후 2초 뒤에 자동 업데이트 확인
    const timer = setTimeout(checkAutoUpdate, 2000);
    
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 주기적 업데이트 확인 (1시간마다)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (shouldUpdate() && !isUpdating) {
        console.log('🔄 주기적 로또 데이터 업데이트 확인');
        await checkForUpdates();
      }
    }, 60 * 60 * 1000); // 1시간

    return () => clearInterval(interval);
  }, [checkForUpdates, isUpdating]);

  return {
    // 데이터
    lottoData,
    latestDrawData,
    recentDraws,
    numberStats,
    
    // 상태
    isLoading,
    isUpdating,
    updateStatus,
    dataStats,
    
    // 함수
    refreshData,
    checkForUpdates,
    getDrawByNumber,
  };
};