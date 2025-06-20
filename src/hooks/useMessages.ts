'use client'

import { useState, useEffect } from 'react';
import { Language } from '@/contexts/LanguageContext';

export const useMessages = (language: Language) => {
  const [messages, setMessages] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMessages = async () => {
      console.log('Loading messages for language:', language); // 디버깅용
      setLoading(true);
      try {
        const messageModule = await import(`../../messages/${language}.json`);
        setMessages(messageModule.default);
        console.log('Messages loaded successfully for:', language); // 디버깅용
      } catch (error) {
        console.error('Failed to load messages:', error);
        // fallback to Korean messages
        const fallbackModule = await import(`../../messages/ko.json`);
        setMessages(fallbackModule.default);
        console.log('Fallback to Korean messages'); // 디버깅용
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [language]);

  return { messages, loading };
};