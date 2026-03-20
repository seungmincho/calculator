import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { readFileSync } from 'fs';
import { join } from 'path';
import TipDetailClient from './TipDetailClient';

interface Tip {
  id: number;
  category: string;
  tip: string;
}

function loadTips(): Tip[] {
  try {
    const filePath = join(process.cwd(), 'public', 'tips.json');
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as Tip[];
  } catch {
    return [];
  }
}

function getTipFromData(id: string): Tip | null {
  const tipId = parseInt(id);
  if (isNaN(tipId) || tipId < 1) return null;
  const tips = loadTips();
  return tips.find((t) => t.id === tipId) ?? null;
}

// Generate static params for all tip IDs present in tips.json
export async function generateStaticParams() {
  const tips = loadTips();
  if (tips.length > 0) {
    return tips.map((t) => ({ id: t.id.toString() }));
  }
  // Fallback: generate 1-100
  return Array.from({ length: 100 }, (_, i) => ({ id: (i + 1).toString() }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const tip = getTipFromData(id);

  const tipText = tip?.tip ?? '';
  const category = tip?.category ?? '재테크';
  // Use first 80 chars of tip text as part of the title if available
  const shortTip = tipText.length > 60 ? tipText.slice(0, 57) + '...' : tipText;
  const title = shortTip
    ? `${category} 팁: ${shortTip} | 툴허브`
    : `재테크 팁 #${id} | 툴허브`;

  const description =
    tipText ||
    '매일 새로운 재테크·절약 꿀팁을 확인하세요. 4대보험, 세금, 대출, 저축 등 실생활에 도움되는 금융 정보를 제공합니다.';
  const canonicalUrl = `https://toolhub.ai.kr/tips/${id}/`;

  return {
    title,
    description,
    keywords: `재테크, 금융팁, 절약, 세금, 대출, 저축, ${category}`,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: '툴허브',
      locale: 'ko_KR',
      type: 'article',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function TipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const tip = getTipFromData(resolvedParams.id);

  if (!tip) {
    notFound();
  }

  return <TipDetailClient tipId={resolvedParams.id} />;
}