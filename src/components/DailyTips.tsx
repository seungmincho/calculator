'use client'

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Lightbulb, X } from 'lucide-react';

interface Tip {
  id: number;
  category: string;
  tip: string;
}

const DailyTips = () => {
  const [tips, setTips] = useState<Tip[]>([]);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // 팁 데이터 로드
  useEffect(() => {
    const loadTips = async () => {
      try {
        const response = await fetch('/tips.json');
        const tipsData = await response.json();
        setTips(tipsData);
        
        // 로컬 스토리지에서 마지막 본 팁 인덱스 확인
        const savedIndex = localStorage.getItem('dailyTipIndex');
        if (savedIndex && parseInt(savedIndex) < tipsData.length) {
          setCurrentTipIndex(parseInt(savedIndex));
        } else {
          // 랜덤 시작 인덱스
          setCurrentTipIndex(Math.floor(Math.random() * tipsData.length));
        }
        
        // 컴포넌트 표시 상태 확인
        const isHidden = localStorage.getItem('dailyTipsHidden') === 'true';
        setIsVisible(!isHidden);
      } catch (error) {
        console.error('Failed to load tips:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTips();
  }, []);

  // 다음 팁
  const nextTip = () => {
    const newIndex = (currentTipIndex + 1) % tips.length;
    setCurrentTipIndex(newIndex);
    localStorage.setItem('dailyTipIndex', newIndex.toString());
  };

  // 이전 팁
  const prevTip = () => {
    const newIndex = currentTipIndex === 0 ? tips.length - 1 : currentTipIndex - 1;
    setCurrentTipIndex(newIndex);
    localStorage.setItem('dailyTipIndex', newIndex.toString());
  };

  // 팁 숨기기
  const hideTips = () => {
    setIsVisible(false);
    localStorage.setItem('dailyTipsHidden', 'true');
  };

  // 팁 다시 보기
  const showTips = () => {
    setIsVisible(true);
    localStorage.setItem('dailyTipsHidden', 'false');
  };

  if (isLoading || tips.length === 0) {
    return null;
  }

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={showTips}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors"
          title="오늘의 팁 보기"
        >
          <Lightbulb className="w-5 h-5" />
        </button>
      </div>
    );
  }

  const currentTip = tips[currentTipIndex];

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Lightbulb className="w-5 h-5 text-white" />
              <h3 className="text-white font-semibold text-sm">오늘의 팁</h3>
            </div>
            <button
              onClick={hideTips}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 컨텐츠 */}
        <div className="p-4">
          <div className="mb-3">
            <span className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium px-2 py-1 rounded-full">
              {currentTip.category}
            </span>
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-4">
            {currentTip.tip}
          </p>

          {/* 네비게이션 */}
          <div className="flex items-center justify-between">
            <button
              onClick={prevTip}
              className="flex items-center space-x-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs">이전</span>
            </button>

            <div className="flex items-center space-x-1">
              {tips.slice(0, 5).map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentTipIndex % 5
                      ? 'bg-blue-600'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={nextTip}
              className="flex items-center space-x-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
            >
              <span className="text-xs">다음</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-2 text-center">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {currentTipIndex + 1} / {tips.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyTips;