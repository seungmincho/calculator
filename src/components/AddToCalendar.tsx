'use client'

import { CalendarPlus } from 'lucide-react'
import { useTranslations } from '@/lib/i18n/navigation'
import { buildIcs, type IcsEvent } from '@/utils/carMaintenance'

/** 마감 일정 하나 (문구 = 공통 homePage.deadline.<key>, 메모에 도구 링크 — 알림 받고 다시 들어오게) */
export function useDeadlineEvent() {
  const t = useTranslations()
  return (key: string, date: string, href: string, alarmDays = 3): IcsEvent => ({
    uid: `${key}-${date}`, date, alarmDays,
    title: t(`homePage.deadline.${key}`),
    description: t('homePage.deadline.eventNote', { url: `https://toolhub.ai.kr${href}/` }),
  })
}

/** 종일 일정 .ics 내려받기 (라이브러리 없이, ICS 생성은 carMaintenance.buildIcs 재사용).
 *  title을 주면 아이콘만 있는 44px 버튼(aria-label = "{title} 캘린더에 추가"), 없으면 글자 버튼. */
export default function AddToCalendar({ events, file, title, className = '' }: { events: IcsEvent[]; file: string; title?: string; className?: string }) {
  const t = useTranslations('common')
  const save = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([buildIcs(events, new Date().toISOString().slice(0, 10))], { type: 'text/calendar;charset=utf-8' }))
    a.download = file
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  if (title) {
    const label = t('addToCalendarFor', { title })
    return (
      <button type="button" onClick={save} aria-label={label} title={label}
        className={`shrink-0 grid place-items-center w-11 h-11 rounded-xl text-sub hover:bg-soft hover:text-fg transition-colors ${className}`}>
        <CalendarPlus className="w-5 h-5" aria-hidden />
      </button>
    )
  }
  return (
    <button type="button" onClick={save} className={`ui-btn-soft inline-flex items-center justify-center gap-2 min-h-11 px-4 py-2 text-sm ${className}`}>
      <CalendarPlus className="w-4 h-4" aria-hidden />
      {t('addToCalendar')}
    </button>
  )
}
