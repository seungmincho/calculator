import { Suspense } from 'react';
import { Metadata } from 'next';
import TimeConverter from '@/components/TimeConverter';

export const metadata: Metadata = {
  title: '시간 변환기 - 타임존, Unix 타임스탬프, 상대시간 변환',
  description: '전 세계 타임존 변환, Unix 타임스탬프 변환, 상대시간 계산을 한 번에. 티켓팅, 국제회의, 해외 이벤트 시간 확인에 최적화된 도구입니다.',
  keywords: '시간변환기, 타임존변환, 시차계산, UTC변환, KST변환, Unix타임스탬프, 상대시간, 티켓팅시간, 세계시계, 시간대변환',
  openGraph: {
    title: '시간 변환기 - 전 세계 시간대 변환 도구',
    description: '타임존 변환부터 Unix 타임스탬프까지, 모든 시간 변환을 한 곳에서',
    type: 'website',
    url: 'https://toolhub.ai.kr/time-converter',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: '시간 변환기 - 툴허브',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '시간 변환기 - 전 세계 시간대 변환 도구',
    description: '타임존 변환부터 Unix 타임스탬프까지, 모든 시간 변환을 한 곳에서',
    images: ['/logo.png'],
  },
};

export default function TimeConverterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">시간 변환기를 불러오는 중...</p>
        </div>
      </div>
    }>
      <TimeConverter />
    </Suspense>
  );
}