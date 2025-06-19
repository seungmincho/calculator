'use client'

import React, { useState } from 'react';
import { History, Trash2, Download, Clock, X } from 'lucide-react';
import { CalculationHistory as HistoryType } from '@/utils/localStorage';

interface CalculationHistoryProps {
  histories: HistoryType[];
  isLoading: boolean;
  onLoadHistory: (historyId: string) => void;
  onRemoveHistory: (historyId: string) => void;
  onClearHistories: () => void;
  formatResult: (result: any) => string;
}

const CalculationHistory: React.FC<CalculationHistoryProps> = ({
  histories,
  isLoading,
  onLoadHistory,
  onRemoveHistory,
  onClearHistories,
  formatResult
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 transition-colors"
      >
        <History className="w-4 h-4" />
        <span>계산 이력</span>
        {histories.length > 0 && (
          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
            {histories.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">계산 이력</h2>
            {histories.length > 0 && (
              <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-sm px-2 py-1 rounded-full">
                {histories.length}개
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {histories.length > 0 && (
              <button
                onClick={() => setShowConfirmClear(true)}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="모든 이력 삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-96">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">로딩 중...</span>
            </div>
          ) : histories.length === 0 ? (
            <div className="text-center p-8">
              <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">저장된 계산 이력이 없습니다.</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                계산을 완료하면 자동으로 이력이 저장됩니다.
              </p>
            </div>
          ) : (
            <div className="p-4">
              <div className="space-y-3">
                {histories.map((history) => (
                  <div
                    key={history.id}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {history.title}
                          </h3>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(history.timestamp)}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                          {formatResult(history.result)}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              onLoadHistory(history.id);
                              setIsOpen(false);
                            }}
                            className="inline-flex items-center space-x-1 bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 px-3 py-1 rounded text-sm transition-colors"
                          >
                            <Download className="w-3 h-3" />
                            <span>불러오기</span>
                          </button>
                          
                          <button
                            onClick={() => onRemoveHistory(history.id)}
                            className="inline-flex items-center space-x-1 bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 text-red-700 dark:text-red-300 px-3 py-1 rounded text-sm transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>삭제</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Clear All Confirmation */}
        {showConfirmClear && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                모든 이력 삭제
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                저장된 모든 계산 이력을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowConfirmClear(false)}
                  className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    onClearHistories();
                    setShowConfirmClear(false);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalculationHistory;