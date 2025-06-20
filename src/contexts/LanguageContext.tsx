'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'ko' | 'en';

interface LanguageContextType {
  language: Language;
  changeLanguage: (newLang: Language) => void;
  isInitialized: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('ko');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // 클라이언트 사이드에서만 실행
    if (typeof window !== 'undefined') {
      // 초기 언어 설정: localStorage -> URL -> 기본값
      const savedLang = localStorage.getItem('language') as Language;
      const urlLang = window.location.pathname.startsWith('/en') ? 'en' : 'ko';
      
      const initialLang = savedLang || urlLang;
      setLanguage(initialLang);
      setIsInitialized(true);
      
      // localStorage에 없으면 현재 언어를 저장
      if (!savedLang) {
        localStorage.setItem('language', initialLang);
      }
    }
  }, []);

  const changeLanguage = (newLang: Language) => {
    console.log('Context: Changing language to:', newLang);
    setLanguage(newLang);
    localStorage.setItem('language', newLang);
    
    // URL 업데이트 (히스토리 변경 없이)
    // const currentPath = window.location.pathname;
    // let newPath = '';
    
    // if (newLang === 'en') {
    //   // 영어로 변경
    //   if (currentPath.startsWith('/en')) {
    //     newPath = currentPath;
    //   } else {
    //     newPath = `/en${currentPath}`;
    //   }
    // } else {
    //   // 한국어로 변경
    //   if (currentPath.startsWith('/en')) {
    //     newPath = currentPath.replace('/en', '') || '/';
    //   } else {
    //     newPath = currentPath;
    //   }
    // }
    
    // window.history.replaceState({}, '', newPath);
  };

  const value = {
    language,
    changeLanguage,
    isInitialized
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};