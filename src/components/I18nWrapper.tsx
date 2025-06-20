'use client'

import React from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMessages } from '@/hooks/useMessages';

interface I18nWrapperProps {
  children: React.ReactNode;
}

const I18nWrapper: React.FC<I18nWrapperProps> = ({ children }) => {
  const { language, isInitialized } = useLanguage();
  const { messages, loading } = useMessages(language);

  console.log('I18nWrapper state:', { language, isInitialized, loading, hasMessages: !!messages }); // 디버깅용

  if (!isInitialized || loading || !messages) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <NextIntlClientProvider locale={language} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
};

export default I18nWrapper;