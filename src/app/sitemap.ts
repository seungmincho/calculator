import type { MetadataRoute } from 'next'
import { menuConfig, categoryKeys } from '@/config/menuConfig'
import { algorithms } from '@/config/algorithmConfig'

export const dynamic = 'force-static'
export const revalidate = false

// 카테고리별 기본 priority & changeFrequency
const categoryDefaults: Record<string, { priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }> = {
  calculators: { priority: 0.8, changeFrequency: 'weekly' },
  tools: { priority: 0.7, changeFrequency: 'monthly' },
  media: { priority: 0.7, changeFrequency: 'monthly' },
  health: { priority: 0.8, changeFrequency: 'monthly' },
  games: { priority: 0.8, changeFrequency: 'weekly' },
}

// 개별 페이지 priority 오버라이드 (검색량 높은 도구)
const priorityOverrides: Record<string, number> = {
  '/salary-calculator': 0.9,
  '/monthly-rent-subsidy': 0.9,
  '/bogeumjari-loan': 0.9,
  '/median-income': 0.9,
  '/percent-calculator': 0.9,
  '/age-calculator': 0.9,
  '/compound-calculator': 0.9,
  '/electricity-calculator': 0.9,
  '/discount-calculator': 0.9,
  '/pyeong-calculator': 0.9,
  '/vat-calculator': 0.9,
  '/hourly-wage': 0.9,
  '/severance-pay': 0.9,
  '/annual-leave': 0.9,
  '/taxi-fare': 0.9,
  '/rent-converter': 0.9,
  '/lunar-converter': 0.9,
  '/world-clock': 0.9,
  '/budget-calculator': 0.9,
  '/loan-schedule': 0.9,
  '/capital-gains-tax': 0.9,
  '/year-end-tax': 0.9,
  '/income-tax': 0.9,
  '/jeonse-loan': 0.9,
  '/dsr-calculator': 0.9,
  '/acquisition-tax': 0.9,
  '/parental-leave': 0.9,
  '/health-insurance': 0.9,
  '/unemployment-benefit': 0.9,
  '/weekly-holiday-pay': 0.9,
  '/korean-wordle': 0.9,
  '/mbti-test': 0.9,
  '/mbti-compatibility': 0.9,
  '/name-compatibility': 0.9,
  '/personal-color': 0.9,
  '/ovulation-calculator': 0.9,
  '/csat-grade': 0.9,
  '/enneagram': 0.9,
  '/prompt-generator': 0.9,
  '/chart-studio': 0.9,
  '/password-generator': 0.8,
  '/dday-calculator': 0.8,
  '/games': 0.8,
}

// changeFrequency 오버라이드
const frequencyOverrides: Record<string, MetadataRoute.Sitemap[number]['changeFrequency']> = {
  '/exchange-calculator': 'daily',
  '/korean-wordle': 'daily',
  '/world-clock': 'daily',
  '/time-converter': 'daily',
}

export default function sitemap(): MetadataRoute.Sitemap {
  const today = new Date().toISOString().split('T')[0]
  const seen = new Set<string>()

  // 홈
  const entries: MetadataRoute.Sitemap = [
    {
      url: 'https://toolhub.ai.kr/',
      lastModified: today,
      changeFrequency: 'daily',
      priority: 1,
    },
  ]

  // menuConfig 기반 자동 생성
  for (const key of categoryKeys) {
    const category = menuConfig[key]
    const defaults = categoryDefaults[key] || { priority: 0.7, changeFrequency: 'monthly' as const }

    for (const item of category.items) {
      // 중복 방지
      if (seen.has(item.href)) continue
      seen.add(item.href)

      entries.push({
        url: `https://toolhub.ai.kr${item.href}/`,
        lastModified: item.addedDate || today,
        changeFrequency: frequencyOverrides[item.href] || defaults.changeFrequency,
        priority: priorityOverrides[item.href] ?? defaults.priority,
      })
    }
  }

  // 알고리즘 개별 페이지 (algorithmConfig 기반)
  for (const algo of algorithms) {
    if (algo.status === 'ready' && !seen.has(algo.href)) {
      seen.add(algo.href)
      entries.push({
        url: `https://toolhub.ai.kr${algo.href}/`,
        lastModified: today,
        changeFrequency: 'monthly',
        priority: 0.7,
      })
    }
  }

  // 특수 페이지 (menuConfig 외)
  entries.push(
    {
      url: 'https://toolhub.ai.kr/tips/',
      lastModified: today,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: 'https://toolhub.ai.kr/privacy/',
      lastModified: '2026-02-21',
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: 'https://toolhub.ai.kr/inquiry/',
      lastModified: today,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  )

  return entries
}
