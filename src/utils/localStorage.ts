// localStorage 유틸리티 함수들

export interface CalculationHistory {
  id: string;
  type: 'salary' | 'loan' | 'savings' | 'retirement' | 'tax' | 'exchange' | 'real-estate' | 'stock' | 'car-loan' | 'car-tax' | 'bmi' | 'calorie' | 'bodyFat' | 'workHours' | 'lotto' | 'ladder';
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
  },

  stock: (inputs: any): string => {
    const purchasePrice = parseInt(inputs.purchasePrice?.replace(/,/g, '') || '0');
    const currentPrice = parseInt(inputs.currentPrice?.replace(/,/g, '') || '0');
    const shares = parseInt(inputs.shares?.replace(/,/g, '') || '1');
    const priceRange = Math.floor(purchasePrice / 1000);
    return `주식 ${priceRange}천원 ${shares}주`;
  },

  'car-loan': (inputs: any): string => {
    const carPrice = parseInt(inputs.carPrice?.toString().replace(/,/g, '') || '0');
    const loanTerm = inputs.loanTerm || '60';
    const priceRange = Math.floor(carPrice / 10000000);
    return `자동차할부 ${priceRange}천만원 ${loanTerm}개월`;
  },

  'car-tax': (inputs: any): string => {
    const carPrice = parseInt(inputs.carPrice?.toString().replace(/,/g, '') || '0');
    const carType = inputs.carType || 'passenger';
    const fuelType = inputs.fuelType || 'gasoline';
    const priceRange = Math.floor(carPrice / 10000000);
    
    const typeLabels = {
      compact: '경차',
      passenger: '승용차',
      van: '승합차',
      truck: '화물차',
      motorcycle: '이륜차'
    };
    
    const fuelLabels = {
      gasoline: '휘발유',
      diesel: '경유',
      lpg: 'LPG',
      electric: '전기',
      hybrid: '하이브리드'
    };
    
    const typeLabel = typeLabels[carType as keyof typeof typeLabels] || '승용차';
    const fuelLabel = fuelLabels[fuelType as keyof typeof fuelLabels] || '휘발유';
    
    return `${typeLabel}(${fuelLabel}) ${priceRange}천만원`;
  },

  bmi: (inputs: any): string => {
    const height = inputs.height || 0;
    const weight = inputs.weight || 0;
    const gender = inputs.gender || 'male';
    const age = inputs.age || 0;
    
    const genderLabel = gender === 'male' ? '남성' : '여성';
    const ageText = age > 0 ? `${age}세 ` : '';
    
    return `${ageText}${genderLabel} ${height}cm ${weight}kg`;
  },

  calorie: (inputs: any): string => {
    const weight = inputs.weight || 0;
    const goal = inputs.goal || 'maintain';
    const activityLevel = inputs.activityLevel || 'moderate';
    
    const goalLabels = {
      loseFast: '빠른감량',
      loseModerate: '감량',
      loseSlow: '완만감량',
      maintain: '유지',
      gainSlow: '완만증량',
      gainModerate: '증량',
      gainFast: '빠른증량'
    };
    
    const activityLabels = {
      sedentary: '저활동',
      light: '가벼운활동',
      moderate: '보통활동',
      active: '활발한활동',
      veryActive: '매우활발'
    };
    
    const goalLabel = goalLabels[goal as keyof typeof goalLabels] || '유지';
    const activityLabel = activityLabels[activityLevel as keyof typeof activityLabels] || '보통활동';
    
    return `${weight}kg ${goalLabel} ${activityLabel}`;
  },

  bodyFat: (inputs: any): string => {
    const weight = inputs.weight || 0;
    const gender = inputs.gender || 'male';
    const formula = inputs.formula || 'navy';
    
    const genderLabel = gender === 'male' ? '남성' : '여성';
    const formulaLabels = {
      navy: 'Navy공식',
      ymca: 'YMCA공식',
      'covert-bailey': 'Bailey공식'
    };
    
    const formulaLabel = formulaLabels[formula as keyof typeof formulaLabels] || 'Navy공식';
    
    return `${genderLabel} ${weight}kg ${formulaLabel}`;
  },

  workHours: (inputs: any): string => {
    const hourlyWage = inputs.hourlyWage || 0;
    const totalHours = inputs.totalHours || 0;
    const workDays = inputs.workDays || 0;
    
    const wageText = Math.floor(hourlyWage / 1000);
    const hoursText = totalHours.toFixed(1);
    
    return `시급 ${wageText}천원 ${hoursText}시간 ${workDays}일`;
  },

  lotto: (inputs: any): string => {
    const generateMethod = inputs.generateMethod || 'random';
    const numberOfSets = inputs.numberOfSets || 1;
    const excludedCount = inputs.excludedNumbers?.length || 0;
    
    const methodLabels = {
      random: '랜덤',
      statistics: '통계기반',
      mixed: '혼합방식'
    };
    
    const methodLabel = methodLabels[generateMethod as keyof typeof methodLabels] || '랜덤';
    const excludeText = excludedCount > 0 ? ` 제외${excludedCount}개` : '';
    
    return `${methodLabel} ${numberOfSets}게임${excludeText}`;
  },

  ladder: (inputs: any): string => {
    const participantCount = inputs.participants?.length || 0;
    const ladderLinesCount = inputs.ladderLinesCount || 0;
    const participants = inputs.participants || [];
    
    const participantNames = participants.slice(0, 3).join(', ');
    const moreText = participantCount > 3 ? ` 외 ${participantCount - 3}명` : '';
    
    return `${participantNames}${moreText} (${participantCount}명)`;
  }
};