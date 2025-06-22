'use client'

import React from 'react';
import { Calculator } from 'lucide-react';
import { useTranslations } from 'next-intl';

const Footer = () => {
  const t = useTranslations();

  return (
    <footer className="bg-gray-900 dark:bg-gray-950 text-white mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-5 gap-8">
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
              <li><a href="/car-loan-calculator" className="hover:text-white transition-colors">{t('footer.links.carLoanCalculator')}</a></li>
              <li><a href="/car-tax-calculator" className="hover:text-white transition-colors">{t('footer.links.carTaxCalculator')}</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">{t('footer.tools')}</h3>
            <ul className="space-y-2 text-gray-400 dark:text-gray-500">
              <li><a href="/json-formatter" className="hover:text-white transition-colors">{t('footer.links.jsonFormatter')}</a></li>
              <li><a href="/json-csv-converter" className="hover:text-white transition-colors">{t('footer.links.jsonCsvConverter')}</a></li>
              <li><a href="/jwt-decoder" className="hover:text-white transition-colors">{t('footer.links.jwtDecoder')}</a></li>
              <li><a href="/uuid-generator" className="hover:text-white transition-colors">{t('footer.links.uuidGenerator')}</a></li>
              <li><a href="/cron-tester" className="hover:text-white transition-colors">{t('footer.links.cronTester')}</a></li>
              <li><a href="/sql-formatter" className="hover:text-white transition-colors">{t('footer.links.sqlFormatter')}</a></li>
              <li><a href="/markdown-viewer" className="hover:text-white transition-colors">{t('footer.links.markdownViewer')}</a></li>
              <li><a href="/image-resizer" className="hover:text-white transition-colors">{t('footer.links.imageResizer')}</a></li>
              <li><a href="/image-editor" className="hover:text-white transition-colors">{t('footer.links.imageEditor')}</a></li>
              <li><a href="/regex-extractor" className="hover:text-white transition-colors">{t('footer.links.regexExtractor')}</a></li>
              <li><a href="/time-converter" className="hover:text-white transition-colors">{t('footer.links.timeConverter')}</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">{t('navigation.healthTools')}</h3>
            <ul className="space-y-2 text-gray-400 dark:text-gray-500">
              <li><a href="/bmi-calculator" className="hover:text-white transition-colors">{t('footer.links.bmiCalculator')}</a></li>
              <li><a href="/calorie-calculator" className="hover:text-white transition-colors">{t('footer.links.calorieCalculator')}</a></li>
              <li><a href="/body-fat-calculator" className="hover:text-white transition-colors">{t('footer.links.bodyFatCalculator')}</a></li>
              <li><a href="/work-hours-calculator" className="hover:text-white transition-colors">{t('footer.links.workHoursCalculator')}</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">{t('navigation.simpleGames')}</h3>
            <ul className="space-y-2 text-gray-400 dark:text-gray-500">
              <li><a href="/lotto-generator" className="hover:text-white transition-colors">{t('footer.links.lottoGenerator')}</a></li>
              <li><a href="/ladder-game" className="hover:text-white transition-colors">{t('footer.links.ladderGame')}</a></li>
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