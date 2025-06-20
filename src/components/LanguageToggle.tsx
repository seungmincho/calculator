'use client'

import React, { useState } from 'react';
import { Languages } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

type LanguageCodeType = 'ko' | 'en'
const LanguageToggle = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { language, changeLanguage } = useLanguage();

  const languages: {code: LanguageCodeType, name: string, flag: string}[] = [
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' }
  ];

  const currentLanguage = languages.find(lang => lang.code === language) || languages[0];

  const handleLanguageChange = (langCode: LanguageCodeType) => {
    changeLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <Languages className="w-4 h-4" />
        <span className="hidden sm:inline">{currentLanguage.name}</span>
        <span className="sm:hidden">{currentLanguage.flag}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={`w-full flex items-center space-x-3 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                currentLanguage.code === language.code
                  ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30'
                  : 'text-gray-700 dark:text-gray-200'
              }`}
            >
              <span className="text-lg">{language.flag}</span>
              <span>{language.name}</span>
            </button>
          ))}
        </div>
      )}
      
      {/* Overlay to close dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default LanguageToggle;