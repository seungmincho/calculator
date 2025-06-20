import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Script from 'next/script'
import { Calculator } from 'lucide-react'
// import { Analytics } from "@vercel/analytics/next" // Removed for Cloudflare Pages
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import DailyTips from '@/components/DailyTips'
import { LanguageProvider } from '@/contexts/LanguageContext'
import I18nWrapper from '@/components/I18nWrapper'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://toolhub.ai.kr'),
  title: {
    default: '툴허브 - 연봉, 대출, 적금 계산기 | 무료 온라인 도구',
    template: '%s | 툴허브'
  },
  description: '연봉 실수령액, 대출 상환, 적금 이자를 쉽게 계산하세요. 무료 온라인 계산기와 실용적인 도구들을 제공합니다.',
  keywords: '툴허브, 계산기, 연봉계산기, 대출계산기, 적금계산기, 실수령액계산, 온라인도구, 무료계산기',
  authors: [{ name: '툴허브' }],
  creator: '툴허브',
  publisher: '툴허브',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://toolhub.ai.kr',
    siteName: '툴허브',
    title: '툴허브 - 필수 계산기 모음',
    description: '연봉부터 대출까지, 모든 계산을 한 곳에서',
    images: [
      {
        url: '/logo.png', // 추후 이미지 추가
        width: 1200,
        height: 630,
        alt: '툴허브 - 온라인 계산기 모음',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '툴허브 - 필수 계산기 모음',
    description: '연봉부터 대출까지, 모든 계산을 한 곳에서',
    images: ['/og-image.png'],
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
    description: '연봉, 대출, 적금 계산기 등 실용적인 온라인 도구 모음',
    url: 'https://toolhub.ai.kr',
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
      url: 'https://toolhub.ai.kr'
    }
  }

  return (
    <html lang="ko">
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <meta name="google-adsense-account" content={adsenseId} />
        <meta name="naver-site-verification" content="8cdcacf38562d4fa1ee11f4f77a8a0f15f11d532" />
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
      <body className={`${inter.className} min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800`}>
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
            <Header />
            {/* Main Content */}
            <main>
              {children}
            </main>

            {/* Footer */}
            <Footer />
            
            {/* Daily Tips Component */}
            <DailyTips />
          </I18nWrapper>
        </LanguageProvider>
        
        {/* <Analytics/> Removed for Cloudflare Pages */}
      </body>
    </html>
  )
}