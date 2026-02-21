'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Calendar, Tag, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Tip {
  id: number;
  category: string;
  tip: string;
}

export default function TipsContent() {
  const t = useTranslations('tipsPage');
  const [tips, setTips] = useState<Tip[]>([]);
  const [filteredTips, setFilteredTips] = useState<Tip[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    const fetchTips = async () => {
      try {
        const response = await fetch('/tips.json');
        const data: Tip[] = await response.json();
        setTips(data);
        setFilteredTips(data);

        const uniqueCategories: string[] = Array.from(new Set(data.map((tip: Tip) => tip.category)));
        setCategories(uniqueCategories);
      } catch (error) {
        console.error('Failed to fetch tips:', error);
      }
    };

    fetchTips();
  }, []);

  useEffect(() => {
    let filtered = tips;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(tip => tip.category === selectedCategory);
    }

    if (searchTerm) {
      filtered = filtered.filter(tip =>
        tip.tip.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tip.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredTips(filtered);
  }, [tips, selectedCategory, searchTerm]);

  const getCategoryCount = (category: string) => {
    if (category === 'all') return tips.length;
    return tips.filter(tip => tip.category === category).length;
  };

  const getCategoryIcon = (category: string) => {
    const iconMap: { [key: string]: string } = {
      '가계 관리': '💰',
      '저축/투자': '📈',
      '신용/대출': '💳',
      '은행/금융상품': '🏦',
      '세금/절세': '📋',
      '보험': '🏥',
      '부동산': '🏠',
      '은퇴/연금': '👴',
      '안전/사기방지': '🔒',
      '금융교육': '📚'
    };
    return iconMap[category] || '💡';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center items-center mb-6">
            <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-full">
              <TrendingUp className="w-12 h-12 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            {t('title')}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            {t('subtitle')}{' '}
            {t('tipCount', { count: tips.length })}
          </p>

          {/* Search Bar */}
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Tag className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('categoryFilter')}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
              }`}
            >
              {t('allCategories')} ({getCategoryCount('all')})
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                }`}
              >
                {getCategoryIcon(category)} {category} ({getCategoryCount(category)})
              </button>
            ))}
          </div>
        </div>

        {/* Tips Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTips.map((tip) => (
            <Link
              key={tip.id}
              href={`/tips/${tip.id}`}
              className="block group"
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border border-gray-200 dark:border-gray-700 group-hover:border-blue-300 dark:group-hover:border-blue-600">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getCategoryIcon(tip.category)}</span>
                    <div className="flex flex-col">
                      <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                        #{tip.id}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {tip.category}
                      </span>
                    </div>
                  </div>
                  <Calendar className="w-4 h-4 text-gray-400" />
                </div>

                <p className="text-gray-800 dark:text-gray-200 line-clamp-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {tip.tip}
                </p>

                <div className="mt-4 flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium">
                  {t('readMore')}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* No Results */}
        {filteredTips.length === 0 && (searchTerm || selectedCategory !== 'all') && (
          <div className="text-center py-12">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t('noResults')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {t('noResultsHint')}
            </p>
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-16 text-center bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {t('ctaTitle')}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {t('ctaDescription')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {t('salaryCalculator')}
            </Link>
            <Link
              href="/loan-calculator"
              className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white px-6 py-3 rounded-lg font-medium border border-gray-300 dark:border-gray-600 transition-colors"
            >
              {t('loanCalculator')}
            </Link>
            <Link
              href="/savings-calculator"
              className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white px-6 py-3 rounded-lg font-medium border border-gray-300 dark:border-gray-600 transition-colors"
            >
              {t('savingsCalculator')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
