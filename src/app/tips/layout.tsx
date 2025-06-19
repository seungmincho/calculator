import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '금융 꿀팁 모음 | 툴허브 - 실생활 재정 관리 가이드',
  description: '현명한 재정 관리부터 투자 전략까지, 실생활에 도움되는 40개의 금융 팁을 만나보세요. 예산 관리, 저축, 투자, 대출, 보험 등 분야별 전문 조언을 제공합니다.',
  keywords: '금융팁, 재정관리, 투자가이드, 저축방법, 대출관리, 보험선택, 연금저축, 부동산투자, 주식투자, 세금절약',
  openGraph: {
    title: '금융 꿀팁 모음 | 툴허브',
    description: '실생활에 도움되는 40개의 금융 팁 - 재정 관리부터 투자까지',
    url: 'https://toolhub.ai.kr/tips',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '금융 꿀팁 모음 | 툴허브',
    description: '실생활에 도움되는 40개의 금융 팁 - 재정 관리부터 투자까지',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/tips',
  },
};

export default function TipsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}