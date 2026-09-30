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
        className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm text-sub hover:bg-soft transition-colors"
      >
        <Languages className="w-4 h-4" />
        <span className="hidden xl:inline">{currentLanguage.name}</span>
        <span className="xl:hidden">{currentLanguage.code.toUpperCase()}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-36 bg-surface rounded-xl shadow-xl border border-line p-1 z-50">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={`w-full flex items-center px-3 py-2 rounded-lg text-sm hover:bg-soft transition-colors ${
                currentLanguage.code === language.code
                  ? 'text-primary font-semibold'
                  : 'text-body'
              }`}
            >
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