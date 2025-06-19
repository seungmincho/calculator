'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Tag, Share2, Lightbulb, TrendingUp, ArrowRight, BookOpen, Check } from 'lucide-react';

interface Tip {
  id: number;
  category: string;
  tip: string;
}

interface TipDetailClientProps {
  tipId: string;
}

export default function TipDetailClient({ tipId }: TipDetailClientProps) {
  const router = useRouter();
  const [tip, setTip] = useState<Tip | null>(null);
  const [relatedTips, setRelatedTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCopyNotification, setShowCopyNotification] = useState(false);

  useEffect(() => {
    const fetchTip = async () => {
      try {
        const response = await fetch('/tips.json');
        const tips = await response.json();
        
        const tipIdNum = parseInt(tipId);
        const currentTip = tips.find((t: Tip) => t.id === tipIdNum);
        
        if (!currentTip) {
          setTip(null);
          setLoading(false);
          return;
        }
        
        setTip(currentTip);
        
        // Find related tips in same category
        const related = tips
          .filter((t: Tip) => t.category === currentTip.category && t.id !== currentTip.id)
          .slice(0, 3);
        setRelatedTips(related);
      } catch (error) {
        console.error('Failed to fetch tip:', error);
        router.push('/tips');
      } finally {
        setLoading(false);
      }
    };

    fetchTip();
  }, [tipId, router]);

  const showNotification = () => {
    setShowCopyNotification(true);
    setTimeout(() => {
      setShowCopyNotification(false);
    }, 3000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `금융 팁 #${tip?.id} - ${tip?.category}`,
          text: tip?.tip,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback to copying URL
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(window.location.href);
          showNotification();
        } else {
          // Fallback for browsers without clipboard API
          const textArea = document.createElement('textarea');
          textArea.value = window.location.href;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          showNotification();
        }
      } catch (error) {
        console.log('Error copying to clipboard:', error);
        // Final fallback - just show the URL
        alert(`다음 링크를 복사하세요: ${window.location.href}`);
      }
    }
  };

  const getCategoryIcon = (category: string) => {
    const iconMap: { [key: string]: string } = {
      '가계 관리': '💰',
      '저축/투자': '📈',
      '신용/대출': '💳',
      '은행/금융상품': '🏦',
      '세금/절세': '📋',
      '보험': '🏥',
      '부동산': '🏠',
      '은퇴/연금': '👴',
      '안전/사기방지': '🔒',
      '금융교육': '📚'
    };
    return iconMap[category] || '💡';
  };

  const getDetailedContent = (tip: Tip) => {
    // Enhanced content based on category
    const contentMap: { [key: string]: string[] } = {
      '예산/지출 관리': [
        '가계부 작성의 중요성과 실천 방법을 알아보세요.',
        '고정비와 변동비를 구분하여 관리하면 예산 계획이 더욱 효과적입니다.',
        '50-30-20 법칙: 수입의 50%는 필수 지출, 30%는 생활비, 20%는 저축에 배분하세요.'
      ],
      '저축/투자': [
        '복리의 마법을 활용하여 장기적인 재정 목표를 달성하세요.',
        '위험 허용도에 따라 안전자산과 위험자산의 비율을 조정하세요.',
        '정기적인 투자 습관이 시장 변동성을 극복하는 가장 좋은 방법입니다.'
      ],
      '신용 관리': [
        '신용점수는 대출, 보험료, 심지어 취업에도 영향을 미칩니다.',
        '신용카드 사용량은 한도의 30% 이내로 유지하는 것이 좋습니다.',
        '정기적으로 신용보고서를 확인하여 오류가 없는지 점검하세요.'
      ]
    };

    return contentMap[tip.category] || [
      '재정 관리는 꾸준한 습관이 가장 중요합니다.',
      '작은 것부터 시작하여 점진적으로 확대해 나가세요.',
      '전문가의 조언을 구하는 것도 좋은 방법입니다.'
    ];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!tip) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-8">
            <Link 
              href="/tips"
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              전체 팁 보기
            </Link>
          </div>

          {/* Not Found Content */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-8 text-center">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Lightbulb className="w-8 h-8 text-gray-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                팁을 찾을 수 없습니다
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                요청하신 금융 팁이 존재하지 않거나 삭제되었습니다.
              </p>
              <Link 
                href="/tips"
                className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>다른 팁 보러가기</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Copy Notification */}
      {showCopyNotification && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-in slide-in-from-top-2 duration-300">
          <Check className="w-5 h-5" />
          <span>링크가 복사되었습니다!</span>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Link 
            href="/tips"
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            전체 팁 보기
          </Link>
          
          <button
            onClick={handleShare}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>공유하기</span>
          </button>
        </div>

        {/* Main Content */}
        <article className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-8 text-white">
            <div className="flex items-center space-x-4 mb-4">
              <div className="bg-white/20 p-3 rounded-full">
                <span className="text-3xl">{getCategoryIcon(tip.category)}</span>
              </div>
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Tag className="w-4 h-4" />
                  <span className="text-blue-100">팁 #{tip.id}</span>
                </div>
                <h2 className="text-sm font-medium text-blue-100">{tip.category}</h2>
              </div>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold leading-tight">
              {tip.tip}
            </h1>
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="flex items-center space-x-2 mb-6">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">상세 설명</h3>
            </div>
            
            <div className="prose prose-lg max-w-none dark:prose-invert">
              {getDetailedContent(tip).map((content, index) => (
                <p key={index} className="text-gray-700 dark:text-gray-300 mb-4">
                  {content}
                </p>
              ))}
            </div>

            {/* Action Items */}
            <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="flex items-center space-x-2 mb-4">
                <BookOpen className="w-5 h-5 text-green-600" />
                <h4 className="font-semibold text-gray-900 dark:text-white">실행 단계</h4>
              </div>
              <ul className="space-y-2">
                <li className="flex items-start space-x-2">
                  <span className="w-6 h-6 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full flex items-center justify-center text-sm font-medium mt-0.5">1</span>
                  <span className="text-gray-700 dark:text-gray-300">현재 상황을 파악하고 목표를 설정하세요</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-6 h-6 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full flex items-center justify-center text-sm font-medium mt-0.5">2</span>
                  <span className="text-gray-700 dark:text-gray-300">구체적인 실행 계획을 세우고 일정을 정하세요</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-6 h-6 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full flex items-center justify-center text-sm font-medium mt-0.5">3</span>
                  <span className="text-gray-700 dark:text-gray-300">정기적으로 진행 상황을 점검하고 조정하세요</span>
                </li>
              </ul>
            </div>
          </div>
        </article>

        {/* Related Tips */}
        {relatedTips.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center space-x-2 mb-6">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {tip.category} 관련 팁
              </h3>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              {relatedTips.map((relatedTip) => (
                <Link
                  key={relatedTip.id}
                  href={`/tips/${relatedTip.id}`}
                  className="block group"
                >
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border border-gray-200 dark:border-gray-700 group-hover:border-blue-300 dark:group-hover:border-blue-600">
                    <div className="flex items-center space-x-3 mb-4">
                      <span className="text-xl">{getCategoryIcon(relatedTip.category)}</span>
                      <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                        #{relatedTip.id}
                      </span>
                    </div>
                    
                    <p className="text-gray-800 dark:text-gray-200 line-clamp-3 mb-4">
                      {relatedTip.tip}
                    </p>
                    
                    <div className="flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium">
                      더 보기 <ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 text-center bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            금융 계산기로 실제 계획 세우기
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            이론을 실제로 적용해보세요. 다양한 계산기를 활용해 구체적인 재정 계획을 세워보세요.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link 
              href="/"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              연봉 계산기
            </Link>
            <Link 
              href="/savings-calculator"
              className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white px-6 py-3 rounded-lg font-medium border border-gray-300 dark:border-gray-600 transition-colors"
            >
              적금 계산기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}