import { Metadata } from 'next';
import { readFileSync } from 'fs';
import { join } from 'path';

interface Tip {
  id: number;
  category: string;
  tip: string;
}

async function getTip(id: string): Promise<Tip | null> {
  try {
    // Read tips.json from public directory
    const tipsPath = join(process.cwd(), 'public', 'tips.json');
    const tipsData = readFileSync(tipsPath, 'utf8');
    const tips: Tip[] = JSON.parse(tipsData);
    
    const tipId = parseInt(id);
    return tips.find(tip => tip.id === tipId) || null;
  } catch (error) {
    console.error('Error reading tips.json:', error);
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const resolvedParams = await params;
  const tip = await getTip(resolvedParams.id);
  
  if (!tip) {
    return {
      title: '팁을 찾을 수 없습니다 | 툴허브 - 금융 꿀팁',
      description: '요청하신 금융 팁을 찾을 수 없습니다. 다른 유용한 금융 팁들을 확인해보세요.',
      openGraph: {
        title: '팁을 찾을 수 없습니다 | 툴허브',
        description: '요청하신 금융 팁을 찾을 수 없습니다.',
        url: `https://toolhub.ai.kr/tips/${resolvedParams.id}`,
        siteName: '툴허브',
        locale: 'ko_KR',
        type: 'website',
      },
    };
  }

  const title = `${tip.category} 팁 #${tip.id} | 툴허브 - 금융 꿀팁`;
  const description = `${tip.tip.substring(0, 120)}... ${tip.category}에 대한 상세한 금융 가이드와 실행 방법을 확인해보세요.`;

  return {
    title,
    description,
    keywords: `${tip.category}, 금융팁, 재정관리, ${tip.category}가이드, 금융상식, 투자조언`,
    openGraph: {
      title,
      description,
      url: `https://toolhub.ai.kr/tips/${tip.id}`,
      siteName: '툴허브',
      locale: 'ko_KR',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `https://toolhub.ai.kr/tips/${tip.id}`,
    },
  };
}

export default function TipLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}