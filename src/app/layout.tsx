import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Script from 'next/script'
import { Calculator } from 'lucide-react'
// import { Analytics } from "@vercel/analytics/next" // Removed for Cloudflare Pages
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import DailyTips from '@/components/DailyTips'
import ProgressBar from '@/components/ProgressBar'
import ToolsShowcase from '@/components/ToolsShowcase'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'
import ToolJsonLd from '@/components/ToolJsonLd'
import SkipToContent from '@/components/SkipToContent'
import { LanguageProvider } from '@/contexts/LanguageContext'
import I18nWrapper from '@/components/I18nWrapper'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://toolhub.ai.kr'),
  title: {
    default: '툴허브 - 연봉, 대출, 시간변환 계산기 | 무료 온라인 도구',
    template: '%s | 툴허브'
  },
  description: '연봉 실수령액, 대출 상환, 적금 이자, 시간변환까지! 금융계산기부터 개발자 도구까지 모든 계산을 한 곳에서 해결하세요.',
  keywords: '툴허브, 계산기, 연봉계산기, 대출계산기, 적금계산기, 시간변환기, 타임존변환, Unix타임스탬프, 실수령액계산, 정규식추출기, JSON 포맷터, SQL 포맷터, Markdown 뷰어, 바코드 생성기, QR코드 생성기, 온라인도구, 무료계산기, 개발자도구',
  authors: [{ name: '툴허브' }],
  creator: '툴허브',
  publisher: '툴허브',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' }
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ],
    other: [
      { rel: 'mask-icon', url: '/safari-pinned-tab.svg', color: '#2563eb' }
    ]
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://toolhub.ai.kr',
    siteName: '툴허브',
    title: '툴허브 - 필수 계산기와 개발자 도구 모음',
    description: '연봉, 대출, 시간변환부터 바코드 생성, JSON 포맷터까지 모든 계산을 한 곳에서 해결하세요',
    images: [
      {
        url: 'https://toolhub.ai.kr/og-image-1200x630.png',
        width: 1200,
        height: 630,
        alt: '툴허브 - 온라인 계산기와 개발자 도구 모음',
      },
      {
        url: 'https://toolhub.ai.kr/og-image-600x315.png',
        width: 600,
        height: 315,
        alt: '툴허브 - 온라인 계산기와 개발자 도구 모음',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@toolhub_kr',
    creator: '@toolhub_kr',
    title: '툴허브 - 필수 계산기와 개발자 도구 모음',
    description: '연봉, 대출, 시간변환부터 바코드 생성까지 모든 계산을 한 곳에서',
    images: ['https://toolhub.ai.kr/og-image-1200x630.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code', // Google Search Console에서 받은 코드
    // naver: 'your-naver-verification-code', // 네이버 웹마스터도구 코드
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_ID || 'ca-pub-2070759131396958'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '툴허브',
    alternateName: 'ToolHub',
    description: '연봉, 대출, 적금 계산기부터 시간변환, 바코드 생성, JSON 포맷터까지 실용적인 온라인 도구 모음',
    url: 'https://toolhub.ai.kr',
    inLanguage: 'ko-KR',
    audience: {
      '@type': 'Audience',
      audienceType: ['developers', 'financial professionals', 'general users']
    },
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'All',
    keywords: [
      '연봉계산기', '대출계산기', '적금계산기', '시간변환기', '바코드생성기', 
      'QR코드생성기', 'JSON포맷터', 'SQL포맷터', '정규식추출기', '개발자도구'
    ],
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://toolhub.ai.kr/search?q={search_term_string}'
      },
      'query-input': 'required name=search_term_string'
    },
    publisher: {
      '@type': 'Organization',
      name: '툴허브',
      url: 'https://toolhub.ai.kr',
      logo: {
        '@type': 'ImageObject',
        url: 'https://toolhub.ai.kr/logo.png',
        width: 120,
        height: 120
      }
    },
    mainEntity: {
      '@type': 'SoftwareApplication',
      name: '툴허브',
      applicationCategory: 'WebApplication',
      applicationSubCategory: 'FinanceApplication',
      operatingSystem: 'All',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'KRW'
      },
      featureList: [
        '연봉 실수령액 계산',
        '대출 상환금 계산', 
        '적금 이자 계산',
        '시간대 변환',
        'Unix 타임스탬프 변환',
        '바코드 생성',
        'QR 코드 생성',
        'JSON 포맷팅',
        'SQL 포맷팅',
        '정규식 추출'
      ]
    }
  }

  return (
    <html lang="ko">
      <head>
        <meta name="google-adsense-account" content={adsenseId} />
        <meta name="naver-site-verification" content="8cdcacf38562d4fa1ee11f4f77a8a0f15f11d532" />
        
        {/* Essential OG Tags for Static Export */}
        <meta property="og:title" content="툴허브 - 필수 계산기와 개발자 도구 모음" />
        <meta property="og:description" content="연봉, 대출, 시간변환부터 바코드 생성, JSON 포맷터까지 모든 계산을 한 곳에서 해결하세요" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://toolhub.ai.kr" />
        <meta property="og:site_name" content="툴허브" />
        <meta property="og:locale" content="ko_KR" />
        <meta property="og:image" content="https://toolhub.ai.kr/og-image-1200x630.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="툴허브 - 온라인 계산기와 개발자 도구 모음" />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@toolhub_kr" />
        <meta name="twitter:creator" content="@toolhub_kr" />
        <meta name="twitter:title" content="툴허브 - 필수 계산기와 개발자 도구 모음" />
        <meta name="twitter:description" content="연봉, 대출, 시간변환부터 바코드 생성까지 모든 계산을 한 곳에서" />
        <meta name="twitter:image" content="https://toolhub.ai.kr/og-image-1200x630.png" />
        
        {/* Additional SEO Meta Tags */}
        <meta name="theme-color" content="#2563eb" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-TileImage" content="/android-chrome-192x192.png" />
        <meta name="application-name" content="툴허브" />
        <meta name="apple-mobile-web-app-title" content="툴허브" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
        
        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
        
        {/* DNS Prefetch */}
        <link rel="dns-prefetch" href="//www.google-analytics.com" />
        <link rel="dns-prefetch" href="//www.googletagmanager.com" />
        
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        
        {/* AdSense Script in Head */}
        {adsenseId && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseId}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body className={`${inter.className} min-h-screen bg-white dark:bg-gray-900`}>
        {/* Axeptio Cookie Consent Script with Google Consent Mode 
        <Script
          id="axeptio-settings"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.axeptioSettings = {
                clientId: "6852548e237197d2502e4208",
                cookiesVersion: "toolhub-en-EU-2",
                googleConsentMode: {
                  default: {
                    analytics_storage: "denied",
                    ad_storage: "denied",
                    ad_user_data: "denied",
                    ad_personalization: "denied",
                    wait_for_update: 500
                  }
                }
              };
            `
          }}
        />
        <Script
          id="axeptio-sdk"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(d, s) {
                var t = d.getElementsByTagName(s)[0], e = d.createElement(s);
                e.async = true; 
                e.src = "//static.axept.io/sdk.js";
                t.parentNode.insertBefore(e, t);
              })(document, "script");
            `
          }}
        />
        
        */}
        <LanguageProvider>
          <I18nWrapper>
            <SkipToContent />
            <ProgressBar />
            <Header />
            {/* Breadcrumb Navigation */}
            <Breadcrumb />
            {/* Per-tool JSON-LD structured data */}
            <ToolJsonLd />
            {/* Main Content */}
            <main id="main-content">
              {children}
            </main>

            {/* Related Tools */}
            <RelatedTools />

            {/* Tools Showcase - Common across all pages */}
            <ToolsShowcase />

            {/* Footer */}
            <Footer />
            
            {/* Daily Tips Component */}
            <DailyTips />
          </I18nWrapper>

        </LanguageProvider>
        
        {/* Service Worker Registration for PWA */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('Service Worker registered successfully:', registration);
                      
                      // Check for updates
                      registration.addEventListener('updatefound', function() {
                        const newWorker = registration.installing;
                        if (newWorker) {
                          newWorker.addEventListener('statechange', function() {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                              // Show update notification
                              if (confirm('새로운 버전이 있습니다. 지금 업데이트하시겠습니까?')) {
                                window.location.reload();
                              }
                            }
                          });
                        }
                      });
                    })
                    .catch(function(error) {
                      console.log('Service Worker registration failed:', error);
                    });
                });

                // Listen for app install prompt
                let deferredPrompt;
                window.addEventListener('beforeinstallprompt', function(event) {
                  event.preventDefault();
                  deferredPrompt = event;
                  
                  // Show custom install button (can be added later)
                  const installButton = document.getElementById('install-button');
                  if (installButton) {
                    installButton.style.display = 'block';
                    installButton.addEventListener('click', function() {
                      deferredPrompt.prompt();
                      deferredPrompt.userChoice.then(function(choiceResult) {
                        if (choiceResult.outcome === 'accepted') {
                          console.log('User accepted the install prompt');
                        }
                        deferredPrompt = null;
                      });
                    });
                  }
                });

                // Handle app installed
                window.addEventListener('appinstalled', function(event) {
                  console.log('PWA was successfully installed');
                  // Hide install button
                  const installButton = document.getElementById('install-button');
                  if (installButton) {
                    installButton.style.display = 'none';
                  }
                });
              }
            `,
          }}
        />
        
        {/* <Analytics/> Removed for Cloudflare Pages */}
      </body>
    </html>
  )
}