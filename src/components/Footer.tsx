'use client'

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calculator } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { menuConfig, categoryKeys } from '@/config/menuConfig';

// Each category shows top N popular tools in footer for SEO internal linking
const FOOTER_TOOLS_PER_CATEGORY = 6;

const Footer = () => {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <footer className="relative bg-gray-50/80 dark:bg-white/[0.02] backdrop-blur-xl border-t border-gray-200/60 dark:border-white/[0.06] text-gray-900 dark:text-white mt-20 overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-blue-400/8 dark:bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 right-0 w-64 h-64 bg-violet-400/8 dark:bg-violet-500/5 rounded-full blur-3xl" />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Top section: Logo + Description */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-10">
          <div className="max-w-sm">
            <Link href="/" className="flex items-center space-x-2 mb-3 group">
              <Calculator className="w-7 h-7 text-blue-600 group-hover:text-indigo-600 transition-colors" />
              <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">{t('footer.title')}</span>
            </Link>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {t('footer.description')}
            </p>
          </div>
        </div>

        {/* Category links grid - critical for SEO internal linking */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 mb-10">
          {categoryKeys.map((catKey) => {
            const category = menuConfig[catKey];
            const topItems = category.items.slice(0, FOOTER_TOOLS_PER_CATEGORY);
            return (
              <div key={catKey}>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 uppercase tracking-wide">
                  {t(category.titleKey)}
                </h3>
                <ul className="space-y-2">
                  {topItems.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200"
                      >
                        {t(item.labelKey)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/30 dark:border-white/[0.06] pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-500">
            {t('footer.copyright')}
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-500">
            <Link href="/tips" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {t('navigation.financialTips')}
            </Link>
            <Link href="/games" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {t('footer.links.gameHub')}
            </Link>
            <Link href={`/inquiry${pathname && pathname !== '/' ? `?from=${encodeURIComponent(pathname)}` : ''}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {t('footer.inquiry')}
            </Link>
            <Link href="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {t('footer.privacy')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
