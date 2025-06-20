'use client'

import React from 'react';
import { Calculator } from 'lucide-react';
import { useTranslations } from 'next-intl';

const Footer = () => {
  const t = useTranslations();

  return (
    <footer className="bg-gray-900 dark:bg-gray-950 text-white mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Calculator className="w-6 h-6" />
              <span className="text-lg font-semibold">{t('footer.title')}</span>
            </div>
            <p className="text-gray-400 dark:text-gray-500">
              {t('footer.description')}
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-4">{t('footer.calculators')}</h3>
            <ul className="space-y-2 text-gray-400 dark:text-gray-500">
              <li><a href="/" className="hover:text-white transition-colors">{t('footer.links.salaryCalculator')}</a></li>
              <li><a href="/loan-calculator" className="hover:text-white transition-colors">{t('footer.links.loanCalculator')}</a></li>
              <li><a href="/savings-calculator" className="hover:text-white transition-colors">{t('footer.links.savingsCalculator')}</a></li>
              <li><a href="/stock-calculator" className="hover:text-white transition-colors">{t('footer.links.stockCalculator')}</a></li>
              <li><a href="/retirement-calculator" className="hover:text-white transition-colors">{t('footer.links.retirementCalculator')}</a></li>
              <li><a href="/tax-calculator" className="hover:text-white transition-colors">{t('footer.links.taxCalculator')}</a></li>
              <li><a href="/exchange-calculator" className="hover:text-white transition-colors">{t('footer.links.exchangeCalculator')}</a></li>
              <li><a href="/real-estate-calculator" className="hover:text-white transition-colors">{t('footer.links.realEstateCalculator')}</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">{t('footer.tools')}</h3>
            <ul className="space-y-2 text-gray-400 dark:text-gray-500">
              <li><a href="/json-formatter" className="hover:text-white transition-colors">{t('footer.links.jsonFormatter')}</a></li>
              <li><a href="/sql-formatter" className="hover:text-white transition-colors">{t('footer.links.sqlFormatter')}</a></li>
              <li><a href="/markdown-viewer" className="hover:text-white transition-colors">{t('footer.links.markdownViewer')}</a></li>
              <li><a href="/image-resizer" className="hover:text-white transition-colors">{t('footer.links.imageResizer')}</a></li>
              <li><a href="/image-editor" className="hover:text-white transition-colors">{t('footer.links.imageEditor')}</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-700 dark:border-gray-800 mt-8 pt-8 text-center text-gray-400 dark:text-gray-500">
          <p>{t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;