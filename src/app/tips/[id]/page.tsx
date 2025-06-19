import { notFound } from 'next/navigation';
import TipDetailClient from './TipDetailClient';

interface Tip {
  id: number;
  category: string;
  tip: string;
}

// Generate static params for all tip IDs
export async function generateStaticParams() {
  // Generate params for tip IDs 1-40 based on our tips.json structure
  const tipIds = Array.from({ length: 40 }, (_, i) => i + 1);
  
  return tipIds.map((id) => ({
    id: id.toString(),
  }));
}

async function getTip(id: string): Promise<Tip | null> {
  try {
    // Validate the ID format
    const tipId = parseInt(id);
    if (isNaN(tipId) || tipId < 1 || tipId > 40) {
      return null;
    }
    
    // Return a valid placeholder - the actual validation happens client-side
    return { id: tipId, category: '', tip: '' };
  } catch {
    return null;
  }
}

export default async function TipDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const resolvedParams = await params;
  const tip = await getTip(resolvedParams.id);
  
  if (!tip) {
    notFound();
  }

  return <TipDetailClient tipId={resolvedParams.id} />;
}