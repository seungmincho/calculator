// localStorage 유틸리티 함수들

export interface CalculationHistory {
  id: string;
  type: 'salary' | 'loan' | 'savings' | 'retirement' | 'tax' | 'exchange' | 'real-estate';
  timestamp: number;
  inputs: Record<string, any>;
  result: Record<string, any>;
  title: string;
}

export const STORAGE_KEYS = {
  CALCULATION_HISTORY: 'calculation_history',
  FAVORITES: 'favorites',
  SETTINGS: 'user_settings'
} as const;

// localStorage 안전하게 사용하는 함수들
export const safeStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('localStorage.getItem failed:', error);
      return null;
    }
  },

  setItem: (key: string, value: string): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn('localStorage.setItem failed:', error);
      return false;
    }
  },

  removeItem: (key: string): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn('localStorage.removeItem failed:', error);
      return false;
    }
  }
};

// 계산 이력 관리 함수들
export const historyStorage = {
  // 모든 계산 이력 가져오기
  getAll: (): CalculationHistory[] => {
    const data = safeStorage.getItem(STORAGE_KEYS.CALCULATION_HISTORY);
    if (!data) return [];
    
    try {
      return JSON.parse(data);
    } catch (error) {
      console.warn('Failed to parse calculation history:', error);
      return [];
    }
  },

  // 특정 타입의 계산 이력 가져오기
  getByType: (type: CalculationHistory['type']): CalculationHistory[] => {
    return historyStorage.getAll().filter(item => item.type === type);
  },

  // 새로운 계산 이력 추가
  add: (history: Omit<CalculationHistory, 'id' | 'timestamp'>): boolean => {
    const newHistory: CalculationHistory = {
      ...history,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
    };

    const histories = historyStorage.getAll();
    const updatedHistories = [newHistory, ...histories].slice(0, 50); // 최대 50개만 보관

    return safeStorage.setItem(
      STORAGE_KEYS.CALCULATION_HISTORY,
      JSON.stringify(updatedHistories)
    );
  },

  // 특정 이력 삭제
  remove: (id: string): boolean => {
    const histories = historyStorage.getAll();
    const updatedHistories = histories.filter(item => item.id !== id);
    
    return safeStorage.setItem(
      STORAGE_KEYS.CALCULATION_HISTORY,
      JSON.stringify(updatedHistories)
    );
  },

  // 특정 타입의 모든 이력 삭제
  removeByType: (type: CalculationHistory['type']): boolean => {
    const histories = historyStorage.getAll();
    const updatedHistories = histories.filter(item => item.type !== type);
    
    return safeStorage.setItem(
      STORAGE_KEYS.CALCULATION_HISTORY,
      JSON.stringify(updatedHistories)
    );
  },

  // 모든 이력 삭제
  clear: (): boolean => {
    return safeStorage.removeItem(STORAGE_KEYS.CALCULATION_HISTORY);
  }
};

// 계산 이력 제목 생성 헬퍼 함수들
export const generateHistoryTitle = {
  salary: (inputs: any): string => {
    const salary = parseInt(inputs.salary?.replace(/,/g, '') || '0');
    const type = inputs.salaryType || 'annual';
    const amount = Math.floor(salary / (type === 'monthly' ? 1000000 : 10000000));
    const unit = type === 'monthly' ? '월급' : '연봉';
    return `${unit} ${amount}${type === 'monthly' ? '백만원' : '천만원'}`;
  },
  
  loan: (inputs: any): string => {
    const amount = parseInt(inputs.loanAmount?.replace(/,/g, '') || '0');
    const years = inputs.loanTerm || '';
    return `대출 ${Math.floor(amount / 10000000)}천만원 ${years}년`;
  },
  
  savings: (inputs: any): string => {
    const monthly = parseInt(inputs.monthlyAmount?.replace(/,/g, '') || '0');
    const months = inputs.period || '';
    return `적금 월 ${Math.floor(monthly / 10000)}만원 ${months}개월`;
  },
  
  retirement: (inputs: any): string => {
    const years = inputs.workYears || '';
    const months = inputs.workMonths || '';
    return `퇴직금 ${years}년 ${months}개월`;
  },
  
  tax: (inputs: any): string => {
    const type = inputs.taxType || 'income';
    const typeNames = { income: '소득세', vat: '부가세', capital: '양도소득세' };
    return `${typeNames[type as keyof typeof typeNames] || '세금'} 계산`;
  },
  
  exchange: (inputs: any): string => {
    const from = inputs.fromCurrency || 'USD';
    const to = inputs.toCurrency || 'KRW';
    return `환율 ${from} → ${to}`;
  },
  
  'real-estate': (inputs: any): string => {
    const type = inputs.calculatorType || 'jeonse';
    const typeNames = { 
      'jeonse-loan': '전세대출', 
      'mortgage-loan': '주택담보대출', 
      'acquisition-tax': '취득세' 
    };
    return typeNames[type as keyof typeof typeNames] || '부동산';
  }
};