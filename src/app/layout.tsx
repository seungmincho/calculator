import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Script from 'next/script'
import { Calculator } from 'lucide-react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '연봉 실수령액 계산기 | 계산기 모음',
  description: '2024년 기준 4대보험, 소득세를 제외한 실제 받을 수 있는 연봉을 계산해보세요.',
  keywords: '연봉계산기, 실수령액, 세금계산, 4대보험, 월급계산기',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_ID

  return (
    <html lang="ko">
      <head>
        <meta name="google-adsense-account" content={adsenseId} />
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
                <span className="text-xl font-bold text-gray-900 dark:text-white">계산기 모음</span>
              </div>
              
              <nav className="hidden md:flex space-x-8">
                <a href="/" className="text-blue-600 font-medium">연봉 계산기</a>
                <a href="/loan-calculator" className="text-blue-600 font-medium">대출 계산기</a>
                <a href="/savings-calculator" className="text-blue-600 font-medium">적금 계산기</a>
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
                  <span className="text-lg font-semibold">계산기 모음</span>
                </div>
                <p className="text-gray-400 dark:text-gray-500">
                  일상에 필요한 다양한 계산기를 제공합니다.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-4">계산기</h3>
                <ul className="space-y-2 text-gray-400 dark:text-gray-500">
                  <li><a href="/" className="hover:text-white transition-colors">연봉 계산기</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">대출 계산기</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">적금 계산기</a></li>
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
              <p>&copy; 2025 계산기 모음. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}