'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Chrome Built-in AI (Gemini Nano) hook for summarizing calculation results.
 * Progressive enhancement — only works in Chrome 138+ with Summarizer API.
 * Falls back gracefully when unavailable.
 */

type AIStatus = 'checking' | 'available' | 'downloadable' | 'unavailable' | 'not-supported'

// Type declarations for Chrome AI APIs (not in standard TypeScript)
declare global {
  interface Window {
    Summarizer?: {
      availability: () => Promise<string>
      create: (options?: {
        type?: string
        format?: string
        length?: string
        sharedContext?: string
        monitor?: (m: { addEventListener: (event: string, cb: (e: { loaded: number }) => void) => void }) => void
      }) => Promise<{
        summarize: (text: string, options?: { context?: string }) => Promise<string>
        destroy: () => void
      }>
    }
  }
}

export function useChromeAI() {
  const [status, setStatus] = useState<AIStatus>('checking')
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null)
  const summarizerRef = useRef<{ summarize: (text: string, options?: { context?: string }) => Promise<string>; destroy: () => void } | null>(null)

  // Check availability on mount
  useEffect(() => {
    async function check() {
      try {
        // Check if Summarizer API exists (Chrome 138+)
        if (typeof window === 'undefined' || !('Summarizer' in window) || !window.Summarizer) {
          setStatus('not-supported')
          return
        }

        const availability = await window.Summarizer.availability()
        if (availability === 'available') {
          setStatus('available')
        } else if (availability === 'downloadable' || availability === 'downloading') {
          setStatus('downloadable')
        } else {
          setStatus('unavailable')
        }
      } catch {
        setStatus('not-supported')
      }
    }
    check()

    return () => {
      summarizerRef.current?.destroy()
    }
  }, [])

  const summarize = useCallback(async (text: string, context?: string) => {
    if (!window.Summarizer) return

    setLoading(true)
    setSummary(null)

    try {
      // Create summarizer if not already created
      if (!summarizerRef.current) {
        summarizerRef.current = await window.Summarizer.create({
          type: 'tldr',
          format: 'plain-text',
          length: 'short',
          sharedContext: context || '한국어 계산기 결과를 요약해주세요. 핵심 수치와 의미를 간단히 설명해주세요.',
          monitor(m) {
            m.addEventListener('downloadprogress', (e) => {
              setDownloadProgress(Math.round(e.loaded * 100))
            })
          },
        })
        setStatus('available')
        setDownloadProgress(null)
      }

      const result = await summarizerRef.current.summarize(text, {
        context: context || '이 계산 결과의 핵심을 한국어로 간단히 요약해주세요.',
      })

      setSummary(result)
    } catch (err) {
      console.warn('Chrome AI summarization failed:', err)
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const clearSummary = useCallback(() => {
    setSummary(null)
  }, [])

  return {
    /** Whether Chrome AI is available */
    isAvailable: status === 'available' || status === 'downloadable',
    /** Current status */
    status,
    /** Generated summary text */
    summary,
    /** Whether a summarization is in progress */
    loading,
    /** Model download progress (0-100) when downloading */
    downloadProgress,
    /** Trigger summarization */
    summarize,
    /** Clear current summary */
    clearSummary,
  }
}
