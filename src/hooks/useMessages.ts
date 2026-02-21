'use client'

import { useState, useEffect } from 'react';
import { Language } from '@/contexts/LanguageContext';

export const useMessages = (language: Language) => {
  const [messages, setMessages] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true);
      try {
        const messageModule = await import(`../../messages/${language}.json`);
        setMessages(messageModule.default);
      } catch {
        // fallback to Korean messages
        const fallbackModule = await import(`../../messages/ko.json`);
        setMessages(fallbackModule.default);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [language]);

  return { messages, loading };
};