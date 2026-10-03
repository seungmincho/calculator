'use client'

import { useState, useCallback } from 'react'
import { Download, Share2, Link2, Check } from 'lucide-react'
import { renderShareCard, type ShareCardData } from '@/utils/shareCard'
import { useTranslations } from '@/lib/i18n/shared'

/**
 * 결과 공유 버튼 묶음: 이미지 저장 · 공유하기(모바일 공유 시트, 이미지+링크) · 링크 복사.
 * card: 카드 이미지 내용, url: 결과를 재현하는 링크(기본 = 현재 주소), text: 공유 문구.
 * 사용 예: <ShareResult card={{ tool, label, headline, rows }} text="내 월 실수령액은 …" />
 */
export default function ShareResult({
  card, url, text, fileName = 'toolhub-result', className = '',
}: {
  card: ShareCardData
  url?: string
  text?: string
  fileName?: string
  className?: string
}) {
  const t = useTranslations('shareResult')
  const [state, setState] = useState<'idle' | 'copied' | 'saved'>('idle')
  const flash = (s: 'copied' | 'saved') => { setState(s); setTimeout(() => setState('idle'), 2000) }
  const link = () => url ?? window.location.href

  const save = useCallback(async () => {
    const blob = await renderShareCard({ cta: t('cta'), ...card })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${fileName}.png`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    flash('saved')
  }, [card, fileName, t])

  const copy = useCallback(async () => {
    try { await navigator.clipboard.writeText(link()) } catch { /* 권한 없음: 무시 */ }
    flash('copied')
  }, [url]) // eslint-disable-line react-hooks/exhaustive-deps

  const share = useCallback(async () => {
    const shareText = text ?? `${card.label} ${card.headline}`
    try {
      const blob = await renderShareCard({ cta: t('cta'), ...card })
      const file = new File([blob], `${fileName}.png`, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: card.tool, text: `${shareText}\n${link()}` })
        return
      }
      if (navigator.share) {
        await navigator.share({ title: card.tool, text: shareText, url: link() })
        return
      }
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return
    }
    await copy()
  }, [card, text, fileName, copy, t]) // eslint-disable-line react-hooks/exhaustive-deps

  const btn = 'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors'
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <button onClick={share} className={`${btn} ui-btn`}>
        <Share2 className="w-4 h-4" /> {t('share')}
      </button>
      <button onClick={save} className={`${btn} bg-soft text-body hover:bg-track`}>
        {state === 'saved' ? <Check className="w-4 h-4 text-primary" /> : <Download className="w-4 h-4" />} {t('save')}
      </button>
      <button onClick={copy} className={`${btn} bg-soft text-body hover:bg-track`}>
        {state === 'copied' ? <Check className="w-4 h-4 text-primary" /> : <Link2 className="w-4 h-4" />}
        {state === 'copied' ? t('copied') : t('copyLink')}
      </button>
    </div>
  )
}
