'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/toastSpeech'
import GreetingGenerator from '@/components/GreetingGenerator'
import GuideSection from '@/components/GuideSection'
import ShareResult from '@/components/ShareResult'
import { PLACES, TOAST_CHANTS, chantsFor, type Place } from '@/utils/toastChants'

const FILTERS = ['all', ...PLACES] as const

async function copyText(text: string) {
  try {
    if (navigator.clipboard?.writeText) return await navigator.clipboard.writeText(text)
  } catch { /* 권한 없음(인앱 브라우저 등) → textarea 복사 */ }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.left = '-999999px'
  document.body.appendChild(ta)
  ta.select()
  try { document.execCommand('copy') } catch { /* 표시만 */ }
  document.body.removeChild(ta)
}

export default function ToastSpeech() {
  const t = useTranslations('toastSpeech')
  // 기본 '전체' → 정적 HTML 에 구호가 모두 들어간다
  const [place, setPlace] = useState<Place | 'all'>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [announce, setAnnounce] = useState('')
  const chants = chantsFor(place)
  const text = (id: string, k: 'chant' | 'meaning' | 'lead' | 'reply') => t(`list.${id}.${k}`)

  const copy = async (id: string) => {
    await copyText(t('chants.copyText', { chant: text(id, 'chant'), meaning: text(id, 'meaning'), lead: text(id, 'lead'), reply: text(id, 'reply') }))
    setCopiedId(id)
    setAnnounce(t('chants.copiedAnnounce', { chant: text(id, 'chant') }))
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
        <a href="#toast-chants" className="inline-flex items-center min-h-11 text-sm font-semibold text-primary">
          {t('jumpToChants', { count: TOAST_CHANTS.length })}
        </a>
      </div>

      <section aria-labelledby="ts-make" className="space-y-4">
        <div>
          <h2 id="ts-make" className="text-xl font-bold text-fg">{t('make.title')}</h2>
          <p className="text-sm text-muted mt-1">{t('make.description')}</p>
        </div>
        <GreetingGenerator defaultSituation="toast" embedded />
      </section>

      <section id="toast-chants" aria-labelledby="ts-chants" className="space-y-5 scroll-mt-20">
        <div>
          <h2 id="ts-chants" className="text-xl font-bold text-fg">{t('chants.title', { count: TOAST_CHANTS.length })}</h2>
          <p className="text-sm text-muted mt-1">{t('chants.description')}</p>
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-body mb-2">{t('chants.filterLabel')}</legend>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((p) => (
              <label key={p} className="relative">
                <input type="radio" name="ts-place" value={p} checked={place === p} onChange={() => setPlace(p)} className="peer sr-only" />
                <span className="inline-flex items-center min-h-11 px-4 rounded-full text-sm font-medium cursor-pointer transition-colors bg-soft text-body hover:bg-subtle peer-checked:bg-primary peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary">
                  {t(`places.${p}`)}
                </span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted mt-2" aria-live="polite">{t('chants.shown', { count: chants.length })}</p>
        </fieldset>

        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {chants.map(({ id, places, split }) => (
            <li key={id} className="ui-card p-5 flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-bold text-fg break-keep">{text(id, 'chant')}</h3>
                <p className="text-xs text-muted mt-1.5 text-right">{places.map((x) => t(`places.${x}`)).join(' · ')}</p>
              </div>
              <p className="text-sm text-sub mt-1 leading-relaxed break-keep">{text(id, 'meaning')}</p>
              <dl className="mt-4 bg-subtle rounded-xl p-3 text-sm space-y-1">
                <div className="flex gap-3">
                  <dt className="text-muted shrink-0">{t('chants.lead')}</dt>
                  <dd className="text-fg font-medium break-keep">{text(id, 'lead')}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="text-muted shrink-0">{t('chants.reply')}</dt>
                  <dd className="text-fg font-medium break-keep">{text(id, 'reply')}</dd>
                </div>
              </dl>
              <div className="mt-auto pt-4 flex items-center justify-between gap-2">
                <span className="text-xs text-muted">{t(split ? 'chants.split' : 'chants.echo')}</span>
                <button type="button" onClick={() => copy(id)} aria-label={t('chants.copyAria', { chant: text(id, 'chant') })}
                  className="inline-flex items-center justify-center gap-1.5 min-h-11 min-w-11 px-3 rounded-xl text-sm font-medium bg-soft text-body hover:bg-subtle transition-colors">
                  {copiedId === id ? <Check className="w-4 h-4 text-primary" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
                  {copiedId === id ? t('chants.copied') : t('chants.copy')}
                </button>
              </div>
            </li>
          ))}
        </ul>

        <ShareResult
          card={{
            tool: t('title'),
            label: t('share.label'),
            headline: t('share.headline', { count: TOAST_CHANTS.length }),
            rows: TOAST_CHANTS.slice(0, 4).map(({ id }) => ({ label: text(id, 'chant'), value: `${text(id, 'lead')} ${text(id, 'reply')}` })),
            cta: t('share.cta'),
          }}
          fileName="toast-speech"
        />
      </section>

      <GuideSection namespace="toastSpeech" defaultOpen />

      <p className="sr-only" aria-live="polite">{announce}</p>
    </div>
  )
}
