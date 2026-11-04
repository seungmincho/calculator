'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/everlandWaitTimes'

export default function EverlandWaitTimes() {
  const t = useTranslations('everlandWaitTimes')
  const ref = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(1100)
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== ref.current?.contentWindow || event.data?.type !== 'everland-height') return
      if (Number.isFinite(event.data.height)) setHeight(Math.min(14000, Math.max(500, event.data.height)))
    }
    const frame = ref.current
    let observer: ResizeObserver | undefined
    const measure = () => {
      const body = frame?.contentDocument?.body
      if (!body) return
      setHeight(Math.min(14000, Math.max(500, body.offsetHeight)))
    }
    const loaded = () => {
      observer?.disconnect()
      measure()
      const body = frame?.contentDocument?.body
      if (body) { observer = new ResizeObserver(measure); observer.observe(body) }
    }
    window.addEventListener('message', receive)
    frame?.addEventListener('load', loaded)
    loaded() // The frame can finish loading before React hydrates.
    return () => {
      window.removeEventListener('message', receive)
      frame?.removeEventListener('load', loaded)
      observer?.disconnect()
    }
  }, [])
  return <div className="space-y-6">
    <header><h1 className="text-3xl font-bold text-fg">{t('title')}</h1><p className="mt-3 text-sub">{t('subtitle')}</p></header>
    <p className="text-body leading-relaxed">{t('intro')}</p>
    <a className="text-primary underline" href="/everland-board/" target="_blank" rel="noopener">{t('openBoard')}</a>
    <iframe ref={ref} src="/everland-board/" title={t('boardTitle')} className="w-full border-0 rounded-2xl" style={{height}} />
    <section className="ui-card p-6 space-y-4">
      <h2 className="text-xl font-bold text-fg">{t('guideTitle')}</h2>
      <p className="text-body leading-relaxed">{t('guide')}</p><p className="text-body leading-relaxed">{t('timeGuide')}</p>
      <p className="text-body leading-relaxed">{t('mapGuide')}</p>
      <a className="text-primary underline" href="https://www.everland.com/everland/map" target="_blank" rel="noopener noreferrer">{t('official')}</a>
      <p><a href="https://www.themeparks.wiki/" className="text-primary underline" target="_blank" rel="noopener noreferrer">Powered by ThemeParks.wiki</a></p>
    </section>
    <section className="ui-card p-6 space-y-3"><h2 className="text-xl font-bold text-fg">{t('faqTitle')}</h2><h3 className="font-semibold text-fg">{t('faqQuestion')}</h3><p className="text-body">{t('faqAnswer')}</p></section>
    <Link href="/holiday-planner/" className="text-primary underline">{t('related')}</Link>
  </div>
}
