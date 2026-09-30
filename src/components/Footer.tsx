'use client'

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calculator } from 'lucide-react';
import { useTranslations } from '@/lib/i18n';
import { menuConfig, categoryKeys } from '@/config/menuConfig';

// Each category shows top N popular tools in footer for SEO internal linking
const FOOTER_TOOLS_PER_CATEGORY = 6;

const Footer = () => {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <footer className="relative bg-surface border-t border-line text-fg mt-20">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Top section: Logo + Description */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-10">
          <div className="max-w-sm">
            <Link href="/" className="flex items-center space-x-2 mb-3 group">
              <span className="w-7 h-7 rounded-lg bg-primary text-white inline-flex items-center justify-center"><Calculator className="w-4 h-4" strokeWidth={2.25} /></span>
              <span className="text-[17px] font-bold tracking-tight text-fg">{t('footer.title')}</span>
            </Link>
            <p className="text-sm text-sub leading-relaxed">
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
                <h3 className="text-sm font-semibold text-fg mb-3 uppercase tracking-wide">
                  {t(category.titleKey)}
                </h3>
                <ul className="space-y-2">
                  {topItems.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="text-sm text-sub hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200"
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
        <div className="border-t border-line pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted">
            {t('footer.copyright')}
          </p>
          <div className="flex items-center gap-4 text-sm text-muted">
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
