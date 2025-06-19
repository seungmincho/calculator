import { useState, useEffect, useCallback } from 'react';
import { 
  CalculationHistory, 
  historyStorage, 
  generateHistoryTitle 
} from '@/utils/localStorage';

export const useCalculationHistory = (calculatorType: CalculationHistory['type']) => {
  const [histories, setHistories] = useState<CalculationHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 이력 목록 로드
  const loadHistories = useCallback(() => {
    setIsLoading(true);
    try {
      const allHistories = historyStorage.getByType(calculatorType);
      setHistories(allHistories);
    } catch (error) {
      console.error('Failed to load calculation histories:', error);
      setHistories([]);
    } finally {
      setIsLoading(false);
    }
  }, [calculatorType]);

  // 컴포넌트 마운트시 이력 로드
  useEffect(() => {
    loadHistories();
  }, [loadHistories]);

  // 새로운 계산 결과 저장
  const saveCalculation = useCallback((inputs: Record<string, any>, result: Record<string, any>) => {
    try {
      const title = generateHistoryTitle[calculatorType](inputs);
      
      const success = historyStorage.add({
        type: calculatorType,
        inputs,
        result,
        title
      });

      if (success) {
        loadHistories(); // 저장 후 목록 새로고침
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to save calculation:', error);
      return false;
    }
  }, [calculatorType, loadHistories]);

  // 특정 이력 삭제
  const removeHistory = useCallback((id: string) => {
    try {
      const success = historyStorage.remove(id);
      if (success) {
        loadHistories(); // 삭제 후 목록 새로고침
      }
      return success;
    } catch (error) {
      console.error('Failed to remove history:', error);
      return false;
    }
  }, [loadHistories]);

  // 모든 이력 삭제 (해당 계산기 타입만)
  const clearHistories = useCallback(() => {
    try {
      const success = historyStorage.removeByType(calculatorType);
      if (success) {
        setHistories([]);
      }
      return success;
    } catch (error) {
      console.error('Failed to clear histories:', error);
      return false;
    }
  }, [calculatorType]);

  // 이력에서 입력값 복원
  const loadFromHistory = useCallback((historyId: string) => {
    const history = histories.find(h => h.id === historyId);
    return history ? history.inputs : null;
  }, [histories]);

  return {
    histories,
    isLoading,
    saveCalculation,
    removeHistory,
    clearHistories,
    loadFromHistory,
    refreshHistories: loadHistories
  };
};