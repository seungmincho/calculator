'use client'

import React from 'react';
import { Calculator } from 'lucide-react';
import { useTranslations } from 'next-intl';

const Footer = () => {
  const t = useTranslations();

  return (
    <footer className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-2">
            <Calculator className="w-6 h-6 text-blue-600" />
            <span className="text-lg font-semibold">{t('footer.title')}</span>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-center md:text-left max-w-xl">
            {t('footer.description')}
          </p>
        </div>
        <div className="border-t border-gray-300 dark:border-gray-700 mt-6 pt-6 text-center text-gray-600 dark:text-gray-400">
          <p>{t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
