'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { safeStorage } from '@/utils/localStorage'

interface FeedbackData {
  id: string
  calculatorType: string
  rating: number
  comment?: string
  timestamp: number
  userAgent: string
}

interface FeedbackWidgetProps {
  calculatorType: string
  className?: string
}

const FEEDBACK_STORAGE_KEY = 'user_feedback'
const FEEDBACK_COOLDOWN_HOURS = 24

export default function FeedbackWidget({ calculatorType, className = '' }: FeedbackWidgetProps) {
  const t = useTranslations()
  const [isOpen, setIsOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [showThankYou, setShowThankYou] = useState(false)
  const [canShowWidget, setCanShowWidget] = useState(true)

  useEffect(() => {
    // 이미 피드백을 제출했는지 확인
    const checkPreviousFeedback = () => {
      const feedbackData = safeStorage.getItem(FEEDBACK_STORAGE_KEY)
      if (!feedbackData) return

      try {
        const feedbacks: FeedbackData[] = JSON.parse(feedbackData)
        const recentFeedback = feedbacks.find(
          feedback => 
            feedback.calculatorType === calculatorType &&
            Date.now() - feedback.timestamp < FEEDBACK_COOLDOWN_HOURS * 60 * 60 * 1000
        )
        
        if (recentFeedback) {
          setCanShowWidget(false)
        }
      } catch (error) {
        console.warn('Failed to parse feedback data:', error)
      }
    }

    checkPreviousFeedback()
  }, [calculatorType])

  const handleSubmitFeedback = async () => {
    if (rating === 0 || isSubmitting) return

    setIsSubmitting(true)
    
    try {
      const newFeedback: FeedbackData = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        calculatorType,
        rating,
        comment: comment.trim() || undefined,
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      }

      // 기존 피드백 가져오기
      const existingData = safeStorage.getItem(FEEDBACK_STORAGE_KEY)
      const existingFeedbacks: FeedbackData[] = existingData ? JSON.parse(existingData) : []
      
      // 새 피드백 추가 (최대 100개까지 보관)
      const updatedFeedbacks = [newFeedback, ...existingFeedbacks].slice(0, 100)
      
      // 저장
      const success = safeStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(updatedFeedbacks))
      
      if (success) {
        setHasSubmitted(true)
        setShowThankYou(true)
        setCanShowWidget(false)
        
        // 감사 메시지 3초 후 자동 닫기
        setTimeout(() => {
          setIsOpen(false)
          setShowThankYou(false)
        }, 3000)
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setRating(0)
    setHoveredRating(0)
    setComment('')
    setIsSubmitting(false)
    setHasSubmitted(false)
    setShowThankYou(false)
  }

  // 위젯을 표시하지 않을 경우 null 반환
  if (!canShowWidget) return null

  return (
    <div className={`feedback-widget ${className}`}>
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 border border-gray-300 rounded-lg hover:border-blue-300 transition-colors duration-200 bg-white hover:bg-blue-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-gray-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m0 0v10a2 2 0 002 2h6a2 2 0 002-2V8M9 12h6" />
          </svg>
          {t('feedback.button')}
        </button>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-6 shadow-lg max-w-md">
          {showThankYou ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('feedback.thankYou.title')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t('feedback.thankYou.message')}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('feedback.title')}
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('feedback.rating.label')}
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <svg
                        className={`w-6 h-6 ${
                          star <= (hoveredRating || rating)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300 dark:text-gray-600'
                        } transition-colors duration-150`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                        />
                      </svg>
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {t('feedback.rating.selected', { rating })}
                  </p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('feedback.comment.label')}
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t('feedback.comment.placeholder')}
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 resize-none"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {comment.length}/500 {t('feedback.comment.optional')}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSubmitFeedback}
                  disabled={rating === 0 || isSubmitting}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('feedback.submitting')}
                    </span>
                  ) : (
                    t('feedback.submit')
                  )}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  {t('feedback.cancel')}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}