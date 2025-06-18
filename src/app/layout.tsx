import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Script from 'next/script'
import { Calculator } from 'lucide-react'
import { Analytics } from "@vercel/analytics/next"

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
        url: '/og-image.png', // 추후 이미지 추가
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
  const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_ID

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
        <meta name="google-adsense-account" content={adsenseId} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.className} min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800`}>
        {adsenseId && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseId}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
        
        {/* Header */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-2">
                <Calculator className="w-8 h-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900 dark:text-white">툴허브</span>
              </div>
              
              <nav className="hidden md:flex space-x-8">
                <a href="/" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors">연봉 계산기</a>
                <a href="/loan-calculator" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors">대출 계산기</a>
                <a href="/savings-calculator" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors">적금 계산기</a>
                <a href="#" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors">더 많은 도구</a>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main>
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-gray-900 dark:bg-gray-950 text-white mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <Calculator className="w-6 h-6" />
                  <span className="text-lg font-semibold">툴허브</span>
                </div>
                <p className="text-gray-400 dark:text-gray-500">
                  일상에 필요한 다양한 계산기를 제공합니다.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-4">계산기</h3>
                <ul className="space-y-2 text-gray-400 dark:text-gray-500">
                  <li><a href="/" className="hover:text-white transition-colors">연봉 계산기</a></li>
                  <li><a href="/loan-calculator" className="hover:text-white transition-colors">대출 계산기</a></li>
                  <li><a href="/savings-calculator" className="hover:text-white transition-colors">적금 계산기</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">BMI 계산기</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">정보</h3>
                <ul className="space-y-2 text-gray-400 dark:text-gray-500">
                  <li><a href="#" className="hover:text-white transition-colors">오늘의 팁</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">이용약관</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">개인정보처리방침</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-700 dark:border-gray-800 mt-8 pt-8 text-center text-gray-400 dark:text-gray-500">
              <p>&copy; 2025 툴허브. All rights reserved.</p>
            </div>
          </div>
        </footer>
        <Analytics/>
      </body>
    </html>
  )
}